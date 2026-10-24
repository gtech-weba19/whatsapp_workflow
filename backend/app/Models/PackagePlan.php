<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PackagePlan extends Model
{
    use HasFactory;

    protected $table = 'package_plans';

    protected $fillable = [
        'name',
        'slug',
        'message_credits',
        'selling_price',
        'currency',
        'validity_days',
        'description',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'selling_price' => 'decimal:2',
        'is_active' => 'boolean',
        'message_credits' => 'integer',
        'sort_order' => 'integer',
    ];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(UserSubscription::class, 'package_plan_id');
    }
}
