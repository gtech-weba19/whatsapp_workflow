<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreditTransaction extends Model
{
    use HasFactory;

    protected $table = 'credit_transactions';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'subscription_id',
        'transaction_type',
        'credits',
        'balance_after',
        'reference_type',
        'reference_id',
        'idempotency_key',
        'notes',
        'created_by',
        'created_at',
    ];

    protected $casts = [
        'credits' => 'decimal:4',
        'balance_after' => 'decimal:4',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(UserSubscription::class, 'subscription_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
