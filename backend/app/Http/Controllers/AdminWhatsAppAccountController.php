<?php

namespace App\Http\Controllers;

use App\Models\WhatsAppAccount;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Mail\WhatsAppAccountApprovedMail;
use App\Notifications\WhatsAppAccountApprovedNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;


class AdminWhatsAppAccountController extends Controller
{
    /**
     * List WhatsApp accounts with filters and statistics.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->isSuperAdmin();

        $query = WhatsAppAccount::with('user:id,name,email')->latest();

        if ($user && !$isSuperAdmin) {
            $query->where('user_id', $user->id);
        } elseif ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('search')) {
            $term = trim($request->string('search')->toString());

            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('business_name', 'like', "%{$term}%")
                    ->orWhere('waba_id', 'like', "%{$term}%")
                    ->orWhereHas('user', function ($userQuery) use ($term) {
                        $userQuery->where('name', 'like', "%{$term}%")
                            ->orWhere('email', 'like', "%{$term}%");
                    })
                    ->orWhereIn(
                        'user_id',
                        DB::table('business_profiles')
                            ->select('user_id')
                            ->where('business_name', 'like', "%{$term}%")
                    );
            });
        }

        $statsQuery = WhatsAppAccount::query();

        if ($user && !$isSuperAdmin) {
            $statsQuery->where('user_id', $user->id);
        } elseif ($request->filled('user_id')) {
            $statsQuery->where('user_id', $request->integer('user_id'));
        }

        $accounts = $query->get();

        $userIds = $accounts->pluck('user_id')
            ->filter()
            ->unique()
            ->values();

        $businessNames = $userIds->isEmpty()
            ? collect()
            : DB::table('business_profiles')
                ->whereIn('user_id', $userIds)
                ->pluck('business_name', 'user_id');

        return response()->json([
            'success' => true,
            'data' => $accounts->map(function (WhatsAppAccount $account) use ($businessNames) {
                return $this->format(
                    $account,
                    $businessNames->get($account->user_id)
                );
            })->values(),

            'stats' => [
                'total' => (clone $statsQuery)->count(),
                'connected' => (clone $statsQuery)
                    ->where('status', 'connected')->count(),
                'pending' => (clone $statsQuery)
                    ->where('status', 'pending')->count(),
                'disconnected' => (clone $statsQuery)
                    ->whereIn('status', ['disconnected', 'inactive'])->count(),
            ],
        ]);
    }

    /**
     * Authorize access to an account.
     */
    private function authorizeAccount(
        Request $request,
        WhatsAppAccount $account
    ): void {
        $user = $request->user();

        abort_if(!$user, 401, 'Unauthenticated.');

        if (!$user->isSuperAdmin()) {
            abort_if(
                (int) $account->user_id !== (int) $user->id,
                403,
                'Unauthorized. You cannot access this WhatsApp account.'
            );
        }
    }

