<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminRoleController extends Controller
{
    /**
     * List all roles with permission and user counts
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Role::query()->withCount(['users', 'permissions'])->with('permissions:id,name,slug,module');

        // Non-super-admin can only see roles belonging to their tenant or general active roles
        if (!$user->isSuperAdmin() && $user->tenant_id) {
            $query->where(function ($q) use ($user) {
                $q->where('tenant_id', $user->tenant_id)
                  ->orWhereNull('tenant_id');
            })->where('slug', '!=', 'super_admin');
        }

        $roles = $query->orderBy('is_system', 'desc')->orderBy('name', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Roles fetched successfully.',
            'data' => $roles,
        ]);
    }

    /**
     * Get all available permissions grouped by module
     */
    public function permissions(): JsonResponse
    {
        $permissions = Permission::withCount('roles')->orderBy('module')->orderBy('name')->get();

        $grouped = $permissions->groupBy('module');

        return response()->json([
            'success' => true,
            'message' => 'Permissions fetched successfully.',
            'data' => [
                'list' => $permissions,
                'grouped' => $grouped,
                'modules' => Permission::select('module')->distinct()->pluck('module'),
            ],
        ]);
    }

    /**
     * Create a new permission dynamically
     */
    public function storePermission(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'module' => ['required', 'string', 'min:2', 'max:100'],
            'slug' => ['nullable', 'string', 'max:150', 'unique:permissions,slug'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $module = trim($validated['module']);
        $name = trim($validated['name']);

        if (!empty($validated['slug'])) {
            $slug = Str::slug($validated['slug'], '.');
        } else {
            $slug = Str::slug($module, '_') . '.' . Str::slug($name, '_');
        }

        $baseSlug = $slug;
        $counter = 1;
        while (Permission::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}_{$counter}";
            $counter++;
        }

        $permission = Permission::create([
            'name' => $name,
            'slug' => $slug,
            'module' => $module,
            'description' => $validated['description'] ?? null,
        ]);

        // Automatically sync to super_admin role
        $superAdmin = Role::where('slug', 'super_admin')->first();
        if ($superAdmin) {
            $superAdmin->permissions()->syncWithoutDetaching([$permission->id]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Permission created successfully.',
            'data' => $permission,
        ], 201);
    }

    /**
     * Update an existing permission
     */
    public function updatePermission(Request $request, Permission $permission): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'module' => ['required', 'string', 'min:2', 'max:100'],
            'slug' => ['required', 'string', 'max:150', Rule::unique('permissions', 'slug')->ignore($permission->id)],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $permission->update([
            'name' => trim($validated['name']),
            'module' => trim($validated['module']),
            'slug' => Str::slug($validated['slug'], '.'),
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Permission updated successfully.',
            'data' => $permission,
        ]);
    }

    /**
     * Delete a permission
     */
    public function destroyPermission(Permission $permission): JsonResponse
    {
        $permission->roles()->detach();
        $permission->delete();

        return response()->json([
            'success' => true,
            'message' => 'Permission deleted successfully.',
        ]);
    }

    /**
     * Show single role with its permission IDs
     */
    public function show(Role $role): JsonResponse
    {
        $role->load('permissions:id,name,slug,module');
        $role->loadCount('users');

        return response()->json([
            'success' => true,
            'message' => 'Role details fetched successfully.',
            'data' => [
                'id' => $role->id,
                'name' => $role->name,
                'slug' => $role->slug,
                'description' => $role->description,
                'is_system' => (bool)$role->is_system,
                'users_count' => $role->users_count,
                'permission_ids' => $role->permissions->pluck('id')->toArray(),
                'permissions' => $role->permissions,
            ],
        ]);
    }

    /**
     * Create a new role
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['required', 'array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ]);

        $baseSlug = Str::slug($validated['name']);
        $slug = $baseSlug;
        $counter = 1;
        while (Role::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        $role = Role::create([
            'tenant_id' => $user->isSuperAdmin() ? null : $user->tenant_id,
            'name' => trim($validated['name']),
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'is_system' => false,
        ]);

        if (!empty($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        $role->load('permissions:id,name,slug,module');
        $role->loadCount(['users', 'permissions']);

        return response()->json([
            'success' => true,
            'message' => 'Role created successfully.',
            'data' => $role,
        ], 201);
    }

    /**
     * Update an existing role
     */
    public function update(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['required', 'array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ]);

        if (isset($validated['name'])) {
            // Keep original slug for system roles, only update display name
            $role->name = trim($validated['name']);
        }

        if (isset($validated['description'])) {
            $role->description = $validated['description'];
        }

        $role->save();

        // If super_admin, don't allow stripping all permissions
        if ($role->slug === 'super_admin') {
            $allPerms = Permission::pluck('id')->toArray();
            $role->permissions()->sync($allPerms);
        } else {
            $role->permissions()->sync($validated['permissions'] ?? []);
        }

        $role->load('permissions:id,name,slug,module');
        $role->loadCount(['users', 'permissions']);

        return response()->json([
            'success' => true,
            'message' => 'Role updated successfully.',
            'data' => $role,
        ]);
    }

    /**
     * Delete a role
     */
    public function destroy(Role $role): JsonResponse
    {
        if ($role->is_system) {
            return response()->json([
                'success' => false,
                'message' => 'System roles cannot be deleted.',
            ], 422);
        }

        if ($role->users()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete role because one or more users are currently assigned to it. Reassign users first.',
            ], 422);
        }

        $role->permissions()->detach();
        $role->delete();

        return response()->json([
            'success' => true,
            'message' => 'Role deleted successfully.',
        ]);
    }
}
