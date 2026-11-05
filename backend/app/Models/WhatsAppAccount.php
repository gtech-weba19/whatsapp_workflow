<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsAppAccount extends Model
{
    protected $table = 'whatsapp_accounts';

    protected $fillable = [
        'user_id',
        'name',
        'provider',
        'business_name',
        'phone_number',
        'phone_number_id',
        'waba_id',
        'access_token',
        'app_secret',
        'webhook_verify_token',
        'api_base_url',
        'status',
        'last_synced_at',
        'notes',
    ];

    protected $hidden = [
        'access_token',
        'app_secret',
        'webhook_verify_token',
    ];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'app_secret' => 'encrypted',
            'webhook_verify_token' => 'encrypted',
            'last_synced_at' => 'datetime',
        ];
    }

    /**
     * User who owns this WhatsApp account.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Bots connected to this WhatsApp account.
     */
    public function bots(): HasMany
    {
        return $this->hasMany(Bot::class, 'whatsapp_account_id');
    }

    /**
     * Workflows connected to this WhatsApp account.
     */
    public function workflows(): HasMany
    {
        return $this->hasMany(Workflow::class, 'whatsapp_account_id');
    }

    /**
     * Sessions associated with this WhatsApp account.
     */
    public function botSessions(): HasMany
    {
        return $this->hasMany(BotSession::class, 'whatsapp_account_id');
    }
}
