<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminClientUserController extends Controller
{
    /**
     * List client users.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'tenant_id' => ['sometimes', 'nullable', 'integer', 'exists:tenants,id'],
            'role' => ['sometimes', 'nullable', Rule::in(['admin', 'agent'])],
            'status' => [
                'sometimes',
                'nullable',
                Rule::in(['active', 'inactive', 'suspended']),
            ],
        ]);

        $query = User::query()
            ->whereIn('role', ['admin', 'agent'])
            ->with('tenant:id,name');

        if (!empty($validated['search'])) {
            $search = trim($validated['search']);

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['tenant_id'])) {
            $query->where('tenant_id', $validated['tenant_id']);
        }

        if (!empty($validated['role'])) {
            $query->where('role', $validated['role']);
        }

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $users = $query->latest()->get();

        return response()->json([
            'success' => true,
            'message' => 'Client users fetched successfully.',
            'data' => $users->map(fn (User $user) => $this->formatUser($user)),
        ]);
    }

    /**
     * Show a client user.
     */
    public function show(User $client_user): JsonResponse
    {
        $this->ensureClientUser($client_user);

        $client_user->load('tenant:id,name');

        return response()->json([
            'success' => true,
            'message' => 'Client user fetched successfully.',
            'data' => $this->formatUser($client_user),
        ]);
    }

    /**
     * Create a client user.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => ['required', 'integer', 'exists:tenants,id'],
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'mobile' => [
                'nullable',
                'regex:/^[6-9][0-9]{9}$/',
                'unique:users,mobile',
            ],
            'role' => ['required', Rule::in(['admin', 'agent'])],
            'department' => ['nullable', 'string', 'max:100'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'status' => [
                'sometimes',
                Rule::in(['active', 'inactive', 'suspended']),
            ],
        ]);

        $tenant = Tenant::findOrFail($validated['tenant_id']);

        if ($tenant->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Users can only be created for an active client.',
            ], 422);
        }

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => trim($validated['name']),
            'email' => strtolower(trim($validated['email'])),
            'mobile' => $validated['mobile'] ?? null,
            'role' => $validated['role'],
            'department' => $validated['department'] ?? null,
            'password' => Hash::make($validated['password']),
            'status' => $validated['status'] ?? 'active',
        ]);

        $user->load('tenant:id,name');

        return response()->json([
            'success' => true,
            'message' => 'Client user created successfully.',
            'data' => $this->formatUser($user),
        ], 201);
    }

    /**
     * Update a client user.
     */
    public function update(Request $request, User $client_user): JsonResponse
    {
        $this->ensureClientUser($client_user);

        $validated = $request->validate([
            'tenant_id' => ['sometimes', 'required', 'integer', 'exists:tenants,id'],
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'email:rfc',
                'max:255',
                Rule::unique('users', 'email')->ignore($client_user->id),
            ],
            'mobile' => [
                'sometimes',
                'nullable',
                'regex:/^[6-9][0-9]{9}$/',
                Rule::unique('users', 'mobile')->ignore($client_user->id),
            ],
            'role' => ['sometimes', 'required', Rule::in(['admin', 'agent'])],
            'department' => ['sometimes', 'nullable', 'string', 'max:100'],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'confirmed'],
            'status' => [
                'sometimes',
                'required',
                Rule::in(['active', 'inactive', 'suspended']),
            ],
        ]);

        if (isset($validated['tenant_id'])) {
            $tenant = Tenant::findOrFail($validated['tenant_id']);

            if ($tenant->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'User cannot be assigned to an inactive client.',
                ], 422);
            }
        }

        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
        }

        if (isset($validated['email'])) {
            $validated['email'] = strtolower(trim($validated['email']));
        }

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $client_user->update($validated);
        $client_user->load('tenant:id,name');

        return response()->json([
            'success' => true,
            'message' => 'Client user updated successfully.',
            'data' => $this->formatUser($client_user),
        ]);
    }

    /**
     * Change user status.
     */
    public function status(Request $request, User $client_user): JsonResponse
    {
        $this->ensureClientUser($client_user);

        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in(['active', 'inactive', 'suspended']),
            ],
        ]);

        $client_user->update([
            'status' => $validated['status'],
        ]);

        $client_user->load('tenant:id,name');

        return response()->json([
            'success' => true,
            'message' => 'Client user status updated successfully.',
            'data' => $this->formatUser($client_user),
        ]);
    }

    /**
     * Delete a client user.
     */
    public function destroy(User $client_user): JsonResponse
    {
        $this->ensureClientUser($client_user);

        if (method_exists($client_user, 'tokens')) {
            $client_user->tokens()->delete();
        }

        $client_user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Client user deleted successfully.',
        ]);
    }

    /**
     * Only admin/agent users belong to this module.
     */
    private function ensureClientUser(User $user): void
    {
        abort_unless(
            in_array($user->role, ['admin', 'agent'], true),
            404,
            'Client user not found.'
        );
    }

    /**
     * Safe API response; never return password or token.
     */
    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'tenant_id' => $user->tenant_id,
            'client_name' => $user->tenant?->name,
            'name' => $user->name,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'role' => $user->role,
            'department' => $user->department,
            'status' => $user->status,
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ];
    }
}
