<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    protected $table = 'contacts';

    protected $fillable = [
        'tenant_id',
        'whatsapp_number_id',
        'external_contact_id',
        'phone',
        'name',
        'email',
        'profile_data',
        'tags',
        'status',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'profile_data' => 'array',
            'tags' => 'array',
            'last_seen_at' => 'datetime',
        ];
    }


    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function whatsappNumber(): BelongsTo
    {
        return $this->belongsTo(WhatsAppNumber::class);
    }
}
