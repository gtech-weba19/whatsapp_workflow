<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'tenant_id',
        'subscription_id',
        'transaction_id',
        'payment_gateway',
        'gateway_payment_id',
        'gateway_order_id',
        'amount',
        'currency',
        'status',
        'payment_method',
        'paid_at',
        'failure_reason',
        'gateway_response',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'gateway_response' => 'array',
        ];
    }

    /**
     * Payment kis client (tenant) ki hai.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Payment kis subscription ke liye hai.
     */
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /**
     * Payment successful hai ya nahi.
     */
    public function isSuccessful(): bool
    {
        return $this->status === 'success';
    }

    /**
     * Payment pending hai ya nahi.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Payment failed hai ya nahi.
     */
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Payment refund hui hai ya nahi.
     */
    public function isRefunded(): bool
    {
        return $this->status === 'refunded';
    }
}