    /**
     * Show one WhatsApp account.
     */
    public function show(
        Request $request,
        WhatsAppAccount $whatsapp_account
    ): JsonResponse {
        $this->authorizeAccount($request, $whatsapp_account);

        $account = $whatsapp_account->load('user:id,name,email');

        $businessName = DB::table('business_profiles')
            ->where('user_id', $account->user_id)
            ->value('business_name');

        return response()->json([
            'success' => true,
            'data' => $this->format($account, $businessName),
        ]);
    }


/**
 * Create a WhatsApp account.
 */
public function store(Request $request): JsonResponse
{
    $user = $request->user();

    if (!$user) {
        return response()->json([
            'success' => false,
            'message' => 'Unauthenticated.',
        ], 401);
    }

    if (!$user->isSuperAdmin()) {
        $alreadyExists = WhatsAppAccount::where('user_id', $user->id)->exists();

        if ($alreadyExists) {
            return response()->json([
                'success' => false,
                'code' => 'WHATSAPP_ACCOUNT_LIMIT_REACHED',
                'message' => 'You already have a WhatsApp account. Please update your existing account.',
            ], 422);
        }
    }

    // Business profile se naam lein.
    $profileBusinessName = DB::table('business_profiles')
        ->where('user_id', $user->id)
        ->value('business_name');

    // Name absent ho to profile name ya default use karein.
    $request->merge([
        'name' => $request->input('name')
            ?: ($profileBusinessName ?: 'WhatsApp Business'),
    ]);

    $data = $request->validate($this->rules());

    if (!$user->isSuperAdmin()) {
        $data['user_id'] = $user->id;
    }

    $data['business_name'] = $profileBusinessName;

    // Har naye account ka status hamesha pending hoga.
    // Frontend se bheje gaye status ko trust nahi karna.
    $data['status'] = 'pending';

    if (filled($data['waba_id'] ?? null)) {
        $data['waba_id'] = $this->normalizePhoneNumber($data['waba_id']);
    }

    try {
        $account = WhatsAppAccount::create($data);
        $account->load('user:id,name,email');
    } catch (QueryException $e) {
        if ($this->uniqueViolation($e)) {
            return response()->json([
                'success' => false,
                'message' => 'This WhatsApp mobile number is already assigned to another account.',
            ], 422);
        }

        throw $e;
    }

    return response()->json([
        'success' => true,
        'message' => 'WhatsApp account submitted for admin approval.',
        'data' => $this->format($account, $data['business_name']),
    ], 201);
}


    /**
     * Update a WhatsApp account.
     */
    public function update(
        Request $request,
        WhatsAppAccount $whatsapp_account
    ): JsonResponse {
        $this->authorizeAccount($request, $whatsapp_account);

        $data = $request->validate(
            $this->rules($whatsapp_account->id, true)
        );

        $user = $request->user();
        $targetUserId = $whatsapp_account->user_id;

        if ($user->isSuperAdmin() && isset($data['user_id'])) {
            $targetUserId = $data['user_id'];
        } else {
            unset($data['user_id']);
        }

        $data['business_name'] = DB::table('business_profiles')
            ->where('user_id', $targetUserId)
            ->value('business_name');

        if (array_key_exists('waba_id', $data) && filled($data['waba_id'])) {
            $data['waba_id'] = $this->normalizePhoneNumber($data['waba_id']);
        }

        // Preserve existing credentials if blank values are submitted.
        foreach ([
            'access_token',
            'app_secret',
            'webhook_verify_token',
        ] as $secret) {
            if (array_key_exists($secret, $data) && blank($data[$secret])) {
                unset($data[$secret]);
            }
        }

        try {
            $whatsapp_account->update($data);

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
                    'message' => 'This WhatsApp mobile number is already assigned to another account.',
                ], 422);
            }

            throw $e;
        }

        $account = $whatsapp_account->fresh()
            ->load('user:id,name,email');

        $businessName = DB::table('business_profiles')
            ->where('user_id', $account->user_id)
            ->value('business_name');

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp account updated successfully.',
            'data' => $this->format($account, $businessName),
        ]);
    }


