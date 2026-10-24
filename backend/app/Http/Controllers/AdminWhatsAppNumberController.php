<?php

namespace App\Http\Controllers;

use App\Models\WhatsAppAccount;
use App\Models\WhatsAppNumber;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminWhatsAppNumberController extends Controller
{
    /**
     * Get authenticated user's ID.
     */
    private function userId(Request $request): int
    {
        $userId = $request->user()?->id;

        abort_if(
            !$userId,
            401,
            'Unauthenticated.'
        );

        return (int) $userId;
    }

    /**
     * Get WhatsApp accounts belonging to the current user.
     */
    public function accounts(Request $request)
    {
        $userId = $this->userId($request);

        return response()->json([
            'success' => true,
            'data' => WhatsAppAccount::query()
                ->where('user_id', $userId)
                ->select(
                    'id',
                    'user_id',
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
        $userId = $this->userId($request);

        $query = WhatsAppNumber::query()
            ->where('user_id', $userId)
            ->with([
                'whatsappAccount:id,user_id,name,provider,status',
            ]);

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

    /**
     * Create a WhatsApp number.
     */
    public function store(Request $request)
    {
        $userId = $this->userId($request);

        $validated = $this->validateNumber(
            $request,
            $userId
        );

        // Ownership comes from the authenticated user.
        $validated['user_id'] = $userId;

        $number = WhatsAppNumber::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp number created successfully.',
            'data' => $number->load(
                'whatsappAccount:id,user_id,name,provider,status'
            ),
        ], 201);
    }

    /**
     * Show a WhatsApp number.
     */
    public function show(Request $request, int $id)
    {
        $number = $this->findNumber($request, $id);

        return response()->json([
            'success' => true,
            'data' => $number->load(
                'whatsappAccount:id,user_id,name,provider,status'
            ),
        ]);
    }

    /**
     * Update a WhatsApp number.
     */
    public function update(Request $request, int $id)
    {
        $userId = $this->userId($request);

        $number = $this->findNumber($request, $id);

        $validated = $this->validateNumber(
            $request,
            $userId,
            $number->id
        );

        // Never accept ownership from the request.
        unset($validated['user_id']);

        $number->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp number updated successfully.',
            'data' => $number->fresh()->load(
                'whatsappAccount:id,user_id,name,provider,status'
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
     * Find a number belonging to the authenticated user.
     */
    private function findNumber(
        Request $request,
        int $id
    ): WhatsAppNumber {
        $userId = $this->userId($request);

        return WhatsAppNumber::query()
            ->where('user_id', $userId)
            ->findOrFail($id);
    }

    /**
     * Validation rules.
     */
    private function validateNumber(
        Request $request,
        int $userId,
        ?int $ignoreId = null
    ): array {
        return $request->validate([
            'whatsapp_account_id' => [
                'required',
                'integer',
                Rule::exists('whatsapp_accounts', 'id')
                    ->where('user_id', $userId),
            ],

            'phone_number' => [
                'required',
                'string',
                'max:30',
                Rule::unique('whatsapp_numbers', 'phone_number')
                    ->where('user_id', $userId)
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
