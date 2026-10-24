<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusinessProfile extends Model
{
      protected $table = 'business_profiles';

    protected $fillable = [
        'user_id',
        'business_name',
        'business_type',
        'industry',
        'country',
        'website',
        'gstin',
        'city',
        'address',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
