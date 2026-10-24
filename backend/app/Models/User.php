<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $guarded = [];

    public function bots(): HasMany
    {
        return $this->hasMany(Bot::class);
    }

    public function workflows(): HasMany
    {
        return $this->hasMany(Workflow::class);
    }

    public function whatsappAccounts(): HasMany
    {
        return $this->hasMany(WhatsAppAccount::class);
    }

    public function whatsappNumbers(): HasMany
    {
        return $this->hasMany(WhatsAppNumber::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function roleRelation(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles', 'user_id', 'role_id');
    }

    public function creditWallet(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(CreditWallet::class);
    }

    public function creditTransactions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(CreditTransaction::class);
    }

    public function messageRates(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(UserMessageRate::class);
    }

    public function subscriptions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(UserSubscription::class);
    }

    public function activeSubscription(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(UserSubscription::class)->where('status', 'active')->latestOfMany();
    }

    /**
     * Check if user is Super Admin
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin' || $this->roleRelation?->slug === 'super_admin';
    }

    /**
     * Get all permission slugs for this user
     *
     * @return array<string>
     */
    public function getAllPermissions(): array
    {
        if ($this->isSuperAdmin()) {
            return Permission::pluck('slug')->toArray();
        }

        $permissions = collect();

        // From direct roleRelation
        if ($this->roleRelation) {
            $permissions = $permissions->merge(
                $this->roleRelation->permissions->pluck('slug')
            );
        }

        // From fallback role string if role_id not linked
        if ($permissions->isEmpty() && !empty($this->role)) {
            $fallbackRole = Role::where('slug', $this->role)->first();
            if ($fallbackRole) {
                $permissions = $permissions->merge(
                    $fallbackRole->permissions->pluck('slug')
                );
            }
        }

        // From user_roles pivot
        if ($this->roles()->exists()) {
            foreach ($this->roles as $role) {
                $permissions = $permissions->merge($role->permissions->pluck('slug'));
            }
        }

        return $permissions->unique()->values()->toArray();
    }

    /**
     * Check if user has a specific permission
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return in_array($permission, $this->getAllPermissions(), true);
    }

    /**
     * Check if user has any of the given permissions
     */
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

    /**
     * Check if user has a specific role (by slug)
     */
    public function hasRole(string|array $roles): bool
    {
        $roleList = is_array($roles) ? $roles : [$roles];

        if (in_array($this->role, $roleList, true)) {
            return true;
        }

        if ($this->roleRelation && in_array($this->roleRelation->slug, $roleList, true)) {
            return true;
        }

        return $this->roles()->whereIn('slug', $roleList)->exists();
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