public function status(
    Request $request,
    WhatsAppAccount $whatsapp_account
): JsonResponse {
    $this->authorizeAccount($request, $whatsapp_account);

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

    $user = $request->user();
    $newStatus = $data['status'];

    // Only Super Admin can approve an account.
    if ($newStatus === 'connected' && !$user->isSuperAdmin()) {
        return response()->json([
            'success' => false,
            'message' => 'Only Super Admin can approve a WhatsApp account.',
        ], 403);
    }

    // Prevent sending duplicate approval emails/notifications.
    $isBeingApproved =
        $newStatus === 'connected'
        && $whatsapp_account->status !== 'connected';

    $updates = [
        'status' => $newStatus,
    ];

    if ($newStatus === 'connected') {
        $updates['last_synced_at'] = now();
    }

    $whatsapp_account->update($updates);

    $account = $whatsapp_account->fresh()
        ->load('user:id,name,email');

    $businessName = DB::table('business_profiles')
        ->where('user_id', $account->user_id)
        ->value('business_name');

    $businessName = filled($businessName)
        ? $businessName
        : ($account->business_name ?: $account->name ?: 'WhatsApp Account');

    $notificationSent = false;
    $emailSent = false;

    // Notify the owner only when the account is newly approved.
    if ($isBeingApproved && $account->user) {
        $owner = $account->user;

        // Dashboard notification.
        try {
            $owner->notify(
                new WhatsAppAccountApprovedNotification(
                    $account,
                    $businessName
                )
            );

            $notificationSent = true;
        } catch (\Throwable $e) {
            Log::error('WhatsApp approval notification failed', [
                'account_id' => $account->id,
                'user_id' => $owner->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Approval email.
        if (filled($owner->email)) {
            try {
                Mail::to($owner->email)->send(
                    new WhatsAppAccountApprovedMail(
                        $owner,
                        $businessName
                    )
                );

                $emailSent = true;
            } catch (\Throwable $e) {
                Log::error('WhatsApp approval email failed', [
                    'account_id' => $account->id,
                    'user_id' => $owner->id,
                    'email' => $owner->email,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    return response()->json([
        'success' => true,
        'message' => $isBeingApproved
            ? 'WhatsApp account approved. Notification and email processing completed.'
            : 'Account status updated successfully.',
        'notification_sent' => $notificationSent,
        'email_sent' => $emailSent,
        'data' => $this->format($account, $businessName),
    ]);
}

    /**
     * Delete a WhatsApp account.
     */
    public function destroy(
        Request $request,
        WhatsAppAccount $whatsapp_account
    ): JsonResponse {
        $this->authorizeAccount($request, $whatsapp_account);

        $whatsapp_account->delete();

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp account deleted successfully.',
        ]);
    }

    /**
     * Validation rules.
     */
    private function rules(
        ?int $id = null,
        bool $updating = false
    ): array {
        $user = request()->user();
        $isSuperAdmin = $user && $user->isSuperAdmin();

        $rules = [
            'name' => ['required', 'string', 'max:150'],

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

            'business_name' => ['nullable', 'string', 'max:255'],

            // waba_id is being used by this application to store
            // the normalized WhatsApp mobile number.
            'waba_id' => [
                'nullable',
                'string',
                'max:30',
                Rule::unique('whatsapp_accounts', 'waba_id')
                    ->ignore($id),
            ],

            'access_token' => [
                $updating ? 'sometimes' : 'nullable',
                'nullable',
                'string',
                'max:10000',
            ],

            'api_base_url' => ['nullable', 'url', 'max:500'],
            'sender_name' => ['nullable', 'string', 'max:150'],
            'webhook_dn_id' => ['nullable', 'string', 'max:100'],

            'status' => [
                'sometimes',
                Rule::in([
                    'connected',
                    'pending',
                    'disconnected',
                    'inactive',
                ]),
            ],
        ];

        if ($isSuperAdmin) {
            $rules['user_id'] = [
                $updating ? 'sometimes' : 'required',
                'integer',
                Rule::exists('users', 'id'),
            ];
        }

        return $rules;
    }

    /**
     * Normalize phone number to digits only.
     *
     * Example: +91 98765 43210 => 919876543210
     */
    private function normalizePhoneNumber(string $number): string
    {
        return preg_replace('/\D+/', '', $number) ?? '';
    }

    /**
     * Format response without exposing credentials.
     */
    private function format(
        WhatsAppAccount $account,
        ?string $profileBusinessName = null
    ): array {
        return [
            'id' => $account->id,

            'user_id' => $account->user_id,
            'client_name' => $account->user?->name,
            'client_email' => $account->user?->email,

            'name' => $account->name,
            'provider' => $account->provider,

            'business_name' => filled($profileBusinessName)
                ? $profileBusinessName
                : $account->business_name,

            // Contains the normalized phone number in this application.
            'waba_id' => $account->waba_id,

            'has_access_token' => filled($account->access_token),
            'api_base_url' => $account->api_base_url,
            'sender_name' => $account->sender_name,
            'webhook_dn_id' => $account->webhook_dn_id,

            'status' => $account->status,
            'last_synced_at' => $account->last_synced_at?->toISOString(),

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
