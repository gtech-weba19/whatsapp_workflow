<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BotMessage extends Model
{
    protected $fillable = [
        'user_id',
        'bot_id',
        'whatsapp_account_id',
        'bot_session_id',
        'direction',
        'message_type',
        'text',
        'payload',
        'external_message_id',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'bot_id' => 'integer',
        'whatsapp_account_id' => 'integer',
        'payload' => 'array',
    ];

    /**
     * Session associated with this message.
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(BotSession::class, 'bot_session_id');
    }

    /**
     * Alias for session().
     */
    public function botSession(): BelongsTo
    {
        return $this->belongsTo(BotSession::class, 'bot_session_id');
    }

    /**
     * User who owns this message.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Bot associated with this message.
     */
    public function bot(): BelongsTo
    {
        return $this->belongsTo(Bot::class, 'bot_id');
    }

    /**
     * WhatsApp account associated with this message.
     */
    public function whatsappAccount(): BelongsTo
    {
        return $this->belongsTo(
            WhatsAppAccount::class,
            'whatsapp_account_id'
        );
    }
}
