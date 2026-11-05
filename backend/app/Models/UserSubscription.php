<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSubscription extends Model
{
    use HasFactory;

    protected $table = 'user_subscriptions';

    protected $fillable = [
        'user_id',
        'package_plan_id',
        'amount_paid',
        'currency',
        'credits_granted',
        'credits_remaining',
        'starts_at',
        'expires_at',
        'status',
    ];

    protected $casts = [
        'amount_paid' => 'decimal:2',
        'credits_granted' => 'integer',
        'credits_remaining' => 'integer',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(PackagePlan::class, 'package_plan_id');
    }
}
