<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bot extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'status',
        'whatsapp_account_id',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'whatsapp_account_id' => 'integer',
    ];

    /**
     * User who owns this bot.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * WhatsApp account connected to this bot.
     */
    public function whatsappAccount(): BelongsTo
    {
        return $this->belongsTo(
            WhatsAppAccount::class,
            'whatsapp_account_id'
        );
    }

    /**
     * Workflows connected to this bot.
     */
    public function workflows(): HasMany
    {
        return $this->hasMany(Workflow::class, 'bot_id');
    }
}
