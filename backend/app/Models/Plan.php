<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'monthly_price',
        'annual_price',
        'max_bots',
        'max_whatsapp_numbers',
        'max_contacts',
        'max_monthly_messages',
        'max_api_executions',
        'max_ai_executions',
        'features',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'monthly_price' => 'decimal:2',
            'annual_price' => 'decimal:2',
            'max_bots' => 'integer',
            'max_whatsapp_numbers' => 'integer',
            'max_contacts' => 'integer',
            'max_monthly_messages' => 'integer',
            'max_api_executions' => 'integer',
            'max_ai_executions' => 'integer',
            'features' => 'array',
        ];
    }

    /**
     * Plan ki subscriptions.
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /**
     * Sirf active plans.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Billing cycle ke hisaab se plan price.
     */
    public function getPrice(string $billingCycle = 'monthly'): float
    {
        return (float) (
            $billingCycle === 'annual'
                ? $this->annual_price
                : $this->monthly_price
        );
    }

    /**
     * Check karein ki feature enabled hai ya nahi.
     */
    public function hasFeature(string $feature): bool
    {
        return (bool) ($this->features[$feature] ?? false);
    }
}
