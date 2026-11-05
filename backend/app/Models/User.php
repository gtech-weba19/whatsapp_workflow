<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Tenant;
use App\Models\Role;
use App\Models\Permission;
use App\Models\BusinessProfile;
use App\Models\Bot;
use App\Models\WhatsAppAccount;
use App\Models\Workflow;
use App\Models\BotSession;
use App\Models\BotMessage;
use App\Models\WorkflowExecution;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Notifications\CustomResetPasswordNotification;



class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $guarded = [];

    /*
    |--------------------------------------------------------------------------
    | Existing Relationships
    |--------------------------------------------------------------------------
    */

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function businessProfile(): HasOne
    {
        return $this->hasOne(BusinessProfile::class, 'user_id');
    }

    public function roleRelation(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(
            Role::class,
            'user_roles',
            'user_id',
            'role_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Bot & WhatsApp Relationships
    |--------------------------------------------------------------------------
    */

    public function bots(): HasMany
    {
        return $this->hasMany(Bot::class, 'user_id');
    }

    public function whatsappAccounts(): HasMany
    {
        return $this->hasMany(WhatsAppAccount::class, 'user_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Workflow Relationships
    |--------------------------------------------------------------------------
    */

    public function workflows(): HasMany
    {
        return $this->hasMany(Workflow::class, 'user_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Session, Message & Execution Relationships
    |--------------------------------------------------------------------------
    */

    public function botSessions(): HasMany
    {
        return $this->hasMany(BotSession::class, 'user_id');
    }

    public function botMessages(): HasMany
    {
        return $this->hasMany(BotMessage::class, 'user_id');
    }

    public function workflowExecutions(): HasMany
    {
        return $this->hasMany(WorkflowExecution::class, 'user_id');
    }



    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new CustomResetPasswordNotification($token));
    }


    /*
    |--------------------------------------------------------------------------
    | Role & Permission Methods
    |--------------------------------------------------------------------------
    */

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin'
            || $this->roleRelation?->slug === 'super_admin';
    }

    public function getAllPermissions(): array
    {
        if ($this->isSuperAdmin()) {
            return Permission::pluck('slug')->toArray();
        }

        $permissions = collect();

        if ($this->roleRelation) {
            $permissions = $permissions->merge(
                $this->roleRelation->permissions->pluck('slug')
            );
        }

        if ($permissions->isEmpty() && !empty($this->role)) {
            $fallbackRole = Role::where('slug', $this->role)->first();

            if ($fallbackRole) {
                $permissions = $permissions->merge(
                    $fallbackRole->permissions->pluck('slug')
                );
            }
        }

        if ($this->roles()->exists()) {
            foreach ($this->roles as $role) {
                $permissions = $permissions->merge(
                    $role->permissions->pluck('slug')
                );
            }
        }

        return $permissions->unique()->values()->toArray();
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return in_array($permission, $this->getAllPermissions(), true);
    }

    public function hasAnyPermission(array $permissions): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $userPerms = $this->getAllPermissions();

        foreach ($permissions as $perm) {
            if (in_array($perm, $userPerms, true)) {
                return true;
            }
        }

        return false;
    }

    public function hasRole(string|array $roles): bool
    {
        $roleList = is_array($roles) ? $roles : [$roles];

        if (in_array($this->role, $roleList, true)) {
            return true;
        }

        if (
            $this->roleRelation
            && in_array($this->roleRelation->slug, $roleList, true)
        ) {
            return true;
        }

        return $this->roles()->whereIn('slug', $roleList)->exists();
    }

    /*
    |--------------------------------------------------------------------------
    | Serialization & Casts
    |--------------------------------------------------------------------------
    */

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
