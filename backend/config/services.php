<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],


'whatsapp' => [

    'api_url' => env(
        'WHATSAPP_API_URL'
    ),

    'token' => env(
        'WHATSAPP_TOKEN'
    ),

    'sender_number' => env(
        'WHATSAPP_SENDER_NUMBER'
    ),

    'sender_name' => env(
        'WHATSAPP_SENDER_NAME',
        'Whatsappdemo'
    ),

    'webhook_dn_id' => env(
        'WHATSAPP_WEBHOOK_DN_ID',
        '1001'
    ),

    'number_workflow_map' => [
        '919810120907' => 7,
    ],

    'phone_workflow_map' => [],

],

   'otp' => [
    'token' => env('OTP_API_TOKEN', ''),
    'send_url' => env('OTP_SEND_URL', ''),
    'verify_url' => env('OTP_VERIFY_URL', ''),
],
];
