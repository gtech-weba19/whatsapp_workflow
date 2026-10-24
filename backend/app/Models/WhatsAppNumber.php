<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppNumber extends Model
{
    protected $table = 'whatsapp_numbers';

    protected $fillable = [
        'user_id',
        'whatsapp_account_id',
        'phone_number',
        'display_name',
        'phone_number_id',
        'sender_id',
        'country_code',
        'status',
        'webhook_url',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function whatsappAccount(): BelongsTo
    {
        return $this->belongsTo(
            WhatsAppAccount::class,
            'whatsapp_account_id'
        );
    }
}
