<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    protected $fillable = [
        'tenant_id',
        'plan_id',
        'billing_cycle',
        'amount',
        'currency',
        'status',
        'payment_status',
        'starts_at',
        'ends_at',
        'trial_ends_at',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }


    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }


    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }


    public function usage(): HasMany
    {
        return $this->hasMany(SubscriptionUsage::class);
    }


    public function isActive(): bool
    {
        return $this->status === 'active'
            && ($this->ends_at === null || $this->ends_at->isFuture());
    }


    public function isExpired(): bool
    {
        return $this->ends_at !== null
            && $this->ends_at->isPast();
    }


    public function isPaid(): bool
    {
        return $this->payment_status === 'paid';
    }
}
