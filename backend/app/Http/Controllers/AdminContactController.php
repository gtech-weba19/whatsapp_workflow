<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminContactController extends Controller
{
    /**
     * List contacts.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'status' => [
                'nullable',
                Rule::in(['active', 'blocked', 'archived']),
            ],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
        ]);

        $query = $this->accessibleContacts($user);

        // Super admin can optionally filter by tenant.
        if (
            $this->isSuperAdmin($user)
            && !empty($validated['tenant_id'])
        ) {
            $query->where('tenant_id', $validated['tenant_id']);
        }

        if (!empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($q) use ($search) {
                $q->where('phone', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('external_contact_id', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $contacts = $query
            ->orderByDesc('created_at')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'message' => 'Contacts retrieved successfully.',
            'data' => $contacts,
        ]);
    }

    /**
     * Create contact.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $isSuperAdmin = $this->isSuperAdmin($user);

        $validated = $request->validate([
            'tenant_id' => [
                Rule::requiredIf($isSuperAdmin),
                'nullable',
                'integer',
                'exists:tenants,id',
            ],

            'whatsapp_number_id' => [
                'nullable',
                'integer',
            ],

            'external_contact_id' => [
                'nullable',
                'string',
                'max:190',
            ],

            'phone' => [
                'required',
                'string',
                'max:30',
            ],

            'name' => ['nullable', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:190'],
            'profile_data' => ['nullable', 'array'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:100'],

            'status' => [
                'nullable',
                Rule::in(['active', 'blocked', 'archived']),
            ],

            'last_seen_at' => ['nullable', 'date'],
        ]);

        // Super admin must explicitly choose a tenant.
        // Other users can create contacts only in their own tenant.
        $tenantId = $isSuperAdmin
            ? (int) $validated['tenant_id']
            : $user->tenant_id;

        abort_unless(
            $tenantId !== null,
            403,
            'Tenant is not configured for this user.'
        );

        // Confirm that WhatsApp number belongs to the chosen tenant.
        if (!empty($validated['whatsapp_number_id'])) {
            $request->validate([
                'whatsapp_number_id' => [
                    'nullable',
                    'integer',
                    Rule::exists('whatsapp_numbers', 'id')
                        ->where('tenant_id', $tenantId),
                ],
            ]);
        }

        // Enforce unique phone number inside this tenant.
        $request->validate([
            'phone' => [
                'required',
                'string',
                'max:30',
                Rule::unique('contacts', 'phone')
                    ->where('tenant_id', $tenantId),
            ],
        ]);

        $validated['tenant_id'] = $tenantId;
        $validated['status'] = $validated['status'] ?? 'active';

        // Never pass tenant_id from an ordinary user's request.
        $contact = Contact::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Contact created successfully.',
            'data' => $contact,
        ], 201);
    }

    /**
     * Show one contact.
     */
    public function show(Request $request, Contact $contact)
    {
        $this->authorizeContact($request, $contact);

        return response()->json([
            'success' => true,
            'message' => 'Contact retrieved successfully.',
            'data' => $contact,
        ]);
    }

    /**
     * Update contact.
     */
    public function update(Request $request, Contact $contact)
    {
        $this->authorizeContact($request, $contact);

        $user = $request->user();
        $tenantId = (int) $contact->tenant_id;

        // Super admin may manage any contact, but cannot move it to another
        // tenant through this endpoint.
        $validated = $request->validate([
            'tenant_id' => ['prohibited'],

            'whatsapp_number_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('whatsapp_numbers', 'id')
                    ->where('tenant_id', $tenantId),
            ],

            'external_contact_id' => [
                'sometimes',
                'nullable',
                'string',
                'max:190',
            ],

            'phone' => [
                'sometimes',
                'required',
                'string',
                'max:30',
                Rule::unique('contacts', 'phone')
                    ->where('tenant_id', $tenantId)
                    ->ignore($contact->id),
            ],

            'name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'email' => ['sometimes', 'nullable', 'email', 'max:190'],
            'profile_data' => ['sometimes', 'nullable', 'array'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['string', 'max:100'],

            'status' => [
                'sometimes',
                Rule::in(['active', 'blocked', 'archived']),
            ],

            'last_seen_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $contact->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Contact updated successfully.',
            'data' => $contact->fresh(),
        ]);
    }

    /**
     * Delete contact.
     */
    public function destroy(Request $request, Contact $contact)
    {
        $this->authorizeContact($request, $contact);

        $contact->delete();

        return response()->json([
            'success' => true,
            'message' => 'Contact deleted successfully.',
        ]);
    }

    /**
     * Contacts accessible to this user.
     */
    private function accessibleContacts($user)
    {
        if ($this->isSuperAdmin($user)) {
            return Contact::query();
        }

        abort_unless(
            $user->tenant_id !== null,
            403,
            'Tenant is not configured for this user.'
        );

        return Contact::query()
            ->where('tenant_id', $user->tenant_id);
    }

    /**
     * Check whether user is super admin.
     */
    private function isSuperAdmin($user): bool
    {
        return strtolower((string) $user->role) === 'super_admin';
    }

    /**
     * Authorize access to an individual contact.
     */
    private function authorizeContact(
        Request $request,
        Contact $contact
    ): void {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        if ($this->isSuperAdmin($user)) {
            return;
        }

        abort_unless(
            $user->tenant_id !== null
            && (int) $contact->tenant_id === (int) $user->tenant_id,
            404,
            'Contact not found.'
        );
    }
}
