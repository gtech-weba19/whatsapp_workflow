<?php

namespace App\Http\Controllers;

use App\Models\WhatsAppAccount;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminWhatsAppAccountController extends Controller
{
    /**
     * List WhatsApp accounts with filters and statistics.
     */
    public function index(Request $request): JsonResponse
    {
        $query = WhatsAppAccount::with('tenant:id,name')->latest();

        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->integer('tenant_id'));
        }

        if ($request->filled('status')) {
            $query->where(
                'status',
                $request->string('status')->toString()
            );
        }

        if ($request->filled('search')) {
            $term = trim($request->string('search')->toString());

            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('business_name', 'like', "%{$term}%")
                    ->orWhere('phone_number', 'like', "%{$term}%")
                    ->orWhere('phone_number_id', 'like', "%{$term}%")
                    ->orWhere('waba_id', 'like', "%{$term}%")
                    ->orWhereHas('tenant', function ($tenantQuery) use ($term) {
                        $tenantQuery->where('name', 'like', "%{$term}%");
                    });
            });
        }

        return response()->json([
            'success' => true,

            'data' => $query->get()->map(
                fn (WhatsAppAccount $account) => $this->format($account)
            )->values(),

            'stats' => [
                'total' => WhatsAppAccount::count(),

                'connected' => WhatsAppAccount::where(
                    'status',
                    'connected'
                )->count(),

                'pending' => WhatsAppAccount::where(
                    'status',
                    'pending'
                )->count(),

                'disconnected' => WhatsAppAccount::whereIn(
                    'status',
                    ['disconnected', 'inactive']
                )->count(),
            ],
        ]);
    }

    /**
     * Show one WhatsApp account.
     */
    public function show(WhatsAppAccount $whatsapp_account): JsonResponse
    {
        $account = $whatsapp_account->load('tenant:id,name');

        return response()->json([
            'success' => true,
            'data' => $this->format($account),
        ]);
    }

    /**
     * Create a WhatsApp account.
     */
   public function store(Request $request): JsonResponse
        {
            $data = $request->validate($this->rules());

            $data['status'] = $data['status'] ?? 'pending';

            try {
                $account = WhatsAppAccount::create($data);

                // Generate account-specific webhook URL.
                $account->webhook_url = url(
                    '/api/webhooks/whatsapp/' . $account->id
                );

                $account->save();

                $account->load('tenant:id,name');
            } catch (QueryException $e) {
                if ($this->uniqueViolation($e)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This Phone Number ID is already assigned to this client.',
                    ], 422);
                }

                throw $e;
            }

            return response()->json([
                'success' => true,
                'message' => 'WhatsApp account created successfully.',
                'data' => $this->format($account),
            ], 201);
        }


        public function update(
            Request $request,
            WhatsAppAccount $whatsapp_account
        ): JsonResponse {
            $data = $request->validate(
                $this->rules($whatsapp_account->id, true)
            );

            foreach ([
                'access_token',
                'app_secret',
                'webhook_verify_token',
            ] as $secret) {
                if (
                    array_key_exists($secret, $data)
                    && blank($data[$secret])
                ) {
                    unset($data[$secret]);
                }
            }

            try {
                $whatsapp_account->update($data);

                // Generate URL for existing accounts if missing.
                if (blank($whatsapp_account->webhook_url)) {
                    $whatsapp_account->webhook_url = url(
                        '/api/webhooks/whatsapp/' . $whatsapp_account->id
                    );

                    $whatsapp_account->save();
                }
            } catch (QueryException $e) {
                if ($this->uniqueViolation($e)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This Phone Number ID is already assigned to this client.',
                    ], 422);
                }

                throw $e;
            }

            $account = $whatsapp_account
                ->fresh()
                ->load('tenant:id,name');

            return response()->json([
                'success' => true,
                'message' => 'WhatsApp account updated successfully.',
                'data' => $this->format($account),
            ]);
        }

    /**
     * Update account connection status.
     */
    public function status(
        Request $request,
        WhatsAppAccount $whatsapp_account
    ): JsonResponse {
        $data = $request->validate([
            'status' => [
                'required',
                Rule::in([
                    'connected',
                    'pending',
                    'disconnected',
                    'inactive',
                ]),
            ],
        ]);

        $updates = [
            'status' => $data['status'],
        ];

        if ($data['status'] === 'connected') {
            $updates['last_synced_at'] = now();
        }

        $whatsapp_account->update($updates);

        $account = $whatsapp_account
            ->fresh()
            ->load('tenant:id,name');

        return response()->json([
            'success' => true,
            'message' => 'Account status updated successfully.',
            'data' => $this->format($account),
        ]);
    }

    /**
     * Delete a WhatsApp account.
     */
    public function destroy(
        WhatsAppAccount $whatsapp_account
    ): JsonResponse {
        $whatsapp_account->delete();

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp account deleted successfully.',
        ]);
    }

    /**
     * Validation rules for create/update.
     */
    private function rules(
        ?int $id = null,
        bool $updating = false
    ): array {
        return [
            'tenant_id' => [
                $updating ? 'sometimes' : 'required',
                'integer',
                Rule::exists('tenants', 'id'),
            ],

            'name' => [
                'required',
                'string',
                'max:150',
            ],

            'provider' => [
                'required',
                Rule::in([
                    'meta',
                    'bsp',
                    'wati',
                    'twilio',
                    'gupshup',
                    'custom',
                ]),
            ],

            'business_name' => [
                'nullable',
                'string',
                'max:255',
            ],

            'phone_number' => [
                'nullable',
                'string',
                'max:30',
            ],

            'phone_number_id' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('whatsapp_accounts', 'phone_number_id')
                    ->where(function ($query) use ($updating, $id) {
                        $tenantId = request()->input('tenant_id');

                        if ($tenantId === null && $updating && $id) {
                            $tenantId = WhatsAppAccount::whereKey($id)
                                ->value('tenant_id');
                        }

                        return $query->where('tenant_id', $tenantId);
                    })
                    ->ignore($id),
            ],

            'waba_id' => [
                'nullable',
                'string',
                'max:100',
            ],

            'access_token' => [
                $updating ? 'sometimes' : 'nullable',
                'nullable',
                'string',
                'max:10000',
            ],

            'app_secret' => [
                'nullable',
                'string',
                'max:10000',
            ],

            'webhook_verify_token' => [
                'nullable',
                'string',
                'max:10000',
            ],

            'api_base_url' => [
                'nullable',
                'url',
                'max:500',
            ],

            // WhatsApp sender configuration
            'sender_number' => [
                'nullable',
                'string',
                'max:30',
            ],

            'sender_name' => [
                'nullable',
                'string',
                'max:150',
            ],

            'webhook_dn_id' => [
                'nullable',
                'string',
                'max:100',
            ],

            'status' => [
                'sometimes',
                Rule::in([
                    'connected',
                    'pending',
                    'disconnected',
                    'inactive',
                ]),
            ],

            'notes' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ];
    }

    /**
     * Format account response.
     *
     * Never return actual API credentials to the frontend.
     */
    private function format(WhatsAppAccount $account): array
    {
        return [
            'id' => $account->id,
            'tenant_id' => $account->tenant_id,
            'client_name' => $account->tenant?->name,

            'name' => $account->name,
            'provider' => $account->provider,
            'business_name' => $account->business_name,

            'phone_number' => $account->phone_number,
            'phone_number_id' => $account->phone_number_id,
            'waba_id' => $account->waba_id,

            'has_access_token' => filled($account->access_token),
            'has_app_secret' => filled($account->app_secret),
            'has_webhook_verify_token' => filled(
                $account->webhook_verify_token
            ),

            'api_base_url' => $account->api_base_url,

            'sender_number' => $account->sender_number,
            'sender_name' => $account->sender_name,
            'webhook_dn_id' => $account->webhook_dn_id,

            'status' => $account->status,

            'last_synced_at' => $account->last_synced_at?->toISOString(),
            'notes' => $account->notes,

            'created_at' => $account->created_at?->toISOString(),
            'updated_at' => $account->updated_at?->toISOString(),
        ];
    }

    /**
     * Detect unique constraint violations.
     */
    private function uniqueViolation(QueryException $e): bool
    {
        return in_array(
            (string) ($e->errorInfo[1] ?? ''),
            ['1062', '19', '23505'],
            true
        );
    }
}
