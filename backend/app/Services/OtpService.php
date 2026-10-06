<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OtpService
{
    protected string $sendUrl;
    protected string $verifyUrl;
    protected string $token;

    protected int $otpExpiryMinutes = 5;
    protected int $maxAttempts = 3;

    public function __construct()
    {
        $this->token = (string) config(
            'services.otp.token',
            ''
        );

        $this->sendUrl = (string) config(
            'services.otp.send_url',
            ''
        );

        $this->verifyUrl = (string) config(
            'services.otp.verify_url',
            ''
        );

        Log::info('OTP SERVICE CONFIG', [
            'send_url' => $this->sendUrl,
            'token_configured' => trim($this->token) !== '',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SEND OTP
    |--------------------------------------------------------------------------
    */

    public function sendOtp(
        string $mobile,
        array $config = []
    ): array {
        $mobile = $this->normalizeMobile($mobile);

        if ($mobile === '') {
            return [
                'success' => false,
                'message' => 'Invalid mobile number.',
            ];
        }



        $nodeUrl = trim((string) (
            $config['sendOtpUrl']
            ?? $config['send_otp_url']
            ?? ''
        ));

        $url = $nodeUrl !== ''
            ? $nodeUrl
            : trim($this->sendUrl);

        Log::info('OTP URL CHECK', [
            'node_url' => $nodeUrl,
            'env_url' => $this->sendUrl,
            'final_url' => $url,
            'is_empty' => $url === '',
        ]);

        if ($url === '') {
            Log::error('OTP SEND URL IS EMPTY');

            return [
                'success' => false,
                'message' => 'Send OTP URL is empty.',
            ];
        }

        if (trim($this->token) === '') {
            Log::error('OTP API TOKEN IS EMPTY');

            return [
                'success' => false,
                'message' => 'OTP API token is not configured.',
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Generate OTP
        |--------------------------------------------------------------------------
        */

        $otp = (string) random_int(
            100000,
            999999
        );

        /*
        |--------------------------------------------------------------------------
        | Cache Keys
        |--------------------------------------------------------------------------
        */

        $otpKey = $this->otpKey($mobile);

        $attemptKey = $this->attemptKey($mobile);

        /*
        |--------------------------------------------------------------------------
        | Store HASHED OTP
        |--------------------------------------------------------------------------
        */

        Cache::put(
            $otpKey,
            password_hash(
                $otp,
                PASSWORD_DEFAULT
            ),
            now()->addMinutes(
                $this->otpExpiryMinutes
            )
        );

        /*
        |--------------------------------------------------------------------------
        | Reset Attempts
        |--------------------------------------------------------------------------
        */

        Cache::put(
            $attemptKey,
            0,
            now()->addMinutes(
                $this->otpExpiryMinutes
            )
        );

        /*
        |--------------------------------------------------------------------------
        | SMS API PAYLOAD
        |--------------------------------------------------------------------------
        */

      $name = trim((string) (
            $config['name']
            ?? $config['customerName']
            ?? $config['customer_name']
            ?? ''
        ));

        if ($name !== '') {
            $text =
                "Hello\n" .
                $name . "\n" .
                "Your OTP is {$otp}\n" .
                "Thankyou\n" .
                "(GTech)";
        } else {
            $text =
                "Hello\n" .
                "Your OTP is {$otp}\n" .
                "Thankyou\n" .
                "(GTech)";
        }


        $payload = [
        'ver' => '1.0',
        'key' => $this->token,
        'encrpt' => '0',

        'messages' => [
            [
                'dest' => [$mobile],

                 'text' => $text,

                'send' => 'GTECHM',

                'dlt_entity_id' => '1101424890000010089',

                'dlt_template_id' => '1107171905530853253',

                'type' => 'PM',

                'dcs' => '0',

                'udhi_inc' => '0',

                'dlr_req' => '1',

                'app_country' => '1',

                'cust_ref' => '123',
            ],
        ],
    ];

        /*
        |--------------------------------------------------------------------------
        | Send SMS
        |--------------------------------------------------------------------------
        */

        try {
            Log::info('OTP SEND REQUEST', [
                'url' => $url,
                'mobile' => $mobile,
            ]);

           $response = Http::timeout(30)
                ->withBody(
                    json_encode($payload),
                    'application/json'
                )
                ->post($url);

            $data = $response->json();

            if (!is_array($data)) {
                $data = [
                    'raw_response' => $response->body(),
                ];
            }

            Log::info('OTP SEND RESPONSE', [
                'mobile' => $mobile,
                'status' => $response->status(),
                'response' => $data,
            ]);

            /*
            |--------------------------------------------------------------------------
            | SMS FAILED
            |--------------------------------------------------------------------------
            */

            if (!$response->successful()) {
                Cache::forget($otpKey);

                Cache::forget($attemptKey);

                return [
                    'success' => false,

                    'message' =>
                        'OTP SMS could not be sent.',

                    'status_code' =>
                        $response->status(),

                    'data' => $data,
                ];
            }

            /*
            |--------------------------------------------------------------------------
            | Extract Provider Reference
            |--------------------------------------------------------------------------
            */

            $reference = $this->extractOtpReference(
                $data
            );

            return [
                'success' => true,

                'message' =>
                    'OTP sent successfully.',

                'status_code' =>
                    $response->status(),

                'data' => $data,

                'reference' =>
                    $reference,
            ];
        } catch (\Throwable $e) {

            Cache::forget($otpKey);

            Cache::forget($attemptKey);

            Log::error('OTP SEND ERROR', [
                'mobile' => $mobile,

                'error' =>
                    $e->getMessage(),
            ]);

            return [
                'success' => false,

                'message' =>
                    'Unable to send OTP.',

                'error' =>
                    $e->getMessage(),
            ];
        }
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY OTP
    |--------------------------------------------------------------------------
    */

    public function verifyOtp(
        string $mobile,
        string $otp,
        array $config = [],
        ?string $reference = null
    ): array {
        $mobile = $this->normalizeMobile(
            $mobile
        );

        $otp = trim($otp);

        if ($mobile === '') {
            return [
                'success' => false,
                'verified' => false,
                'message' =>
                    'Invalid mobile number.',
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | OTP FORMAT
        |--------------------------------------------------------------------------
        */

        if (!preg_match(
            '/^\d{6}$/',
            $otp
        )) {
            return [
                'success' => false,

                'verified' => false,

                'message' =>
                    'OTP must be 6 digits.',
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Cache Keys
        |--------------------------------------------------------------------------
        */

        $otpKey = $this->otpKey(
            $mobile
        );

        $attemptKey = $this->attemptKey(
            $mobile
        );

        /*
        |--------------------------------------------------------------------------
        | Get Stored OTP
        |--------------------------------------------------------------------------
        */

        $storedOtp = Cache::get(
            $otpKey
        );

        if (!$storedOtp) {
            return [
                'success' => false,

                'verified' => false,

                'message' =>
                    'OTP expired or not found.',
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Attempts
        |--------------------------------------------------------------------------
        */

        $attempts = (int) Cache::get(
            $attemptKey,
            0
        );

        if (
            $attempts >=
            $this->maxAttempts
        ) {
            Cache::forget($otpKey);

            Cache::forget($attemptKey);

            return [
                'success' => false,

                'verified' => false,

                'message' =>
                    'Maximum OTP attempts exceeded.',
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Check OTP
        |--------------------------------------------------------------------------
        */

        if (!password_verify(
            $otp,
            $storedOtp
        )) {

            $attempts++;

            Cache::put(
                $attemptKey,
                $attempts,
                now()->addMinutes(
                    $this->otpExpiryMinutes
                )
            );

            $remaining = max(
                0,
                $this->maxAttempts - $attempts
            );

            return [
                'success' => false,

                'verified' => false,

                'message' =>
                    'Invalid OTP.',

                'attempts' =>
                    $attempts,

                'remaining_attempts' =>
                    $remaining,
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | OTP SUCCESS
        |--------------------------------------------------------------------------
        */

        Cache::forget($otpKey);

        Cache::forget($attemptKey);

        Log::info('OTP VERIFIED', [
            'mobile' => $mobile,

            'reference' =>
                $reference,
        ]);

        return [
            'success' => true,

            'verified' => true,

            'message' =>
                'OTP verified successfully.',

            'reference' =>
                $reference,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | OTP CACHE KEY
    |--------------------------------------------------------------------------
    */

    private function otpKey(
        string $mobile
    ): string {
        return 'whatsapp_otp:' .
            hash(
                'sha256',
                $mobile
            );
    }

    /*
    |--------------------------------------------------------------------------
    | ATTEMPT CACHE KEY
    |--------------------------------------------------------------------------
    */

    private function attemptKey(
        string $mobile
    ): string {
        return 'whatsapp_otp_attempts:' .
            hash(
                'sha256',
                $mobile
            );
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE MOBILE
    |--------------------------------------------------------------------------
    */

    private function normalizeMobile(
        string $mobile
    ): string {
        $mobile = preg_replace(
            '/\D+/',
            '',
            $mobile
        );

        if (
            strlen($mobile) === 10
        ) {
            $mobile = '91' . $mobile;
        }

        return (string) $mobile;
    }

    /*
    |--------------------------------------------------------------------------
    | EXTRACT PROVIDER REFERENCE
    |--------------------------------------------------------------------------
    */

    private function extractOtpReference(
        array $response
    ): ?string {

        $keys = [
            'reference',
            'reference_id',
            'referenceId',

            'transaction_id',
            'transactionId',

            'request_id',
            'requestId',

            'data.reference',
            'data.reference_id',
            'data.referenceId',

            'data.transaction_id',
            'data.transactionId',

            'data.request_id',
            'data.requestId',
        ];

        foreach ($keys as $key) {

            $value = data_get(
                $response,
                $key
            );

            if (
                $value !== null &&
                $value !== ''
            ) {
                return (string) $value;
            }
        }

        return null;
    }
}
