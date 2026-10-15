<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $table = 'platform_settings';

    protected $fillable = [
        'platform_name',
        'platform_url',
        'timezone',
        'language',
        'request_timeout',
        'email_notifications',
        'webhook_notifications',
    ];

    protected function casts(): array
    {
        return [
            'request_timeout' => 'integer',
            'email_notifications' => 'boolean',
            'webhook_notifications' => 'boolean',
        ];
    }
}
