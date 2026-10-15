<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppAccount extends Model
{
      protected $table = 'whatsapp_accounts';

    protected $fillable = [
        'tenant_id', 'name', 'provider', 'business_name', 'phone_number',
        'phone_number_id', 'waba_id', 'access_token', 'app_secret',
        'webhook_verify_token', 'api_base_url', 'status', 'last_synced_at', 'notes',
    ];

    protected $hidden = ['access_token', 'app_secret', 'webhook_verify_token'];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'app_secret' => 'encrypted',
            'webhook_verify_token' => 'encrypted',
            'last_synced_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
