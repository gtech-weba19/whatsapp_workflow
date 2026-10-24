<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Definition of all permissions across modules
        $permissionsByModule = [
            'Dashboard' => [
                ['name' => 'View Dashboard', 'slug' => 'dashboard.view', 'description' => 'Can view dashboard analytics and stats'],
            ],
            'Clients' => [
                ['name' => 'View Clients', 'slug' => 'clients.view', 'description' => 'Can view client list and details'],
                ['name' => 'Create Clients', 'slug' => 'clients.create', 'description' => 'Can create new clients'],
                ['name' => 'Edit Clients', 'slug' => 'clients.edit', 'description' => 'Can update client details'],
                ['name' => 'Delete Clients', 'slug' => 'clients.delete', 'description' => 'Can delete clients'],
            ],
            'Client Users' => [
                ['name' => 'View Client Users', 'slug' => 'client_users.view', 'description' => 'Can view client users'],
                ['name' => 'Create Client Users', 'slug' => 'client_users.create', 'description' => 'Can create new client users'],
                ['name' => 'Edit Client Users', 'slug' => 'client_users.edit', 'description' => 'Can update client users'],
                ['name' => 'Delete Client Users', 'slug' => 'client_users.delete', 'description' => 'Can delete client users'],
            ],
            'WhatsApp Accounts' => [
                ['name' => 'View WhatsApp Accounts', 'slug' => 'whatsapp_accounts.view', 'description' => 'Can view connected WhatsApp accounts'],
                ['name' => 'Create WhatsApp Accounts', 'slug' => 'whatsapp_accounts.create', 'description' => 'Can connect WhatsApp accounts'],
                ['name' => 'Edit WhatsApp Accounts', 'slug' => 'whatsapp_accounts.edit', 'description' => 'Can edit WhatsApp accounts'],
                ['name' => 'Delete WhatsApp Accounts', 'slug' => 'whatsapp_accounts.delete', 'description' => 'Can delete WhatsApp accounts'],
            ],
            'Bots' => [
                ['name' => 'View Bots', 'slug' => 'bots.view', 'description' => 'Can view bots'],
                ['name' => 'Create Bots', 'slug' => 'bots.create', 'description' => 'Can create new bots'],
                ['name' => 'Edit Bots', 'slug' => 'bots.edit', 'description' => 'Can edit bots and toggle status'],
                ['name' => 'Delete Bots', 'slug' => 'bots.delete', 'description' => 'Can delete bots'],
            ],
            'Workflow Builder' => [
                ['name' => 'View Workflows', 'slug' => 'workflows.view', 'description' => 'Can view workflows'],
                ['name' => 'Create Workflows', 'slug' => 'workflows.create', 'description' => 'Can create new workflows'],
                ['name' => 'Edit Workflows', 'slug' => 'workflows.edit', 'description' => 'Can edit workflows'],
                ['name' => 'Delete Workflows', 'slug' => 'workflows.delete', 'description' => 'Can delete workflows'],
                ['name' => 'Publish Workflows', 'slug' => 'workflows.publish', 'description' => 'Can publish workflows'],
            ],
            'Failed Workflows' => [
                ['name' => 'View Failed Workflows', 'slug' => 'failed_workflows.view', 'description' => 'Can view failed workflow execution logs'],
                ['name' => 'Retry Failed Workflows', 'slug' => 'failed_workflows.retry', 'description' => 'Can retry failed workflow executions'],
            ],
            'WhatsApp Simulator' => [
                ['name' => 'Access WhatsApp Simulator', 'slug' => 'whatsapp_simulator.view', 'description' => 'Can access and test bots in simulator'],
            ],
            'Usage & Reports' => [
                ['name' => 'View Usage', 'slug' => 'usage.view', 'description' => 'Can view usage logs and analytics'],
            ],
            'System Logs' => [
                ['name' => 'View System Logs', 'slug' => 'system_logs.view', 'description' => 'Can view system audit logs'],
                ['name' => 'Delete System Logs', 'slug' => 'system_logs.delete', 'description' => 'Can delete system audit logs'],
            ],
            'Platform Settings' => [
                ['name' => 'View Platform Settings', 'slug' => 'platform_settings.view', 'description' => 'Can view platform settings'],
                ['name' => 'Edit Platform Settings', 'slug' => 'platform_settings.edit', 'description' => 'Can modify platform settings'],
            ],
            'Contacts' => [
                ['name' => 'View Contacts', 'slug' => 'contacts.view', 'description' => 'Can view contacts'],
                ['name' => 'Create Contacts', 'slug' => 'contacts.create', 'description' => 'Can create contacts'],
                ['name' => 'Edit Contacts', 'slug' => 'contacts.edit', 'description' => 'Can edit contacts'],
                ['name' => 'Delete Contacts', 'slug' => 'contacts.delete', 'description' => 'Can delete contacts'],
            ],
            'Templates' => [
                ['name' => 'View Templates', 'slug' => 'templates.view', 'description' => 'Can view message templates'],
                ['name' => 'Create Templates', 'slug' => 'templates.create', 'description' => 'Can create message templates'],
            ],
            'Roles & Permissions' => [
                ['name' => 'View Roles', 'slug' => 'roles.view', 'description' => 'Can view roles and permissions'],
                ['name' => 'Manage Roles', 'slug' => 'roles.manage', 'description' => 'Can create, edit, and assign roles & permissions'],
            ],
        ];

        // Seed or update permissions
        foreach ($permissionsByModule as $module => $permissions) {
            foreach ($permissions as $p) {
                Permission::updateOrCreate(
                    ['slug' => $p['slug']],
                    [
                        'name' => $p['name'],
                        'module' => $module,
                        'description' => $p['description'],
                    ]
                );
            }
        }

        $allPermissionIds = Permission::pluck('id')->toArray();

        // 2. Setup Super Admin Role
        $superAdminRole = Role::updateOrCreate(
            ['slug' => 'super_admin'],
            [
                'name' => 'Super Admin',
                'description' => 'Full unrestricted system access to all modules and settings',
                'is_system' => true,
            ]
        );
        $superAdminRole->permissions()->sync($allPermissionIds);

        // 3. Setup Admin / Client Admin Role
        $adminPermissions = Permission::whereNotIn('slug', [
            'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
            'platform_settings.view', 'platform_settings.edit',
            'system_logs.delete',
        ])->pluck('id')->toArray();

        $adminRole = Role::updateOrCreate(
            ['slug' => 'admin'],
            [
                'name' => 'Client Admin',
                'description' => 'Manage tenant operations, bots, workflows, and users',
                'is_system' => true,
            ]
        );
        $adminRole->permissions()->sync($adminPermissions);

        // Also ensure 'client' role exists or points to admin permissions
        $clientRole = Role::updateOrCreate(
            ['slug' => 'client'],
            [
                'name' => 'Client / Owner',
                'description' => 'Tenant owner with access to bots, workflows, and account settings',
                'is_system' => true,
            ]
        );
        $clientRole->permissions()->sync($adminPermissions);

        // 4. Setup Manager Role
        $managerPermissions = Permission::whereIn('slug', [
            'dashboard.view',
            'bots.view', 'bots.create', 'bots.edit',
            'workflows.view', 'workflows.create', 'workflows.edit',
            'whatsapp_accounts.view',
            'whatsapp_simulator.view',
            'contacts.view', 'contacts.create', 'contacts.edit',
            'templates.view',
            'usage.view',
        ])->pluck('id')->toArray();

        $managerRole = Role::updateOrCreate(
            ['slug' => 'manager'],
            [
                'name' => 'Manager',
                'description' => 'Manage assigned operations, bots, workflows, and view reports',
                'is_system' => false,
            ]
        );
        $managerRole->permissions()->sync($managerPermissions);

        // 5. Setup Agent / Support Role
        $agentPermissions = Permission::whereIn('slug', [
            'dashboard.view',
            'bots.view',
            'whatsapp_simulator.view',
            'contacts.view',
            'templates.view',
        ])->pluck('id')->toArray();

        $agentRole = Role::updateOrCreate(
            ['slug' => 'agent'],
            [
                'name' => 'Support Agent',
                'description' => 'View bots, test conversations in simulator, and manage contacts',
                'is_system' => false,
            ]
        );
        $agentRole->permissions()->sync($agentPermissions);

        // 6. Link existing users in DB to their role_id
        $users = User::all();
        foreach ($users as $user) {
            $matchedRole = null;
            if ($user->role === 'super_admin') {
                $matchedRole = $superAdminRole;
            } elseif (in_array($user->role, ['client', 'owner'])) {
                $matchedRole = $clientRole;
            } elseif ($user->role === 'admin') {
                $matchedRole = $adminRole;
            } elseif ($user->role === 'manager') {
                $matchedRole = $managerRole;
            } elseif (in_array($user->role, ['agent', 'user'])) {
                $matchedRole = $agentRole;
            }

            if ($matchedRole) {
                DB::table('users')->where('id', $user->id)->update(['role_id' => $matchedRole->id]);
            }
        }
    }
}
