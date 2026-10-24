<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserMessageRate extends Model
{
    use HasFactory;

    protected $table = 'user_message_rates';

    protected $fillable = [
        'user_id',
        'channel',
        'message_category',
        'rate',
        'currency',
        'effective_from',
        'effective_to',
        'status',
        'created_by',
    ];

    protected $casts = [
        'rate' => 'decimal:6',
        'effective_from' => 'datetime',
        'effective_to' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
