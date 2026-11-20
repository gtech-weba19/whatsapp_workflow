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
        'platform_fee_percent',
        'platform_fee_fixed',
        'gst_percent',
        'support_phone',
        'support_email',
        'rate_utility',
        'rate_marketing',
        'rate_service',
        'rate_authentication',
    ];

    protected function casts(): array
    {
        return [
            'request_timeout' => 'integer',
            'email_notifications' => 'boolean',
            'webhook_notifications' => 'boolean',
            'platform_fee_percent' => 'float',
            'platform_fee_fixed' => 'float',
            'gst_percent' => 'float',
            'rate_utility' => 'float',
            'rate_marketing' => 'float',
            'rate_service' => 'float',
            'rate_authentication' => 'float',
        ];
    }
}
