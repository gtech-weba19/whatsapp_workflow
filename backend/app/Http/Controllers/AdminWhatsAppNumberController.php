<?php

namespace App\Http\Controllers;

use App\Models\WhatsAppAccount;
use App\Models\WhatsAppNumber;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminWhatsAppNumberController extends Controller
{
    /**
     * Get the authenticated user's tenant.
     */
    private function tenantId(Request $request): int
    {
        $tenantId = $request->user()?->tenant_id;

        abort_if(
            !$tenantId,
            403,
            'Tenant access is not configured.'
        );

        return (int) $tenantId;
    }

    /**
     * Get WhatsApp accounts for the current tenant.
     */
    public function accounts(Request $request)
    {
        $tenantId = $this->tenantId($request);

        return response()->json([
            'success' => true,
            'data' => WhatsAppAccount::query()
                ->where('tenant_id', $tenantId)
                ->select(
                    'id',
                    'tenant_id',
                    'name',
                    'provider',
                    'status'
                )
                ->orderBy('name')
                ->get(),
        ]);
    }

    /**
     * List WhatsApp numbers.
     */
    public function index(Request $request)
    {
        $tenantId = $this->tenantId($request);

        $query = WhatsAppNumber::query()
            ->where('tenant_id', $tenantId)
            ->with([
                'whatsappAccount:id,name,provider,status',
            ]);

        // Optional account filter.
        if ($request->filled('whatsapp_account_id')) {
            $query->where(
                'whatsapp_account_id',
                $request->integer('whatsapp_account_id')
            );
        }

        // Search.
        if ($request->filled('search')) {
            $search = trim(
                (string) $request->input('search')
            );

            $query->where(function ($q) use ($search) {
                $q->where(
                    'phone_number',
                    'like',
                    "%{$search}%"
                )
                    ->orWhere(
                        'display_name',
                        'like',
                        "%{$search}%"
                    )
                    ->orWhere(
                        'phone_number_id',
                        'like',
                        "%{$search}%"
                    )
                    ->orWhere(
                        'sender_id',
                        'like',
                        "%{$search}%"
                    );
            });
        }

        // Status filter.
        if ($request->filled('status')) {
            $query->where(
                'status',
                $request->input('status')
            );
        }

        return response()->json([
            'success' => true,
            'data' => $query->latest()->paginate(
                min(max($request->integer('per_page', 15), 1), 100)
            ),
        ]);
    }


    public function store(Request $request)
    {
        $tenantId = $this->tenantId($request);

        $validated = $this->validateNumber(
            $request,
            $tenantId
        );


        $validated['tenant_id'] = $tenantId;

        $number = WhatsAppNumber::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp number created successfully.',
            'data' => $number->load(
                'whatsappAccount:id,name,provider,status'
            ),
        ], 201);
    }


    public function show(Request $request, int $id)
    {
        $number = $this->findNumber($request, $id);

        return response()->json([
            'success' => true,
            'data' => $number->load(
                'whatsappAccount:id,name,provider,status'
            ),
        ]);
    }

    /**
     * Update a WhatsApp number.
     */
    public function update(Request $request, int $id)
    {
        $tenantId = $this->tenantId($request);

        $number = $this->findNumber($request, $id);

        $validated = $this->validateNumber(
            $request,
            $tenantId,
            $number->id
        );

        // Do not allow changing ownership through the request.
        unset($validated['tenant_id']);

        $number->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp number updated successfully.',
            'data' => $number->fresh()->load(
                'whatsappAccount:id,name,provider,status'
            ),
        ]);
    }

    /**
     * Delete a WhatsApp number.
     */
    public function destroy(Request $request, int $id)
    {
        $number = $this->findNumber($request, $id);

        $number->delete();

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp number deleted successfully.',
        ]);
    }

    /**
     * Find a number restricted to the current tenant.
     */
    private function findNumber(
        Request $request,
        int $id
    ): WhatsAppNumber {
        $tenantId = $this->tenantId($request);

        return WhatsAppNumber::query()
            ->where('tenant_id', $tenantId)
            ->findOrFail($id);
    }


    private function validateNumber(
        Request $request,
        int $tenantId,
        ?int $ignoreId = null
    ): array {
        return $request->validate([
            'whatsapp_account_id' => [
                'required',
                'integer',
                Rule::exists('whatsapp_accounts', 'id')
                    ->where('tenant_id', $tenantId),
            ],

            'phone_number' => [
                'required',
                'string',
                'max:30',
                Rule::unique('whatsapp_numbers', 'phone_number')
                    ->where('tenant_id', $tenantId)
                    ->ignore($ignoreId),
            ],

            'display_name' => [
                'nullable',
                'string',
                'max:150',
            ],

            'phone_number_id' => [
                'nullable',
                'string',
                'max:190',
            ],

            'sender_id' => [
                'nullable',
                'string',
                'max:190',
            ],


            'status' => [
                'required',
                Rule::in([
                    'pending',
                    'active',
                    'inactive',
                    'error',
                ]),
            ],


        ]);
    }
}
