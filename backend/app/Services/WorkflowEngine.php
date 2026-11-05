<?php

namespace App\Services;

use App\Models\BotMessage;
use App\Models\BotSession;
use App\Models\CustomerLead;
use App\Models\MediaUpload;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\WhatsAppAccount;
use Illuminate\Support\Facades\DB;
use App\Models\Bot;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\WalletService;


class WorkflowEngine
{
    public function __construct(
        private WhatsAppService $whatsapp,

    ) {}



    public function useWhatsAppAccount(
    int $userId,
    string $whatsappTo
): void {
    $this->whatsapp->useAccountForUser(
        $userId,
        $whatsappTo
    );
}



/**
 * Send OTP for API node.
 */
public function sendOtpForApiNode(
    array $config,
    string $mobile,
    array $variables = []
): array {

    // ==========================================================
    // OTP URL
    // ==========================================================

    $otpUrl = trim((string) (
        $config['otpUrl']
        ?? $config['otp_url']
        ?? ''
    ));

    $otpMethod = strtoupper((string) (
        $config['otpMethod']
        ?? $config['otp_method']
        ?? 'POST'
    ));

    if ($otpUrl === '') {

        Log::error('API OTP: OTP URL missing');

        return [
            'success' => false,
            'message' => 'OTP URL is not configured.',
            'status_code' => 0,
            'reference' => null,
        ];
    }

    // ==========================================================
    // NAME
    // ==========================================================

    $nameVariable =
        $config['nameVariable']
        ?? $config['name_variable']
        ?? 'name';

    $name = trim((string) (
        $variables[$nameVariable]
        ?? $variables['name']
        ?? ''
    ));

    // ==========================================================
    // STANDARD VARIABLES
    // ==========================================================

    $variables['mobile'] = $mobile;

    if ($name !== '') {
        $variables['name'] = $name;
    }

    // ==========================================================
    // GENERATE OTP
    // ==========================================================

    $otpLength = (int) (
        $config['otpLength']
        ?? $config['otp_length']
        ?? 6
    );

    if ($otpLength < 4 || $otpLength > 8) {
        $otpLength = 6;
    }

    $otp = (string) random_int(
        10 ** ($otpLength - 1),
        (10 ** $otpLength) - 1
    );

    $variables['otp'] = $otp;

    // ==========================================================
    // OTP PAYLOAD
    // ==========================================================

    $payload =
        $config['otpPayload']
        ?? $config['otp_payload']
        ?? $config['sendOtpPayload']
        ?? $config['send_otp_payload']
        ?? [];

    if (is_string($payload)) {

        $decoded = json_decode(
            $payload,
            true
        );

        $payload = is_array($decoded)
            ? $decoded
            : [];
    }

    if (!is_array($payload)) {
        $payload = [];
    }

    // ==========================================================
    // REPLACE VARIABLES
    // ==========================================================

        $payload = $this->replaceApiVariables(
            $payload,
            $variables
        );

    $payload['ver'] = $payload['ver'] ?? '1.0';

    // ==========================================================
    // DEFAULT MOBILE
    // ==========================================================

    if (!array_key_exists('mobile', $payload)) {
        $payload['mobile'] = $mobile;
    }

    // ==========================================================
    // DEFAULT NAME
    // ==========================================================

    if (
        !array_key_exists('name', $payload) &&
        $name !== ''
    ) {
        $payload['name'] = $name;
    }

    // ==========================================================
    // DEFAULT OTP
    // ==========================================================

    if (!array_key_exists('otp', $payload)) {
        $payload['otp'] = $otp;
    }

    // ==========================================================
    // HEADERS
    // ==========================================================

    $headers =
        $config['otpHeaders']
        ?? $config['otp_headers']
        ?? $config['apiHeaders']
        ?? $config['api_headers']
        ?? [];

    if (is_string($headers)) {

        $decoded = json_decode(
            $headers,
            true
        );

        $headers = is_array($decoded)
            ? $decoded
            : [];
    }

    if (!is_array($headers)) {
        $headers = [];
    }

    // Resolve header variables

    $headers = $this->replaceApiVariables(
        $headers,
        $variables
    );

    // ==========================================================
    // QUERY PARAMETERS
    // ==========================================================

    $query =
        $config['otpQuery']
        ?? $config['otp_query']
        ?? [];

    if (is_string($query)) {

        $decoded = json_decode(
            $query,
            true
        );

        $query = is_array($decoded)
            ? $decoded
            : [];
    }

    if (!is_array($query)) {
        $query = [];
    }

    $query = $this->replaceApiVariables(
        $query,
        $variables
    );

    // ==========================================================
    // AUTHENTICATION
    // ==========================================================

    $authType = strtolower((string) (
        $config['apiAuthType']
        ?? $config['api_auth_type']
        ?? 'none'
    ));

    // ==========================================================
    // BEARER
    // ==========================================================

    if ($authType === 'bearer') {

        $token = trim((string) (
            $config['apiBearerToken']
            ?? $config['api_bearer_token']
            ?? ''
        ));

        $token = $this->replaceApiVariables(
            $token,
            $variables
        );

        if ($token !== '') {

            $headers['Authorization'] =
                'Bearer ' . $token;
        }
    }

    // ==========================================================
    // API KEY
    // ==========================================================

    if ($authType === 'api_key') {

        $keyName = trim((string) (
            $config['apiKeyName']
            ?? $config['api_key_name']
            ?? ''
        ));

        $keyValue = (string) (
            $config['apiKeyValue']
            ?? $config['api_key_value']
            ?? ''
        );

        $keyValue = $this->replaceApiVariables(
            $keyValue,
            $variables
        );

        if (
            $keyName !== '' &&
            $keyValue !== ''
        ) {

            $headers[$keyName] = $keyValue;
        }
    }

    // ==========================================================
    // BASIC AUTH
    // ==========================================================

    $basicUsername = (string) (
        $config['apiUsername']
        ?? $config['api_username']
        ?? ''
    );

    $basicPassword = (string) (
        $config['apiPassword']
        ?? $config['api_password']
        ?? ''
    );

    $basicUsername = $this->replaceApiVariables(
        $basicUsername,
        $variables
    );

    $basicPassword = $this->replaceApiVariables(
        $basicPassword,
        $variables
    );

    // ==========================================================
    // TIMEOUT
    // ==========================================================

    $timeout = (int) (
        $config['apiTimeout']
        ?? $config['api_timeout']
        ?? 30
    );

    if ($timeout <= 0) {
        $timeout = 30;
    }

    // ==========================================================
    // REQUEST
    // ==========================================================

    try {

        Log::info('API OTP: SEND REQUEST', [
            'url' => $otpUrl,
            'method' => $otpMethod,
            'mobile' => $mobile,
            'name' => $name,
            'payload' => $payload,
            'query' => $query,
        ]);

        $request = Http::timeout($timeout)
            ->withHeaders($headers);

        // Basic Auth

        if ($authType === 'basic') {

            $request = $request->withBasicAuth(
                $basicUsername,
                $basicPassword
            );
        }

        // Query Parameters

        if (!empty($query)) {

            $request = $request->withQueryParameters(
                $query
            );
        }

        // ======================================================
        // SEND
        // ======================================================

        $response = match ($otpMethod) {

            'GET' => $request->get(
                $otpUrl,
                $payload
            ),

            'PUT' => $request->put(
                $otpUrl,
                $payload
            ),

            'PATCH' => $request->patch(
                $otpUrl,
                $payload
            ),

            default => $request->post(
                $otpUrl,
                $payload
            ),
        };

        // ======================================================
        // RESPONSE
        // ======================================================

        $responseData = $response->json();

        if (!is_array($responseData)) {

            $responseData = [
                'raw' => $response->body(),
            ];
        }

        // ======================================================
        // OTP REFERENCE
        // ======================================================
    $reference =
        data_get($responseData, 'reference')
        ?? data_get($responseData, 'otp_reference')
        ?? data_get($responseData, 'reference_id')
        ?? data_get($responseData, 'referenceId')
        ?? data_get($responseData, 'request_id')
        ?? data_get($responseData, 'requestId')
        ?? data_get($responseData, 'transaction_id')
        ?? data_get($responseData, 'transactionId')
        ?? data_get($responseData, 'ackid')
        ?? data_get($responseData, 'data.reference')
        ?? data_get($responseData, 'data.otp_reference')
        ?? data_get($responseData, 'data.reference_id')
        ?? data_get($responseData, 'data.referenceId')
        ?? data_get($responseData, 'data.request_id')
        ?? data_get($responseData, 'data.requestId')
        ?? data_get($responseData, 'data.transaction_id')
        ?? data_get($responseData, 'data.transactionId')
        ?? data_get($responseData, 'data.ackid')
        ?? null;

        // ======================================================
        // SUCCESS
        // ======================================================

        $success = $response->successful();

        if (
            array_key_exists(
                'success',
                $responseData
            )
        ) {

            $success =
                $success &&
                filter_var(
                    $responseData['success'],
                    FILTER_VALIDATE_BOOLEAN
                );
        }

        Log::info('API OTP: SEND RESPONSE', [
            'mobile' => $mobile,
            'status_code' => $response->status(),
            'success' => $success,
            'reference' => $reference,
            'response' => $responseData,
        ]);

        return [
            'success' => $success,

            'message' =>
                $responseData['message']
                ?? ($success
                    ? 'OTP sent successfully.'
                    : 'Unable to send OTP.'),

            'status_code' => $response->status(),

            'reference' => $reference,

            'otp' => $otp,

            'data' => $responseData,
        ];

    } catch (\Throwable $e) {

        Log::error('API OTP: SEND ERROR', [
            'mobile' => $mobile,
            'url' => $otpUrl,
            'error' => $e->getMessage(),
        ]);

        return [
            'success' => false,
            'message' => 'Unable to send OTP.',
            'status_code' => 0,
            'reference' => null,
            'error' => $e->getMessage(),
        ];
    }
}

/**
 * Verify OTP for API node
 */
public function verifyOtpForApiNode(
    array $config,
    string $mobile,
    string $otp,
    ?string $reference = null,
    array $variables = []
): array {

    $otpUrl = trim((string) (
        $config['otpUrl']
        ?? $config['otp_url']
        ?? ''
    ));

    $otpMethod = strtoupper((string) (
        $config['otpMethod']
        ?? $config['otp_method']
        ?? 'POST'
    ));

    if ($otpUrl === '') {

        Log::error('API OTP: VERIFY URL MISSING');

        return [
            'success' => false,
            'verified' => false,
            'message' => 'OTP verification URL is not configured.',
            'status_code' => 0,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Name
    |--------------------------------------------------------------------------
    */

    $nameVariable =
        $config['nameVariable']
        ?? $config['name_variable']
        ?? 'name';

    $nameValue = $variables[$nameVariable]
        ?? $variables['name']
        ?? '';

    $name = is_scalar($nameValue)
        ? trim((string) $nameValue)
        : '';

    /*
    |--------------------------------------------------------------------------
    | Variables
    |--------------------------------------------------------------------------
    */

    $variables['mobile'] = $mobile;
    $variables['otp'] = $otp;

    if ($name !== '') {
        $variables['name'] = $name;
    }

    if ($reference !== null && $reference !== '') {

        $variables['otp_reference'] = $reference;
        $variables['reference'] = $reference;
    }




$payload =
    $config['verifyOtpPayload']
    ?? $config['verify_otp_payload']
    ?? $config['otpVerifyPayload']
    ?? $config['otp_verify_payload']
    ?? [];



if (is_string($payload)) {

    $decoded = json_decode(
        $payload,
        true
    );

    $payload = is_array($decoded)
        ? $decoded
        : [];
}

if (!is_array($payload)) {
    $payload = [];
}


$payload = $this->replaceApiVariables(
    $payload,
    $variables
);

if (
    !array_key_exists('key', $payload)
    || trim((string) $payload['key']) === ''
) {

    $sendPayload =
        $config['otpPayload']
        ?? $config['otp_payload']
        ?? $config['sendOtpPayload']
        ?? $config['send_otp_payload']
        ?? [];


    if (is_string($sendPayload)) {

        $decodedSend = json_decode(
            $sendPayload,
            true
        );

        $sendPayload = is_array($decodedSend)
            ? $decodedSend
            : [];
    }

    if (!is_array($sendPayload)) {
        $sendPayload = [];
    }


    $sendPayload = $this->replaceApiVariables(
        $sendPayload,
        $variables
    );


    if (
        array_key_exists('key', $sendPayload)
        && trim((string) $sendPayload['key']) !== ''
    ) {

        $payload['key'] = $sendPayload['key'];
    }
}


$payload['ver'] = $payload['ver'] ?? '1.0';$payload['ver'] = $payload['ver'] ?? '1.0';


if (
    !array_key_exists('messages', $payload)
    || !is_array($payload['messages'])
    || empty($payload['messages'])
) {
    $payload['messages'] = [
        [
            'dest' => [
                $mobile
            ],
            'text' => $otp,
        ]
    ];
}

if (!array_key_exists('mobile', $payload)) {
    $payload['mobile'] = $mobile;
}

    if (
        !array_key_exists('name', $payload)
        && $name !== ''
    ) {
        $payload['name'] = $name;
    }

    if (!array_key_exists('otp', $payload)) {
        $payload['otp'] = $otp;
    }

    if (
        $reference !== null
        && $reference !== ''
        && !array_key_exists('reference', $payload)
    ) {
        $payload['reference'] = $reference;
    }

    /*
    |--------------------------------------------------------------------------
    | HEADERS
    |--------------------------------------------------------------------------
    */

    $headers =
        $config['otpHeaders']
        ?? $config['otp_headers']
        ?? $config['apiHeaders']
        ?? $config['api_headers']
        ?? [];

    if (is_string($headers)) {

        $decoded = json_decode(
            $headers,
            true
        );

        $headers = is_array($decoded)
            ? $decoded
            : [];
    }

    if (!is_array($headers)) {
        $headers = [];
    }


    $headers = $this->replaceApiVariables(
        $headers,
        $variables
    );


    foreach ($headers as $headerName => $headerValue) {

        if (is_array($headerValue) || is_object($headerValue)) {

            $headers[$headerName] = json_encode(
                $headerValue,
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
            );

        } elseif ($headerValue === null) {

            $headers[$headerName] = '';

        } else {

            $headers[$headerName] = (string) $headerValue;
        }
    }



    $query =
        $config['otpQuery']
        ?? $config['otp_query']
        ?? [];

    if (is_string($query)) {

        $decoded = json_decode(
            $query,
            true
        );

        $query = is_array($decoded)
            ? $decoded
            : [];
    }

    if (!is_array($query)) {
        $query = [];
    }

    $query = $this->replaceApiVariables(
        $query,
        $variables
    );


    foreach ($query as $key => $value) {

        if (is_array($value) || is_object($value)) {

            $query[$key] = json_encode(
                $value,
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
            );

        } elseif ($value === null) {

            $query[$key] = '';

        } else {

            $query[$key] = (string) $value;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | AUTH
    |--------------------------------------------------------------------------
    */

    $authType = strtolower((string) (
        $config['apiAuthType']
        ?? $config['api_auth_type']
        ?? 'none'
    ));

    /*
    |--------------------------------------------------------------------------
    | BEARER
    |--------------------------------------------------------------------------
    */

    if ($authType === 'bearer') {

        $token = $config['apiBearerToken']
            ?? $config['api_bearer_token']
            ?? '';

        if (is_array($token) || is_object($token)) {
            $token = json_encode($token);
        }

        $token = $this->replaceApiVariables(
            (string) $token,
            $variables
        );

        if ($token !== '') {

            $headers['Authorization'] =
                'Bearer ' . $token;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | API KEY
    |--------------------------------------------------------------------------
    */

    if ($authType === 'api_key') {

        $keyName = $config['apiKeyName']
            ?? $config['api_key_name']
            ?? '';

        $keyValue = $config['apiKeyValue']
            ?? $config['api_key_value']
            ?? '';

        if (is_array($keyName) || is_object($keyName)) {
            $keyName = '';
        }

        if (is_array($keyValue) || is_object($keyValue)) {

            $keyValue = json_encode(
                $keyValue,
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
            );
        }

        $keyName = trim((string) $keyName);

        $keyValue = $this->replaceApiVariables(
            (string) $keyValue,
            $variables
        );

        if (
            $keyName !== ''
            && $keyValue !== ''
        ) {
            $headers[$keyName] = $keyValue;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | BASIC AUTH
    |--------------------------------------------------------------------------
    */

    $basicUsername =
        $config['apiUsername']
        ?? $config['api_username']
        ?? '';

    $basicPassword =
        $config['apiPassword']
        ?? $config['api_password']
        ?? '';

    if (is_array($basicUsername) || is_object($basicUsername)) {
        $basicUsername = '';
    }

    if (is_array($basicPassword) || is_object($basicPassword)) {
        $basicPassword = '';
    }

    $basicUsername = $this->replaceApiVariables(
        (string) $basicUsername,
        $variables
    );

    $basicPassword = $this->replaceApiVariables(
        (string) $basicPassword,
        $variables
    );

    /*
    |--------------------------------------------------------------------------
    | TIMEOUT
    |--------------------------------------------------------------------------
    */

    $timeout = (int) (
        $config['apiTimeout']
        ?? $config['api_timeout']
        ?? 30
    );

    if ($timeout <= 0) {
        $timeout = 30;
    }



    $safePayload = $payload;

    // OTP hide
    if (array_key_exists('otp', $safePayload)) {
        $safePayload['otp'] = '******';
    }

    // Access key hide
    if (array_key_exists('key', $safePayload)) {
        $safePayload['key'] = '******';
    }

    // Other possible secret fields hide
    if (array_key_exists('accessKey', $safePayload)) {
        $safePayload['accessKey'] = '******';
    }

    if (array_key_exists('access_key', $safePayload)) {
        $safePayload['access_key'] = '******';
    }



    Log::info('API OTP: VERIFY REQUEST', [
        'url' => $otpUrl,
        'method' => $otpMethod,
        'mobile' => $mobile,
        'reference' => $reference,
        'payload' => $safePayload,
        'query' => $query,
    ]);

    /*
    |--------------------------------------------------------------------------
    | REQUEST
    |--------------------------------------------------------------------------
    */

    try {

         $request = Http::timeout($timeout)
        ->withHeaders($headers)
        ->asJson();

        /*
        |--------------------------------------------------------------------------
        | Basic Auth
        |--------------------------------------------------------------------------
        */

        if ($authType === 'basic') {

            $request = $request->withBasicAuth(
                $basicUsername,
                $basicPassword
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Query Parameters
        |--------------------------------------------------------------------------
        */

        if (!empty($query)) {

            $request = $request->withQueryParameters(
                $query
            );
        }

        /*
        |--------------------------------------------------------------------------
        | SEND REQUEST
        |--------------------------------------------------------------------------
        */

        $response = match ($otpMethod) {

            'GET' => $request->get(
                $otpUrl,
                $payload
            ),

            'PUT' => $request->put(
                $otpUrl,
                $payload
            ),

            'PATCH' => $request->patch(
                $otpUrl,
                $payload
            ),

            'DELETE' => $request->delete(
                $otpUrl,
                $payload
            ),

            default => $request->post(
                $otpUrl,
                $payload
            ),
        };

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        $responseData = $response->json();

        if (!is_array($responseData)) {

            $responseData = [
                'raw' => $response->body(),
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | DETECT VERIFIED
        |--------------------------------------------------------------------------
        */

        $verified = $this->detectOtpVerification(
            $responseData
        );

        /*
        |--------------------------------------------------------------------------
        | HTTP FAILURE
        |--------------------------------------------------------------------------
        */

        if (!$response->successful()) {
            $verified = false;
        }

        /*
        |--------------------------------------------------------------------------
        | MESSAGE
        |--------------------------------------------------------------------------
        */

        $messageValue =
            $responseData['message']
            ?? $responseData['msg']
            ?? '';

        if (
            is_array($messageValue)
            || is_object($messageValue)
        ) {

            $messageValue = json_encode(
                $messageValue,
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
            );
        }

        $message = trim(
            (string) $messageValue
        );

        if ($message === '') {

            $message = $verified
                ? 'OTP verified successfully.'
                : 'Invalid OTP.';
        }

        /*
        |--------------------------------------------------------------------------
        | LOG
        |--------------------------------------------------------------------------
        */

        Log::info('API OTP: VERIFY RESPONSE', [
            'mobile' => $mobile,
            'status_code' => $response->status(),
            'verified' => $verified,
            'response' => $responseData,
        ]);

        /*
        |--------------------------------------------------------------------------
        | RETURN
        |--------------------------------------------------------------------------
        */

        return [
            'success' => $response->successful(),
            'verified' => $verified,
            'message' => $message,
            'status_code' => $response->status(),
            'data' => $responseData,
        ];

    } catch (\Throwable $e) {

        Log::error('API OTP: VERIFY ERROR', [
            'mobile' => $mobile,
            'url' => $otpUrl,
            'method' => $otpMethod,
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);

        return [
            'success' => false,
            'verified' => false,
            'message' => 'Unable to verify OTP.',
            'status_code' => 0,
            'error' => $e->getMessage(),
        ];
    }
}


private function detectOtpVerification(
    mixed $response
): bool {
    if (is_string($response)) {

        $decoded = json_decode(
            $response,
            true
        );

        if (is_array($decoded)) {
            $response = $decoded;
        } else {
            return false;
        }
    }

    if (!is_array($response)) {
        return false;
    }

    /*
    |--------------------------------------------------------------------------
    | Boolean fields
    |--------------------------------------------------------------------------
    */

    foreach ([
        'verified',
        'isVerified',
        'is_verified',
        'otpVerified',
        'otp_verified',
        'valid',
        'isValid',
        'is_valid',
        'success',
    ] as $field) {

        if (!array_key_exists($field, $response)) {
            continue;
        }

        if (
            $this->toBoolean(
                $response[$field]
            )
        ) {
            return true;
        }

        if (
            $response[$field] === false
            || $response[$field] === 0
            || $response[$field] === '0'
        ) {
            return false;
        }
    }



    if (array_key_exists('status', $response)) {

        $statusValue = $response['status'];

        /*
        |--------------------------------------------------------------------------
        | STATUS AS ARRAY
        |--------------------------------------------------------------------------
        */

        if (is_array($statusValue)) {

            $statusCode =
                $statusValue['code']
                ?? $statusValue['statusCode']
                ?? $statusValue['status_code']
                ?? null;

            $statusDesc =
                $statusValue['desc']
                ?? $statusValue['description']
                ?? $statusValue['message']
                ?? '';

            /*
            |--------------------------------------------------------------------------
            | Provider status code
            |--------------------------------------------------------------------------
            */

            if (
                $statusCode !== null
                && (string) $statusCode === '200'
            ) {
                return true;
            }

            /*
            |--------------------------------------------------------------------------
            | Provider status description
            |--------------------------------------------------------------------------
            */

            if (is_scalar($statusDesc)) {

                $statusDesc = strtolower(
                    trim((string) $statusDesc)
                );

                if (in_array($statusDesc, [
                    'success',
                    'successful',
                    'verified',
                    'otp verified',
                    'request accepted',
                    'accepted',
                    'ok',
                    'valid',
                ], true)) {
                    return true;
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | STATUS AS STRING / NUMBER
        |--------------------------------------------------------------------------
        */

        else {

            $status = strtolower(
                trim((string) $statusValue)
            );

            if (in_array($status, [
                'success',
                'successful',
                'verified',
                'verify',
                'valid',
                'valid_otp',
                'otp_verified',
                'otp verified',
                'approved',
                'ok',
                'true',
                '1',
                '200',
            ], true)) {
                return true;
            }
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Message
    |--------------------------------------------------------------------------
    */

    $messageValue =
        $response['message']
        ?? $response['msg']
        ?? '';

    if (
        is_array($messageValue)
        || is_object($messageValue)
    ) {

        $messageValue = json_encode(
            $messageValue,
            JSON_UNESCAPED_UNICODE
        );
    }

    $message = strtolower(
        trim((string) $messageValue)
    );

    /*
    |--------------------------------------------------------------------------
    | SUCCESS MESSAGES
    |--------------------------------------------------------------------------
    */

    foreach ([
        'otp verified',
        'otp verification successful',
        'otp verified successfully',
        'verification successful',
        'verification success',
        'verified successfully',
        'valid otp',
        'otp is valid',
        'otp accepted',
        'otp verification passed',
        'verification passed',
    ] as $successMessage) {

        if (
            str_contains(
                $message,
                $successMessage
            )
        ) {
            return true;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | FAILURE MESSAGES
    |--------------------------------------------------------------------------
    */

    foreach ([
        'invalid otp',
        'incorrect otp',
        'wrong otp',
        'otp expired',
        'otp verification failed',
        'verification failed',
        'invalid code',
        'otp is invalid',
        'otp not valid',
        'otp rejected',
    ] as $failureMessage) {

        if (
            str_contains(
                $message,
                $failureMessage
            )
        ) {
            return false;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Nested response
    |--------------------------------------------------------------------------
    */

    foreach ([
        'data',
        'response',
        'result',
        'resultData',
    ] as $key) {

        if (
            isset($response[$key])
            && is_array($response[$key])
        ) {

            if (
                $this->detectOtpVerification(
                    $response[$key]
                )
            ) {
                return true;
            }
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Default
    |--------------------------------------------------------------------------
    */

    return false;
}


/**
 * Convert different values to boolean.
 */
private function toBoolean(
    mixed $value
): bool {

    if (is_bool($value)) {
        return $value;
    }

    if (
        is_int($value)
        || is_float($value)
    ) {
        return $value === 1;
    }

    if (
        is_array($value)
        || is_object($value)
    ) {
        return false;
    }

    return in_array(
        strtolower(
            trim((string) $value)
        ),
        [
            '1',
            'true',
            'yes',
            'y',
            'success',
            'successful',
            'verified',
            'valid',
            'approved',
            'ok',
        ],
        true
    );
}

private function replaceApiVariables(
    mixed $value,
    array $variables
): mixed {

    // ==========================================================
    // ARRAY
    // ==========================================================

    if (is_array($value)) {

        foreach ($value as $key => $item) {

            $value[$key] =
                $this->replaceApiVariables(
                    $item,
                    $variables
                );
        }

        return $value;
    }


    if (!is_string($value)) {
        return $value;
    }


    return preg_replace_callback(
        '/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/',
        function ($matches) use ($variables) {

            $key = $matches[1];

            $parts = explode('.', $key);

            $current = $variables;

            foreach ($parts as $part) {

                if (
                    is_array($current) &&
                    array_key_exists($part, $current)
                ) {

                    $current = $current[$part];

                } elseif (
                    is_object($current) &&
                    isset($current->{$part})
                ) {

                    $current = $current->{$part};

                } else {
                    return $matches[0];
                }
            }

            // ==================================================
            // ARRAY / OBJECT
            // ==================================================

            if (
                is_array($current) ||
                is_object($current)
            ) {

                return json_encode(
                    $current,
                    JSON_UNESCAPED_UNICODE
                );
            }

            if ($current === null) {
                return '';
            }


            return (string) $current;
        },
        $value
    );
}


public function findWorkflowByTrigger(
    string $message,
    ?int $whatsappAccountId = null,
    ?int $userId = null
): ?Workflow {

    $message = mb_strtolower(trim($message));

    if ($message === '' || !$whatsappAccountId || !$userId) {
        Log::warning('WHATSAPP TRIGGER INPUT INVALID', [
            'message' => $message,
            'whatsapp_account_id' => $whatsappAccountId,
            'user_id' => $userId,
        ]);

        return null;
    }

    $workflows = Workflow::query()
        ->where('channel', 'whatsapp')
        ->where('status', 'published')
        ->where('whatsapp_account_id', $whatsappAccountId)
        ->where('user_id', $userId)
        ->with(['nodes' => function ($query) {
            $query->where('node_type', 'start');
        }])
        ->get();

    foreach ($workflows as $workflow) {

        $startNode = $workflow->nodes->first();

        if (!$startNode) {
            Log::warning('WHATSAPP TRIGGER START NODE MISSING', [
                'workflow_id' => $workflow->id,
            ]);

            continue;
        }

        $cfg = $startNode->configuration ?? [];

        if (is_string($cfg)) {
            $decoded = json_decode($cfg, true);
            $cfg = is_array($decoded) ? $decoded : [];
        }

        if (!is_array($cfg)) {
            continue;
        }

        $triggers = [];

        foreach (
            ['triggerText', 'trigger', 'keyword', 'triggers', 'keywords']
            as $key
        ) {
            if (!array_key_exists($key, $cfg)) {
                continue;
            }

            $value = $cfg[$key];

            foreach (is_array($value) ? $value : [$value] as $trigger) {
                if (is_scalar($trigger)) {
                    $trigger = mb_strtolower(trim((string) $trigger));

                    if ($trigger !== '') {
                        $triggers[] = $trigger;
                    }
                }
            }
        }

        $triggers = array_values(array_unique($triggers));

        Log::info('WHATSAPP TRIGGER COMPARISON', [
            'workflow_id' => $workflow->id,
            'incoming_message' => $message,
            'configured_triggers' => $triggers,
        ]);

        if (in_array($message, $triggers, true)) {
            Log::info('WHATSAPP TRIGGER MATCHED', [
                'workflow_id' => $workflow->id,
                'message' => $message,
            ]);

            return $workflow;
        }
    }

    Log::warning('WHATSAPP TRIGGER NOT MATCHED', [
        'message' => $message,
        'whatsapp_account_id' => $whatsappAccountId,
        'user_id' => $userId,
    ]);

    return null;
}


/**
 * Find active WhatsApp session with strict user and account isolation.
 */
private function findActiveSession(
    string $user,
    ?int $whatsappAccountId = null,
    ?int $userId = null
): ?BotSession {

    if (!$whatsappAccountId || !$userId) {

        Log::warning('ACTIVE SESSION LOOKUP SKIPPED - ACCOUNT DETAILS MISSING', [
            'user_identifier' => $user,
            'whatsapp_account_id' => $whatsappAccountId,
            'user_id' => $userId,
        ]);

        return null;
    }

    return BotSession::query()
        ->where('channel', 'whatsapp')
        ->where('user_identifier', $user)
        ->where('whatsapp_account_id', $whatsappAccountId)
        ->where('user_id', $userId)
        ->whereIn('status', ['active', 'waiting'])
        ->orderByDesc('id')
        ->first();
}

    private function getStartNode(Workflow $workflow)
    {
        return $workflow->nodes()
            ->where('node_type', 'start')
            ->first();
    }



public function handleIncoming(
    string $user,
    string $message,
    array $incoming = []
): ?BotSession {

    $user = trim($user);
    $message = trim($message);

    if ($user === '') {
        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | GET USER AND WHATSAPP ACCOUNT ID
    |--------------------------------------------------------------------------
    */

    $whatsappAccountId = !empty($incoming['whatsapp_account_id'])
        ? (int) $incoming['whatsapp_account_id']
        : null;

    $userId = !empty($incoming['user_id'])
        ? (int) $incoming['user_id']
        : null;

    if (!$whatsappAccountId || !$userId) {

        Log::warning('WHATSAPP INCOMING ACCOUNT DETAILS MISSING', [
            'user' => $user,
            'user_id' => $userId,
            'whatsapp_account_id' => $whatsappAccountId,
            'incoming_keys' => array_keys($incoming),
            'message' => $message,
        ]);

        return null;
    }

    $messageNormalized = mb_strtolower($message);

    /*
    |--------------------------------------------------------------------------
    | VERIFY WHATSAPP ACCOUNT
    |--------------------------------------------------------------------------
    */

    $account = WhatsAppAccount::query()
        ->where('id', $whatsappAccountId)
        ->where('user_id', $userId)
        ->first();

    if (!$account) {

        Log::error('WHATSAPP INCOMING ACCOUNT NOT FOUND', [
            'user_id' => $userId,
            'whatsapp_account_id' => $whatsappAccountId,
        ]);

        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | EXIT CURRENT JOURNEY
    |--------------------------------------------------------------------------
    */

    $exitCommands = [
        'exit',
        'stop',
        'cancel',
        'quit',
        'end',
    ];

    if (in_array($messageNormalized, $exitCommands, true)) {

        $session = $this->findActiveSession(
            $user,
            $whatsappAccountId,
            $userId
        );

        if (!$session) {
            return null;
        }

        $workflow = Workflow::query()
            ->where('id', $session->workflow_id)
            ->where('user_id', $userId)
            ->where('bot_id', $session->bot_id)
            ->where('whatsapp_account_id', $whatsappAccountId)
            ->where('channel', 'whatsapp')
            ->first();

        if (!$workflow) {
            return null;
        }

        $session->update([
            'status' => 'completed',
            'current_node_id' => null,
            'last_message_at' => now(),
        ]);

        $exitMessage = 'You have exited the current journey. You can start again anytime.';

        try {

            // Send message using the already configured WhatsApp account.
            $output = $this->whatsapp->sendText(
                $user,
                $exitMessage
            );

            $this->saveOutbound(
                $session,
                'text',
                $exitMessage,
                $output
            );

        } catch (\Throwable $e) {

            Log::error('WHATSAPP EXIT MESSAGE FAILED', [
                'user_id' => $userId,
                'whatsapp_account_id' => $whatsappAccountId,
                'workflow_id' => $workflow->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $session->refresh();
    }

    /*
    |--------------------------------------------------------------------------
    | DETECT MENU OPTION HANDLE
    |--------------------------------------------------------------------------
    */

    $sourceHandle = trim(
        (string) ($incoming['source_handle'] ?? '')
    );

    $isMenuOptionHandle =
        preg_match('/^source-option-\d+$/i', $message) === 1
        || preg_match('/^source-option-\d+$/i', $sourceHandle) === 1;

    /*
    |--------------------------------------------------------------------------
    | FIND EXISTING ACTIVE SESSION
    |--------------------------------------------------------------------------
    */

    $existingSession = $this->findActiveSession(
        $user,
        $whatsappAccountId,
        $userId,

    );



    $triggerWorkflow = null;

if (!$existingSession && !$isMenuOptionHandle) {

    $triggerWorkflow = $this->findWorkflowByTrigger(
        $message,
        $whatsappAccountId,
        $userId
    );
}



    if ($triggerWorkflow) {

    /*
    |--------------------------------------------------------------------------
    | VERIFY TRIGGER WORKFLOW OWNERSHIP
    |--------------------------------------------------------------------------
    */

    if (
        (int) $triggerWorkflow->user_id !== $userId
        || (int) $triggerWorkflow->whatsapp_account_id !== $whatsappAccountId
    ) {

        Log::error('WHATSAPP TRIGGER WORKFLOW OWNERSHIP MISMATCH', [
            'workflow_id' => $triggerWorkflow->id,
            'workflow_user_id' => $triggerWorkflow->user_id,
            'incoming_user_id' => $userId,
            'workflow_account_id' => $triggerWorkflow->whatsapp_account_id,
            'incoming_account_id' => $whatsappAccountId,
        ]);

        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | START NEW JOURNEY
    |--------------------------------------------------------------------------
    */

    $incoming['user_id'] = $userId;
    $incoming['whatsapp_account_id'] = $whatsappAccountId;

    Log::info('WHATSAPP NEW JOURNEY STARTING', [
        'workflow_id' => $triggerWorkflow->id,
        'bot_id' => $triggerWorkflow->bot_id,
        'user_id' => $userId,
        'whatsapp_account_id' => $whatsappAccountId,
        'mobile' => $user,
    ]);

    return $this->start(
        $triggerWorkflow,
        $user,
        $incoming
    );
}



    if (!$existingSession) {

    Log::warning('WHATSAPP ACTIVE SESSION NOT FOUND', [
        'user' => $user,
        'user_id' => $userId,
        'whatsapp_account_id' => $whatsappAccountId,
        'message' => $message,
    ]);

    $invalidMessage = 'Invalid input';

    try {

        $response = $this->whatsapp->sendText(
            $user,
            $invalidMessage
        );

        Log::info('WHATSAPP INVALID INPUT MESSAGE SENT', [
            'user' => $user,
            'user_id' => $userId,
            'whatsapp_account_id' => $whatsappAccountId,
            'message' => $message,
        ]);

    } catch (\Throwable $e) {

        Log::error('WHATSAPP INVALID INPUT MESSAGE FAILED', [
            'user' => $user,
            'user_id' => $userId,
            'whatsapp_account_id' => $whatsappAccountId,
            'error' => $e->getMessage(),
        ]);
    }

    return null;
}

    /*
    |--------------------------------------------------------------------------
    | LOAD CURRENT WORKFLOW WITH ACCOUNT ISOLATION
    |--------------------------------------------------------------------------
    */

    $workflow = Workflow::query()
        ->where('id', $existingSession->workflow_id)
        ->where('user_id', $userId)
        ->where('bot_id', $existingSession->bot_id)
        ->where('channel', 'whatsapp')
        ->where('status', 'published')
        ->where('whatsapp_account_id', $whatsappAccountId)
        ->first();

    if (!$workflow) {

        Log::warning(
            'WHATSAPP SESSION WORKFLOW NOT FOUND FOR ACCOUNT',
            [
                'session_id' => $existingSession->id,
                'workflow_id' => $existingSession->workflow_id,
                'bot_id' => $existingSession->bot_id,
                'user_id' => $userId,
                'whatsapp_account_id' => $whatsappAccountId,
            ]
        );

        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY SESSION OWNERSHIP
    |--------------------------------------------------------------------------
    */

    if (
        (int) $existingSession->user_id !== $userId
        || (int) $existingSession->whatsapp_account_id !== $whatsappAccountId
    ) {

        Log::error('WHATSAPP SESSION OWNERSHIP MISMATCH', [
            'session_id' => $existingSession->id,
            'session_user_id' => $existingSession->user_id,
            'incoming_user_id' => $userId,
            'session_account_id' => $existingSession->whatsapp_account_id,
            'incoming_account_id' => $whatsappAccountId,
        ]);

        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | REFRESH SESSION
    |--------------------------------------------------------------------------
    */

    $existingSession->refresh();

    /*
    |--------------------------------------------------------------------------
    | CURRENT NODE
    |--------------------------------------------------------------------------
    */

    $currentNodeId = $existingSession->current_node_id;

    /*
    |--------------------------------------------------------------------------
    | NO CURRENT NODE
    |--------------------------------------------------------------------------
    */

    if (!$currentNodeId) {

        $startNode = $this->getStartNode($workflow);

        if (!$startNode) {

            Log::warning('WHATSAPP START NODE NOT FOUND', [
                'user_id' => $userId,
                'whatsapp_account_id' => $whatsappAccountId,
                'workflow_id' => $workflow->id,
                'session_id' => $existingSession->id,
            ]);

            return $existingSession;
        }

        $existingSession->update([
            'current_node_id' => $startNode->node_id,
            'status' => 'active',
            'last_message_at' => now(),
        ]);

        $existingSession->refresh();

        Log::info('WHATSAPP EXECUTION ACCOUNT CHECK', [
            'workflow_id' => $workflow->id,
            'bot_id' => $workflow->bot_id,
            'user_id' => $userId,
            'whatsapp_account_id' => $whatsappAccountId,
            'session_id' => $existingSession->id,
        ]);

        $this->execute(
            $workflow,
            $existingSession,
            (string) $startNode->node_id,
            []
        );

        return $existingSession->refresh();
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY CURRENT NODE EXISTS
    |--------------------------------------------------------------------------
    */

    $currentNodeExists = $workflow->nodes()
        ->where('node_id', $currentNodeId)
        ->exists();

    if (!$currentNodeExists) {

        Log::warning('WHATSAPP CURRENT NODE NOT FOUND', [
            'user' => $user,
            'user_id' => $userId,
            'whatsapp_account_id' => $whatsappAccountId,
            'workflow_id' => $workflow->id,
            'session_id' => $existingSession->id,
            'current_node_id' => $currentNodeId,
        ]);

        $existingSession->update([
            'status' => 'completed',
            'current_node_id' => null,
            'last_message_at' => now(),
        ]);

        return $existingSession;
    }

    /*
    |--------------------------------------------------------------------------
    | PREPARE NODE INPUT
    |--------------------------------------------------------------------------
    */

    $nodeInput = $incoming;

    $nodeInput['text'] = $message;
    $nodeInput['user_id'] = $userId;
    $nodeInput['whatsapp_account_id'] = $whatsappAccountId;

    if ($sourceHandle !== '') {
        $nodeInput['source_handle'] = $sourceHandle;
    }

    /*
    |--------------------------------------------------------------------------
    | EXECUTE CURRENT NODE
    |--------------------------------------------------------------------------
    */

    Log::info('WHATSAPP NEXT MESSAGE EXECUTION', [
        'workflow_id' => $workflow->id,
        'bot_id' => $workflow->bot_id,
        'user_id' => $userId,
        'whatsapp_account_id' => $whatsappAccountId,
        'session_id' => $existingSession->id,
        'current_node_id' => $currentNodeId,
    ]);

    $this->execute(
        $workflow,
        $existingSession,
        (string) $currentNodeId,
        $nodeInput
    );

    return $existingSession->refresh();
}


private function sendWhatsAppText(
    string $to,
    string $text,

): array {
    return $this->whatsapp->sendText(
        $to,
        $text,

    );
}


public function start(
    Workflow $workflow,
    string $user,
    array $incoming = []
): BotSession {

    // WhatsApp account ki database ID
    $whatsappAccountId = $incoming['whatsapp_account_id'] ?? null;

    // Workflow ka owner aur assigned Bot
    $ownerId = $workflow->user_id;
    $botId = $workflow->bot_id;

    // Active session check karein
    $existingSession = $this->findActiveSession(
        $user,
        $whatsappAccountId
    );

    // Sirf same workflow ki session return karein
    if (
        $existingSession &&
        (int) $existingSession->workflow_id === (int) $workflow->id
    ) {
        $existingSession->update([
            'user_id' => $ownerId,
            'bot_id' => $botId,
            'whatsapp_account_id' => $whatsappAccountId,
            'last_message_at' => now(),
        ]);

        return $existingSession->refresh();
    }

    // Same account + customer + workflow ki session find karein
    $sessionQuery = BotSession::query()
        ->where('channel', 'whatsapp')
        ->where('user_identifier', $user)
        ->where('workflow_id', $workflow->id);

    if ($whatsappAccountId !== null) {
        $sessionQuery->where(
            'whatsapp_account_id',
            $whatsappAccountId
        );
    } else {
        $sessionQuery->whereNull('whatsapp_account_id');
    }

    $session = $sessionQuery
        ->orderByDesc('id')
        ->first();

if (! $session) {

    // New session create karein
    $session = BotSession::create([
        'user_id' => $ownerId,
        'bot_id' => $botId,
        'workflow_id' => $workflow->id,
        'whatsapp_account_id' => $whatsappAccountId,
        'channel' => 'whatsapp',
        'user_identifier' => $user,
        'variables' => $incoming['variables'] ?? [],
        'status' => 'active',
        'current_node_id' => null,
        'last_message_at' => now(),
    ]);

} else {

    // Existing session update karein
    $session->update([
        'user_id' => $ownerId,
        'bot_id' => $botId,
        'workflow_id' => $workflow->id,
        'whatsapp_account_id' => $whatsappAccountId,
        'status' => 'active',
        'current_node_id' => null,
        'last_message_at' => now(),
    ]);
}

    $startNode = $this->getStartNode($workflow);

    if (! $startNode) {
        return $session;
    }

    $this->execute(
        $workflow,
        $session,
        (string) $startNode->node_id,
        []
    );

    return $session->refresh();
}



public function execute(
    Workflow $workflow,
    BotSession $session,
    string $nodeId,
    array $input = []
): void {

    $node = $workflow->nodes()
        ->where('node_id', $nodeId)
        ->first();

    if (! $node) {

        return;
    }

    // Workflow owner
    $userId = $workflow->user_id ?? null;

    // Bot linked to workflow
    $botId = $workflow->bot_id ?? null;

    $whatsappAccountId = $workflow->whatsapp_account_id ?? null;

    if (!$whatsappAccountId && $userId) {
        $whatsappAccountId = WhatsAppAccount::where('user_id', $userId)
            ->value('id');
    }

    $log = WorkflowExecution::create([
        'workflow_id' => $workflow->id,
        'bot_session_id' => $session->id,

        'user_id' => $userId,
        'bot_id' => $botId,
        'whatsapp_account_id' => $whatsappAccountId,

        'node_id' => $nodeId,
        'input_payload' => $input,
        'started_at' => now(),
    ]);


    try {
        $cfg = $node->configuration ?? [];

        if (is_string($cfg)) {

            $decoded = json_decode(
                $cfg,
                true
            );

            if (
                json_last_error() === JSON_ERROR_NONE
                &&
                is_array($decoded)
            ) {
                $cfg = $decoded;
            }
        }

        if (! is_array($cfg)) {
            $cfg = [];
        }

        $type = $node->node_type;

        $output = [];

if ($type === 'start') {

    $startMessage = trim(
        (string) (
            $cfg['message']
            ?? $cfg['startMessage']
            ?? $cfg['start_message']
            ?? $cfg['text']
            ?? ''
        )
    );

    $next = $this->nextNode($workflow, $nodeId);

    if ($startMessage !== '') {

        $startMessage = $this->resolve(
            $startMessage,
            $session->variables ?? []
        );

        $output = $this->whatsapp->sendText(
            $session->user_identifier,
            $startMessage,

        );

        $this->saveOutbound(
            $session,
            'text',
            $startMessage,
            $output,
            $next ? [
                'workflow_id' => $workflow->id,
                'next_node_id' => $next,
                'input' => $input,
            ] : null
        );

        // Wait for delivery webhook.
        if ($next) {
            return;
        }
    }

    if ($next) {

        $this->goToNode(
            $workflow,
            $session,
            $next,
            $input
        );

    } else {

        $session->update([
            'current_node_id' => $nodeId,
            'status' => 'completed',
            'last_message_at' => now(),
        ]);
    }



// }elseif ($type === 'message') {

//     $text = $this->resolve(
//         (string) (
//             $cfg['message']
//             ?? $cfg['text']
//             ?? ''
//         ),
//         $session->variables ?? []
//     );

//     $next = $this->nextNode($workflow, $nodeId);

//     if ($text !== '') {

//         try {

//             $output = $this->whatsapp->sendText(
//                 $session->user_identifier,
//                 $text
//             );

//             // $this->saveOutbound(
//             //     $session,
//             //     'text',
//             //     $text,
//             //     $output,
//             //     null
//             // );

//              $this->saveOutbound(
//              $session,
//               'text',
//               $text,
//               $output,
//               $next ? [
//                   'workflow_id' => $workflow->id,
//                   'next_node_id' => $next,
//                 'input' => $input,
//             ] : null
//             );

//         } catch (\Throwable $e) {

//             \Log::error('MESSAGE NODE SEND FAILED', [
//                 'workflow_id' => $workflow->id,
//                 'node_id' => $nodeId,
//                 'session_id' => $session->id,
//                 'error' => $e->getMessage(),
//             ]);

//             throw $e;
//         }
//     }

//     // Immediately execute next node
//     if ($next) {

//         $this->goToNode(
//             $workflow,
//             $session,
//             $next,
//             $input
//         );

//     } else {

//         $session->update([
//             'current_node_id' => $nodeId,
//             'status' => 'completed',
//             'last_message_at' => now(),
//         ]);
//     }
// }
} elseif ($type === 'message') {

    $text = $this->resolve(
        (string) (
            $cfg['message']
            ?? $cfg['text']
            ?? ''
        ),
        $session->variables ?? []
    );

    $next = $this->nextNode($workflow, $nodeId);

    if ($text !== '') {

        try {

            $output = $this->whatsapp->sendText(
                $session->user_identifier,
                $text
            );

            // Next node ki information save hogi.
            // Delivery confirm hone par hi execute hogi.
            $this->saveOutbound(
                $session,
                'text',
                $text,
                $output,
                $next ? [
                    'workflow_id' => $workflow->id,
                    'next_node_id' => $next,
                    'input' => $input,
                ] : null
            );

            // Next node ka wait delivery webhook karega.
            $session->update([
                'current_node_id' => $nodeId,
                'status' => $next ? 'waiting' : 'completed',
                'last_message_at' => now(),
            ]);

        } catch (\Throwable $e) {

            \Log::error('MESSAGE NODE SEND FAILED', [
                'workflow_id' => $workflow->id,
                'node_id' => $nodeId,
                'session_id' => $session->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
elseif ($type === 'menu') {

    /*
    |--------------------------------------------------------------------------
    | USER SELECTED MENU OPTION
    |--------------------------------------------------------------------------
    */

    if (!empty($input['source_handle'])) {

        $sourceHandle = (string) $input['source_handle'];

        $next = $this->nextNode(
            $workflow,
            $nodeId,
            $sourceHandle
        );

        Log::info('Exe_sourceHandle' . $sourceHandle);
        Log::info('Exe_next' . $next);

        $variable = $cfg['variable'] ?? null;

        if ($variable) {

            $selectedLabel = $this->getMenuOptionLabel(
                $cfg,
                $sourceHandle,
                $input
            );

            if (
                $selectedLabel !== null
                && trim((string) $selectedLabel) !== ''
            ) {

                $variables = $session->variables ?? [];

                $variables[$variable] = trim(
                    (string) $selectedLabel
                );

                $session->update([
                    'variables' => $variables,
                    'status' => 'active',
                    'last_message_at' => now(),
                ]);

                $session->refresh();
            }
        }

        if ($next) {

            $this->goToNode(
            $workflow,
            $session,
            $next,
                []
            );

            return;
        }

        // Invalid selection.
        $validationMessage = $cfg['validation_message']
            ?? $cfg['validationMessage']
            ?? '⚠️ This option is not available right now. Please select another option.';

        $validationMessage = $this->resolve(
            (string) $validationMessage,
            $session->variables ?? []
        );

        $output = $this->whatsapp->sendText(
            $session->user_identifier,
            $validationMessage,

        );

        $this->saveOutbound(
            $session,
            'text',
            $validationMessage,
            $output
        );

        // Menu will be resent after validation message delivery.
        $this->sendMenu(
            $session,
            $cfg,

        );

        $session->update([
            'current_node_id' => $nodeId,
            'status' => 'waiting',
            'last_message_at' => now(),
        ]);

        return;
    }


    /*
    |--------------------------------------------------------------------------
    | USER TYPED MENU OPTION
    |--------------------------------------------------------------------------
    */

    if (array_key_exists('text', $input)) {

        $typedText = trim(
            (string) ($input['text'] ?? '')
        );

        $matchedOption = $this->findMenuOptionByText(
            $cfg,
            $typedText
        );

        if ($matchedOption !== null) {

            $sourceHandle = $matchedOption['source_handle'];
            $selectedLabel = $matchedOption['label'];

            $variable = $cfg['variable'] ?? null;

            if ($variable) {

                $variables = $session->variables ?? [];

                $variables[$variable] = $selectedLabel;

                $session->update([
                    'variables' => $variables,
                    'status' => 'active',
                    'last_message_at' => now(),
                ]);

                $session->refresh();
            }

            $next = $this->nextNode(
                $workflow,
                $nodeId,
                $sourceHandle
            );

            if ($next) {

              $this->goToNode(
                    $workflow,
                    $session,
                    $next,
                    []
                );

                return;
            }
        }

        // Invalid typed option.
        $validationMessage = $cfg['validation_message']
            ?? $cfg['validationMessage']
            ?? '⚠️ Please select one of the options above.';

        $validationMessage = $this->resolve(
            (string) $validationMessage,
            $session->variables ?? []
        );

        $output = $this->whatsapp->sendText(
            $session->user_identifier,
            $validationMessage,

        );

        $this->saveOutbound(
            $session,
            'text',
            $validationMessage,
            $output
        );

        $this->sendMenu(
            $session,
            $cfg,

        );

        $session->update([
            'current_node_id' => $nodeId,
            'status' => 'waiting',
            'last_message_at' => now(),
        ]);

        return;
    }


    /*
    |--------------------------------------------------------------------------
    | INITIAL MENU SEND
    |--------------------------------------------------------------------------
    */

    $output = $this->sendMenu(
        $session,
        $cfg,

    );

    $session->update([
        'current_node_id' => $nodeId,
        'status' => 'waiting',
        'last_message_at' => now(),
    ]);

    return;
}

elseif (
    $type === 'document'
    ||
    $type === 'pdf'
) {

    $mediaUrl = $this->resolveMediaUrl(
        $cfg,
        $workflow
    );

    $filename = $cfg['filename']
        ?? $cfg['file_name']
        ?? $cfg['fileName']
        ?? $cfg['name']
        ?? '';

    $caption = $cfg['caption']
        ?? $cfg['message']
        ?? $cfg['text']
        ?? '';

    $mediaUrl = $this->resolve(
        (string) $mediaUrl,
        $session->variables ?? []
    );

    $filename = $this->resolve(
        (string) $filename,
        $session->variables ?? []
    );

    $caption = $this->resolve(
        (string) $caption,
        $session->variables ?? []
    );

    if ($mediaUrl === '') {
        throw new \RuntimeException(
            'Document/PDF media URL is empty.'
        );
    }

    $output = $this->whatsapp->sendDocument(
        $session->user_identifier,
        $mediaUrl,
        $filename,
        $caption
    );

    $next = $this->nextNode(
        $workflow,
        $nodeId
    );

    $this->saveOutbound(
        $session,
        'document',
        $caption !== '' ? $caption : $filename,
        $output,
        $next ? [
            'workflow_id' => $workflow->id,
            'next_node_id' => $next,
            'input' => $input,
        ] : null
    );

    if ($next) {
    return;
}

// No next node: complete the session
$session->update([
    'current_node_id' => $nodeId,
    'status' => 'completed',
    'last_message_at' => now(),
]);
}

elseif ($type === 'audio') {

    $mediaUrl = $this->resolveMediaUrl(
        $cfg,
        $workflow
    );

    $mediaUrl = $this->resolve(
        (string) $mediaUrl,
        $session->variables ?? []
    );

    if ($mediaUrl === '') {
        throw new \RuntimeException(
            'Audio media URL is empty.'
        );
    }

    $output = $this->whatsapp->sendAudio(
        $session->user_identifier,
        $mediaUrl
    );

    $next = $this->nextNode(
        $workflow,
        $nodeId
    );

    $this->saveOutbound(
        $session,
        'audio',
        null,
        $output,
        $next ? [
            'workflow_id' => $workflow->id,
            'next_node_id' => $next,
            'input' => $input,
        ] : null
    );

   if ($next) {
    return;
}

$session->update([
    'current_node_id' => $nodeId,
    'status' => 'completed',
    'last_message_at' => now(),
]);
}



// elseif ($type === 'media') {

//     $cfg = $node->configuration ?? [];

//     // =======================================================
//     // RAW NODE DEBUG
//     // =======================================================

//     Log::warning(
//         'MEDIA NODE RAW NODE DEBUG',
//         [
//             'node_id' => $node->id ?? null,
//             'node_type' => $node->node_type ?? null,
//             'raw_config' => $node->configuration ?? null,
//             'raw_attributes' => method_exists($node, 'getAttributes')
//                 ? $node->getAttributes()
//                 : null,
//         ]
//     );

//     // =======================================================
//     // DECODE CONFIGURATION
//     // =======================================================

//     if (is_string($cfg)) {
//         $cfg = json_decode($cfg, true) ?? [];
//     }

//     if (!is_array($cfg)) {
//         $cfg = [];
//     }

//     // =======================================================
//     // SESSION VARIABLES
//     // =======================================================

//     $variables = $session->variables ?? [];

//     if (is_string($variables)) {
//         $variables = json_decode($variables, true) ?? [];
//     }

//     if (!is_array($variables)) {
//         $variables = [];
//     }

//     // =======================================================
//     // MEDIA TYPE
//     // =======================================================

//     $mediaType = $cfg['mediaType']
//         ?? $cfg['media_type']
//         ?? 'image';

//     $mediaType = strtolower(trim((string) $mediaType));

//     // PDF = DOCUMENT
//     if ($mediaType === 'pdf') {
//         $mediaType = 'document';
//     }

//     // =======================================================
//     // MEDIA URL
//     // =======================================================

//     $mediaUrl = $cfg['mediaUrl']
//         ?? $cfg['media_url']
//         ?? $cfg['url']
//         ?? '';

//     $mediaUrl = trim(
//         (string) $this->resolve(
//             (string) $mediaUrl,
//             $variables
//         )
//     );

//     // =======================================================
//     // MEDIA ID
//     // =======================================================

//     $mediaId = $cfg['mediaId']
//         ?? $cfg['media_id']
//         ?? null;

//     if ($mediaId !== null) {

//         $mediaId = trim(
//             (string) $this->resolve(
//                 (string) $mediaId,
//                 $variables
//             )
//         );

//         if ($mediaId === '') {
//             $mediaId = null;
//         }
//     }

//     // =======================================================
//     // MEDIA NAME
//     // =======================================================

//     $mediaName = $cfg['mediaName']
//         ?? $cfg['media_name']
//         ?? '';

//     $mediaName = trim(
//         (string) $this->resolve(
//             (string) $mediaName,
//             $variables
//         )
//     );

//     // =======================================================
//     // FILE NAME
//     // =======================================================

//     $fileName = $cfg['fileName']
//         ?? $cfg['file_name']
//         ?? $cfg['mediaFilename']
//         ?? $cfg['media_filename']
//         ?? $mediaName
//         ?? '';

//     $fileName = trim(
//         (string) $this->resolve(
//             (string) $fileName,
//             $variables
//         )
//     );

//     // =======================================================
//     // MIME TYPE
//     // =======================================================

//     $mediaMimeType = $cfg['mediaMimeType']
//         ?? $cfg['media_mime_type']
//         ?? $cfg['mimeType']
//         ?? $cfg['mime_type']
//         ?? '';

//     $mediaMimeType = trim(
//         (string) $this->resolve(
//             (string) $mediaMimeType,
//             $variables
//         )
//     );

//     // =======================================================
//     // CAPTION
//     // =======================================================

//     $caption = $cfg['caption']
//         ?? $cfg['mediaCaption']
//         ?? $cfg['media_caption']
//         ?? '';

//     $caption = trim(
//         (string) $this->resolve(
//             (string) $caption,
//             $variables
//         )
//     );

//     // =======================================================
//     // MEDIA BODY / MESSAGE
//     // =======================================================

//     $body = $cfg['body']
//         ?? $cfg['message']
//         ?? $cfg['text']
//         ?? $cfg['mediaBody']
//         ?? '';

//     $body = trim(
//         (string) $this->resolve(
//             (string) $body,
//             $variables
//         )
//     );

//     // =======================================================
//     // INTERACTIVE FOOTER
//     // =======================================================

//     $footer = $cfg['footer']
//         ?? $cfg['mediaFooter']
//         ?? '';

//     $footer = trim(
//         (string) $this->resolve(
//             (string) $footer,
//             $variables
//         )
//     );

//     // =======================================================
//     // BUTTONS
//     // =======================================================

//     $buttons = $cfg['buttons']
//         ?? $cfg['options']
//         ?? $cfg['mediaButtons']
//         ?? [];

//     if (is_string($buttons)) {
//         $buttons = json_decode($buttons, true) ?? [];
//     }

//     if (!is_array($buttons)) {
//         $buttons = [];
//     }

//     // Maximum 3 WhatsApp buttons
//     $buttons = array_slice($buttons, 0, 3);

//     // =======================================================
//     // RESOLVE BUTTON VARIABLES
//     // =======================================================

//     $resolvedButtons = [];

//     foreach ($buttons as $index => $button) {

//         if (!is_array($button)) {
//             continue;
//         }

//         $buttonId = $button['id']
//             ?? $button['source_handle']
//             ?? $button['sourceHandle']
//             ?? 'source-option-' . $index;

//         $buttonTitle = $button['title']
//             ?? $button['label']
//             ?? $button['text']
//             ?? 'Option ' . ($index + 1);

//         $buttonId = trim(
//             (string) $this->resolve(
//                 (string) $buttonId,
//                 $variables
//             )
//         );

//         $buttonTitle = trim(
//             (string) $this->resolve(
//                 (string) $buttonTitle,
//                 $variables
//             )
//         );

//         if ($buttonId === '') {
//             $buttonId = 'source-option-' . $index;
//         }

//         if ($buttonTitle === '') {
//             continue;
//         }

//         $resolvedButtons[] = [
//             'id' => $buttonId,
//             'title' => $buttonTitle,
//         ];
//     }

//     $buttons = array_slice($resolvedButtons, 0, 3);

//     // =======================================================
//     // ALLOWED MEDIA TYPES
//     // =======================================================

//     $allowedMediaTypes = [
//         'image',
//         'document',
//         'audio',
//         'video',
//     ];

//     if (!in_array($mediaType, $allowedMediaTypes, true)) {

//         Log::warning(
//             'MEDIA NODE UNSUPPORTED TYPE',
//             [
//                 'workflow_id' => $workflow->id ?? null,
//                 'node_id' => $node->id ?? null,
//                 'media_type' => $mediaType,
//             ]
//         );

//         $errorMessage = '⚠️ Unsupported media type.';

//         try {

//             $errorResponse = $this->whatsapp->sendText(
//                 $session->user_identifier,
//                 $errorMessage
//             );

//         } catch (\Throwable $e) {

//             $errorResponse = [
//                 'success' => false,
//                 'error' => $e->getMessage(),
//             ];
//         }

//         if (!is_array($errorResponse)) {
//             $errorResponse = [
//                 'success' => false,
//                 'response' => $errorResponse,
//             ];
//         }

//         $this->saveOutbound(
//             $session,
//             'text',
//             $errorMessage,
//             $errorResponse
//         );

//         return;
//     }

//     // =======================================================
//     // MEDIA URL VALIDATION
//     // =======================================================

//     if ($mediaUrl === '') {

//         Log::warning(
//             'MEDIA NODE MEDIA URL MISSING',
//             [
//                 'workflow_id' => $workflow->id ?? null,
//                 'node_id' => $node->id ?? null,
//                 'media_type' => $mediaType,
//                 'media_id' => $mediaId,
//                 'media_name' => $mediaName,
//                 'config' => $cfg,
//             ]
//         );
//             // DEBUG LOG
//             \Log::info('MEDIA NODE CONFIG DEBUG', [
//                 'node_id' => $nodeId,
//                 'config' => $cfg,
//                 'variables' => $session->variables ?? [],
//             ]);

//         $errorMessage = '⚠️ Media could not be sent. Media URL is missing.';

//         try {

//             $errorResponse = $this->whatsapp->sendText(
//                 $session->user_identifier,
//                 $errorMessage
//             );

//         } catch (\Throwable $e) {

//             $errorResponse = [
//                 'success' => false,
//                 'error' => $e->getMessage(),
//             ];
//         }

//         if (!is_array($errorResponse)) {
//             $errorResponse = [
//                 'success' => false,
//                 'response' => $errorResponse,
//             ];
//         }

//         $this->saveOutbound(
//             $session,
//             'text',
//             $errorMessage,
//             $errorResponse
//         );

//         return;
//     }

//     // =======================================================
//     // SEND MEDIA
//     // =======================================================

//     try {

//         // MEDIA CAPTION FALLBACK
//         $caption = trim(
//             (string) (
//                 !empty($caption)
//                     ? $caption
//                     : ($body ?? '')
//             )
//         );



//         $response = [
//             'success' => false,
//             'error' => 'Media send was not executed.',
//         ];

//         // ===================================================
//         // AUDIO
//         // ===================================================

//         if ($mediaType === 'audio') {

//             $response = $this->whatsapp->sendAudio(
//                 $session->user_identifier,
//                 $mediaUrl
//             );
//         }

//         // ===================================================
//         // IMAGE / VIDEO / DOCUMENT WITH BUTTONS
//         // ===================================================

//         elseif (
//             !empty($buttons)
//             &&
//             in_array(
//                 $mediaType,
//                 ['image', 'video', 'document'],
//                 true
//             )
//         ) {

//             $response = $this->whatsapp->sendInteractiveWithMedia(
//                 $session->user_identifier,
//                 $mediaType,
//                 $mediaUrl,
//                 $caption,
//                 $buttons,
//                 $footer,
//                 $fileName
//             );


//         }

//         // ===================================================
//         // NORMAL IMAGE
//         // ===================================================

//         elseif ($mediaType === 'image') {

//             $response = $this->whatsapp->sendImage(
//                 $session->user_identifier,
//                 $mediaUrl,
//                 $caption
//             );
//         }

//         // ===================================================
//         // NORMAL DOCUMENT
//         // ===================================================

//         elseif ($mediaType === 'document') {

//             $response = $this->whatsapp->sendDocument(
//                 $session->user_identifier,
//                 $mediaUrl,
//                 $fileName,
//                 $caption
//             );
//         }

//         // ===================================================
//         // NORMAL VIDEO
//         // ===================================================

//         elseif ($mediaType === 'video') {

//             $response = $this->whatsapp->sendVideo(
//                 $session->user_identifier,
//                 $mediaUrl,
//                 $caption
//             );
//         }

//         // ===================================================
//         // NORMALIZE MEDIA RESPONSE
//         // ===================================================

//         if (!is_array($response)) {

//             $response = [
//                 'success' => false,
//                 'response' => $response,
//             ];
//         }

//         // ===================================================
//         // CHECK PROVIDER SUCCESS
//         // ===================================================

//         $sendSuccess = (bool) data_get($response, 'success', false);

//         $externalMid = data_get($response, 'data.mid')
//             ?? data_get($response, 'data.messages.0.id')
//             ?? data_get($response, 'data.message_id')
//             ?? data_get($response, 'data.id');

//         if (!$sendSuccess || !$externalMid) {

//             Log::error(
//                 'MEDIA SEND FAILED OR MID MISSING',
//                 [
//                     'workflow_id' => $workflow->id ?? null,
//                     'node_id' => $node->id ?? null,
//                     'media_type' => $mediaType,
//                     'success' => $sendSuccess,
//                     'mid' => $externalMid,
//                     'response' => $response,
//                 ]
//             );

//             // Save failed/accepted-without-MID record.
//             // Never advance the workflow without a MID.
//             $this->saveOutbound(
//                 $session,
//                 $mediaType,
//                 $mediaUrl,
//                 $response
//             );

//             return;
//         }

//         // ===================================================
//         // NEXT NODE
//         // ===================================================

//         $next = $this->nextNode(
//             $workflow,
//             $nodeId
//         );

//         // ===================================================
//         // SAVE MEDIA OUTBOUND WITH SEQUENCE
//         // ===================================================

//           $this->saveOutbound(
//             $session,
//             $mediaType,
//             $mediaUrl,
//             $response,
//             $next ? [
//                 'action' => 'continue',
//                 'workflow_id' => $workflow->id,
//                 'node_id' => $nodeId,
//                 'next_node_id' => $next,
//                 'input' => [],
//             ] : null
//         );

//         // ===================================================
//         // WAIT FOR DELIVERY WEBHOOK
//         // ===================================================

//         // Do not call goToNode() here.
//         // Delivery webhook will execute the next node
//         // after matching MID gets delivered/read.

//       $session->update([
//                 'current_node_id' => $next ? $nodeId : null,
//                 'status' => $next ? 'waiting' : 'completed',
//                 'last_message_at' => now(),
//             ]);

//         return;

//     } catch (\Throwable $e) {

//         // ===================================================
//         // MEDIA SEND ERROR
//         // ===================================================

//         Log::error(
//             'NORMAL MEDIA NODE ERROR',
//             [
//                 'workflow_id' => $workflow->id ?? null,
//                 'node_id' => $node->id ?? null,
//                 'node_type' => $node->node_type ?? null,
//                 'media_type' => $mediaType,
//                 'media_url' => $mediaUrl,
//                 'media_id' => $mediaId,
//                 'file_name' => $fileName,
//                 'error' => $e->getMessage(),
//                 'line' => $e->getLine(),
//                 'file' => $e->getFile(),
//             ]
//         );

//         $errorMessage = '⚠️ Unable to send media.';

//         try {

//             $errorResponse = $this->whatsapp->sendText(
//                 $session->user_identifier,
//                 $errorMessage
//             );

//         } catch (\Throwable $sendError) {

//             Log::error(
//                 'MEDIA ERROR MESSAGE SEND FAILED',
//                 [
//                     'workflow_id' => $workflow->id ?? null,
//                     'node_id' => $node->id ?? null,
//                     'error' => $sendError->getMessage(),
//                 ]
//             );

//             $errorResponse = [
//                 'success' => false,
//                 'error' => $sendError->getMessage(),
//             ];
//         }

//         // ===================================================
//         // NORMALIZE ERROR RESPONSE
//         // ===================================================

//         if (!is_array($errorResponse)) {

//             $errorResponse = [
//                 'success' => false,
//                 'response' => $errorResponse,
//             ];
//         }

//         // ===================================================
//         // SAVE ERROR OUTBOUND
//         // ===================================================

//         $this->saveOutbound(
//             $session,
//             'text',
//             $errorMessage,
//             $errorResponse
//         );

//         return;
//     }
// }



elseif ($type === 'media') {

    $cfg = $node->configuration ?? [];

    // =======================================================
    // RAW NODE DEBUG
    // =======================================================

    Log::warning(
        'MEDIA NODE RAW NODE DEBUG',
        [
            'node_id' => $node->id ?? null,
            'node_type' => $node->node_type ?? null,
            'raw_config' => $node->configuration ?? null,
            'raw_attributes' => method_exists($node, 'getAttributes')
                ? $node->getAttributes()
                : null,
        ]
    );

    // =======================================================
    // DECODE CONFIGURATION
    // =======================================================

    if (is_string($cfg)) {
        $cfg = json_decode($cfg, true) ?? [];
    }

    if (!is_array($cfg)) {
        $cfg = [];
    }

    // =======================================================
    // SESSION VARIABLES
    // =======================================================

    $variables = $session->variables ?? [];

    if (is_string($variables)) {
        $variables = json_decode($variables, true) ?? [];
    }

    if (!is_array($variables)) {
        $variables = [];
    }

    // =======================================================
    // MEDIA TYPE
    // =======================================================

    $mediaType = $cfg['mediaType']
        ?? $cfg['media_type']
        ?? 'image';

    $mediaType = strtolower(trim((string) $mediaType));

    // PDF = DOCUMENT
    if ($mediaType === 'pdf') {
        $mediaType = 'document';
    }

    // =======================================================
    // MEDIA URL
    // =======================================================

    $mediaUrl = $cfg['mediaUrl']
        ?? $cfg['media_url']
        ?? $cfg['url']
        ?? '';

    $mediaUrl = trim(
        (string) $this->resolve(
            (string) $mediaUrl,
            $variables
        )
    );

    // =======================================================
    // MEDIA ID
    // =======================================================

    $mediaId = $cfg['mediaId']
        ?? $cfg['media_id']
        ?? null;

    if ($mediaId !== null) {

        $mediaId = trim(
            (string) $this->resolve(
                (string) $mediaId,
                $variables
            )
        );

        if ($mediaId === '') {
            $mediaId = null;
        }
    }

    // =======================================================
    // MEDIA NAME
    // =======================================================

    $mediaName = $cfg['mediaName']
        ?? $cfg['media_name']
        ?? '';

    $mediaName = trim(
        (string) $this->resolve(
            (string) $mediaName,
            $variables
        )
    );

    // =======================================================
    // FILE NAME
    // =======================================================

    $fileName = $cfg['fileName']
        ?? $cfg['file_name']
        ?? $cfg['mediaFilename']
        ?? $cfg['media_filename']
        ?? $mediaName
        ?? '';

    $fileName = trim(
        (string) $this->resolve(
            (string) $fileName,
            $variables
        )
    );

    // =======================================================
    // MIME TYPE
    // =======================================================

    $mediaMimeType = $cfg['mediaMimeType']
        ?? $cfg['media_mime_type']
        ?? $cfg['mimeType']
        ?? $cfg['mime_type']
        ?? '';

    $mediaMimeType = trim(
        (string) $this->resolve(
            (string) $mediaMimeType,
            $variables
        )
    );

    // =======================================================
    // CAPTION
    // =======================================================

    $caption = $cfg['caption']
        ?? $cfg['mediaCaption']
        ?? $cfg['media_caption']
        ?? '';

    $caption = trim(
        (string) $this->resolve(
            (string) $caption,
            $variables
        )
    );

    // =======================================================
    // MEDIA BODY / MESSAGE
    // =======================================================

    $body = $cfg['body']
        ?? $cfg['message']
        ?? $cfg['text']
        ?? $cfg['mediaBody']
        ?? '';

    $body = trim(
        (string) $this->resolve(
            (string) $body,
            $variables
        )
    );

    // =======================================================
    // INTERACTIVE FOOTER
    // =======================================================

    $footer = $cfg['footer']
        ?? $cfg['mediaFooter']
        ?? '';

    $footer = trim(
        (string) $this->resolve(
            (string) $footer,
            $variables
        )
    );

    // =======================================================
    // BUTTONS
    // =======================================================

    $buttons = $cfg['buttons']
        ?? $cfg['options']
        ?? $cfg['mediaButtons']
        ?? [];

    if (is_string($buttons)) {
        $buttons = json_decode($buttons, true) ?? [];
    }

    if (!is_array($buttons)) {
        $buttons = [];
    }

    // Maximum 3 WhatsApp buttons
    $buttons = array_slice($buttons, 0, 3);

    // =======================================================
    // RESOLVE BUTTON VARIABLES
    // =======================================================

    $resolvedButtons = [];

    foreach ($buttons as $index => $button) {

        if (!is_array($button)) {
            continue;
        }

        $buttonId = $button['id']
            ?? $button['source_handle']
            ?? $button['sourceHandle']
            ?? 'source-option-' . $index;

        $buttonTitle = $button['title']
            ?? $button['label']
            ?? $button['text']
            ?? 'Option ' . ($index + 1);

        $buttonId = trim(
            (string) $this->resolve(
                (string) $buttonId,
                $variables
            )
        );

        $buttonTitle = trim(
            (string) $this->resolve(
                (string) $buttonTitle,
                $variables
            )
        );

        if ($buttonId === '') {
            $buttonId = 'source-option-' . $index;
        }

        if ($buttonTitle === '') {
            continue;
        }

        $resolvedButtons[] = [
            'id' => $buttonId,
            'title' => $buttonTitle,
        ];
    }

    $buttons = array_slice($resolvedButtons, 0, 3);

    // =======================================================
    // ALLOWED MEDIA TYPES
    // =======================================================

    $allowedMediaTypes = [
        'image',
        'document',
        'audio',
        'video',
    ];

    if (!in_array($mediaType, $allowedMediaTypes, true)) {

        Log::warning(
            'MEDIA NODE UNSUPPORTED TYPE',
            [
                'workflow_id' => $workflow->id ?? null,
                'node_id' => $node->id ?? null,
                'media_type' => $mediaType,
            ]
        );

        $errorMessage = '⚠️ Unsupported media type.';

        try {

            $errorResponse = $this->whatsapp->sendText(
                $session->user_identifier,
                $errorMessage
            );

        } catch (\Throwable $e) {

            $errorResponse = [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }

        if (!is_array($errorResponse)) {
            $errorResponse = [
                'success' => false,
                'response' => $errorResponse,
            ];
        }

        $this->saveOutbound(
            $session,
            'text',
            $errorMessage,
            $errorResponse
        );

        return;
    }

    // =======================================================
    // MEDIA URL VALIDATION
    // =======================================================

    if ($mediaUrl === '') {

        Log::warning(
            'MEDIA NODE MEDIA URL MISSING',
            [
                'workflow_id' => $workflow->id ?? null,
                'node_id' => $node->id ?? null,
                'media_type' => $mediaType,
                'media_id' => $mediaId,
                'media_name' => $mediaName,
                'config' => $cfg,
            ]
        );
            // DEBUG LOG
            \Log::info('MEDIA NODE CONFIG DEBUG', [
                'node_id' => $nodeId,
                'config' => $cfg,
                'variables' => $session->variables ?? [],
            ]);

        $errorMessage = '⚠️ Media could not be sent. Media URL is missing.';

        try {

            $errorResponse = $this->whatsapp->sendText(
                $session->user_identifier,
                $errorMessage
            );

        } catch (\Throwable $e) {

            $errorResponse = [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }

        if (!is_array($errorResponse)) {
            $errorResponse = [
                'success' => false,
                'response' => $errorResponse,
            ];
        }

        $this->saveOutbound(
            $session,
            'text',
            $errorMessage,
            $errorResponse
        );

        return;
    }

    // =======================================================
    // SEND MEDIA
    // =======================================================

    try {

        // MEDIA CAPTION FALLBACK
        $caption = trim(
            (string) (
                !empty($caption)
                    ? $caption
                    : ($body ?? '')
            )
        );



        $response = [
            'success' => false,
            'error' => 'Media send was not executed.',
        ];

        // ===================================================
        // AUDIO
        // ===================================================

        if ($mediaType === 'audio') {

            $response = $this->whatsapp->sendAudio(
                $session->user_identifier,
                $mediaUrl
            );
        }

        // ===================================================
        // IMAGE / VIDEO / DOCUMENT WITH BUTTONS
        // ===================================================

        elseif (
            !empty($buttons)
            &&
            in_array(
                $mediaType,
                ['image', 'video', 'document'],
                true
            )
        ) {

            $response = $this->whatsapp->sendInteractiveWithMedia(
                $session->user_identifier,
                $mediaType,
                $mediaUrl,
                $caption,
                $buttons,
                $footer,
                $fileName
            );


        }

        // ===================================================
        // NORMAL IMAGE
        // ===================================================

        elseif ($mediaType === 'image') {

            $response = $this->whatsapp->sendImage(
                $session->user_identifier,
                $mediaUrl,
                $caption
            );
        }

        // ===================================================
        // NORMAL DOCUMENT
        // ===================================================

        elseif ($mediaType === 'document') {

            $response = $this->whatsapp->sendDocument(
                $session->user_identifier,
                $mediaUrl,
                $fileName,
                $caption
            );
        }

        // ===================================================
        // NORMAL VIDEO
        // ===================================================

        elseif ($mediaType === 'video') {

            $response = $this->whatsapp->sendVideo(
                $session->user_identifier,
                $mediaUrl,
                $caption
            );
        }

        // ===================================================
        // NORMALIZE MEDIA RESPONSE
        // ===================================================

        if (!is_array($response)) {

            $response = [
                'success' => false,
                'response' => $response,
            ];
        }

        // ===================================================
        // CHECK PROVIDER SUCCESS
        // ===================================================

        $sendSuccess = (bool) data_get($response, 'success', false);

        $externalMid = data_get($response, 'data.mid')
            ?? data_get($response, 'data.messages.0.id')
            ?? data_get($response, 'data.message_id')
            ?? data_get($response, 'data.id');

        if (!$sendSuccess || !$externalMid) {

            Log::error(
                'MEDIA SEND FAILED OR MID MISSING',
                [
                    'workflow_id' => $workflow->id ?? null,
                    'node_id' => $node->id ?? null,
                    'media_type' => $mediaType,
                    'success' => $sendSuccess,
                    'mid' => $externalMid,
                    'response' => $response,
                ]
            );

            // Save failed/accepted-without-MID record.
            // Never advance the workflow without a MID.
            $this->saveOutbound(
                $session,
                $mediaType,
                $mediaUrl,
                $response
            );

            return;
        }

        // ===================================================
        // NEXT NODE
        // ===================================================

        $next = $this->nextNode(
            $workflow,
            $nodeId
        );

        \Log::info('MEDIA NODE NEXT DEBUG', [
            'workflow_id' => $workflow->id,
            'current_node_id' => $nodeId,
            'next_node_id' => $next,
            'input' => $input,
            'session_id' => $session->id,
        ]);

        // ===================================================
        // SAVE MEDIA OUTBOUND WITH SEQUENCE
        // ===================================================

          $this->saveOutbound(
            $session,
            $mediaType,
            $mediaUrl,
            $response,
            $next ? [
                'action' => 'continue',
                'workflow_id' => $workflow->id,
                'node_id' => $nodeId,
                'next_node_id' => $next,
                'input' => [],
            ] : null
        );


      $session->update([
                'current_node_id' => $next ? $nodeId : null,
                'status' => $next ? 'waiting' : 'completed',
                'last_message_at' => now(),
            ]);

        return;

    } catch (\Throwable $e) {

        // ===================================================
        // MEDIA SEND ERROR
        // ===================================================

        Log::error(
            'NORMAL MEDIA NODE ERROR',
            [
                'workflow_id' => $workflow->id ?? null,
                'node_id' => $node->id ?? null,
                'node_type' => $node->node_type ?? null,
                'media_type' => $mediaType,
                'media_url' => $mediaUrl,
                'media_id' => $mediaId,
                'file_name' => $fileName,
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]
        );

        $errorMessage = '⚠️ Unable to send media.';

        try {

            $errorResponse = $this->whatsapp->sendText(
                $session->user_identifier,
                $errorMessage
            );

        } catch (\Throwable $sendError) {

            Log::error(
                'MEDIA ERROR MESSAGE SEND FAILED',
                [
                    'workflow_id' => $workflow->id ?? null,
                    'node_id' => $node->id ?? null,
                    'error' => $sendError->getMessage(),
                ]
            );

            $errorResponse = [
                'success' => false,
                'error' => $sendError->getMessage(),
            ];
        }

        // ===================================================
        // NORMALIZE ERROR RESPONSE
        // ===================================================

        if (!is_array($errorResponse)) {

            $errorResponse = [
                'success' => false,
                'response' => $errorResponse,
            ];
        }

        // ===================================================
        // SAVE ERROR OUTBOUND
        // ===================================================

        $this->saveOutbound(
            $session,
            'text',
            $errorMessage,
            $errorResponse
        );

        return;
    }
}


// elseif ($type === 'media') {

//     $cfg = $node->configuration ?? [];

//     // =======================================================
//     // DECODE CONFIGURATION
//     // =======================================================

//     if (is_string($cfg)) {
//         $cfg = json_decode($cfg, true) ?? [];
//     }

//     if (!is_array($cfg)) {
//         $cfg = [];
//     }

//     // =======================================================
//     // SESSION VARIABLES
//     // =======================================================

//     $variables = $session->variables ?? [];

//     if (is_string($variables)) {
//         $variables = json_decode($variables, true) ?? [];
//     }

//     if (!is_array($variables)) {
//         $variables = [];
//     }

//     // =======================================================
//     // MEDIA TYPE
//     // =======================================================

//     $mediaType = strtolower(trim((string) (
//         $cfg['mediaType']
//         ?? $cfg['media_type']
//         ?? 'image'
//     )));

//     if ($mediaType === 'pdf') {
//         $mediaType = 'document';
//     }

//     // =======================================================
//     // MEDIA URL
//     // =======================================================

//     $mediaUrl = $cfg['mediaUrl']
//         ?? $cfg['media_url']
//         ?? $cfg['url']
//         ?? '';

//     $mediaUrl = trim((string) $this->resolve(
//         (string) $mediaUrl,
//         $variables
//     ));

//     // =======================================================
//     // MEDIA ID
//     // =======================================================

//     $mediaId = $cfg['mediaId']
//         ?? $cfg['media_id']
//         ?? null;

//     if ($mediaId !== null) {
//         $mediaId = trim((string) $this->resolve(
//             (string) $mediaId,
//             $variables
//         ));

//         if ($mediaId === '') {
//             $mediaId = null;
//         }
//     }

//     // =======================================================
//     // MEDIA NAME
//     // =======================================================

//     $mediaName = $cfg['mediaName']
//         ?? $cfg['media_name']
//         ?? '';

//     $mediaName = trim((string) $this->resolve(
//         (string) $mediaName,
//         $variables
//     ));

//     // =======================================================
//     // FILE NAME
//     // =======================================================

//     $fileName = $cfg['fileName']
//         ?? $cfg['file_name']
//         ?? $cfg['mediaFilename']
//         ?? $cfg['media_filename']
//         ?? $mediaName
//         ?? '';

//     $fileName = trim((string) $this->resolve(
//         (string) $fileName,
//         $variables
//     ));

//     // =======================================================
//     // MIME TYPE
//     // =======================================================

//     $mediaMimeType = $cfg['mediaMimeType']
//         ?? $cfg['media_mime_type']
//         ?? $cfg['mimeType']
//         ?? $cfg['mime_type']
//         ?? '';

//     $mediaMimeType = trim((string) $this->resolve(
//         (string) $mediaMimeType,
//         $variables
//     ));

//     // =======================================================
//     // CAPTION
//     // =======================================================

//     $caption = $cfg['caption']
//         ?? $cfg['mediaCaption']
//         ?? $cfg['media_caption']
//         ?? '';

//     $caption = trim((string) $this->resolve(
//         (string) $caption,
//         $variables
//     ));

//     // =======================================================
//     // MEDIA BODY
//     // =======================================================

//     $body = $cfg['body']
//         ?? $cfg['message']
//         ?? $cfg['text']
//         ?? $cfg['mediaBody']
//         ?? '';

//     $body = trim((string) $this->resolve(
//         (string) $body,
//         $variables
//     ));

//     // =======================================================
//     // FOOTER
//     // =======================================================

//     $footer = $cfg['footer']
//         ?? $cfg['mediaFooter']
//         ?? '';

//     $footer = trim((string) $this->resolve(
//         (string) $footer,
//         $variables
//     ));

//     // =======================================================
//     // BUTTONS
//     // =======================================================

//     $buttons = $cfg['buttons']
//         ?? $cfg['options']
//         ?? $cfg['mediaButtons']
//         ?? [];

//     if (is_string($buttons)) {
//         $buttons = json_decode($buttons, true) ?? [];
//     }

//     if (!is_array($buttons)) {
//         $buttons = [];
//     }

//     $buttons = array_slice($buttons, 0, 3);

//     $resolvedButtons = [];

//     foreach ($buttons as $index => $button) {

//         if (!is_array($button)) {
//             continue;
//         }

//         $buttonId = $button['id']
//             ?? $button['source_handle']
//             ?? $button['sourceHandle']
//             ?? 'source-option-' . $index;

//         $buttonTitle = $button['title']
//             ?? $button['label']
//             ?? $button['text']
//             ?? 'Option ' . ($index + 1);

//         $buttonId = trim((string) $this->resolve(
//             (string) $buttonId,
//             $variables
//         ));

//         $buttonTitle = trim((string) $this->resolve(
//             (string) $buttonTitle,
//             $variables
//         ));

//         if ($buttonId === '') {
//             $buttonId = 'source-option-' . $index;
//         }

//         if ($buttonTitle === '') {
//             continue;
//         }

//         $resolvedButtons[] = [
//             'id' => $buttonId,
//             'title' => $buttonTitle,
//         ];
//     }

//     $buttons = array_slice($resolvedButtons, 0, 3);

//     // =======================================================
//     // VALIDATE MEDIA TYPE
//     // =======================================================

//     $allowedMediaTypes = [
//         'image',
//         'document',
//         'audio',
//         'video',
//     ];

//     if (!in_array($mediaType, $allowedMediaTypes, true)) {

//         Log::warning('MEDIA NODE UNSUPPORTED TYPE', [
//             'workflow_id' => $workflow->id ?? null,
//             'node_id' => $nodeId,
//             'media_type' => $mediaType,
//         ]);

//         $errorMessage = '⚠️ Unsupported media type.';

//         $errorResponse = $this->whatsapp->sendText(
//             $session->user_identifier,
//             $errorMessage
//         );

//         if (!is_array($errorResponse)) {
//             $errorResponse = [
//                 'success' => false,
//                 'response' => $errorResponse,
//             ];
//         }

//         $this->saveOutbound(
//             $session,
//             'text',
//             $errorMessage,
//             $errorResponse
//         );

//         return;
//     }

//     // =======================================================
//     // VALIDATE MEDIA URL
//     // =======================================================

//     if ($mediaUrl === '') {

//         Log::warning('MEDIA NODE MEDIA URL MISSING', [
//             'workflow_id' => $workflow->id ?? null,
//             'node_id' => $nodeId,
//             'config' => $cfg,
//             'variables' => $variables,
//         ]);

//         $errorMessage = '⚠️ Media could not be sent. Media URL is missing.';

//         $errorResponse = $this->whatsapp->sendText(
//             $session->user_identifier,
//             $errorMessage
//         );

//         if (!is_array($errorResponse)) {
//             $errorResponse = [
//                 'success' => false,
//                 'response' => $errorResponse,
//             ];
//         }

//         $this->saveOutbound(
//             $session,
//             'text',
//             $errorMessage,
//             $errorResponse
//         );

//         return;
//     }

//     // =======================================================
//     // SEND MEDIA
//     // =======================================================

//     try {

//         // Caption fallback to Media Body
//         if ($caption === '') {
//             $caption = $body;
//         }

//         $response = [
//             'success' => false,
//             'error' => 'Media send was not executed.',
//         ];

//         // ===================================================
//         // AUDIO
//         // ===================================================

//         if ($mediaType === 'audio') {

//             $response = $this->whatsapp->sendAudio(
//                 $session->user_identifier,
//                 $mediaUrl
//             );
//         }

//         // ===================================================
//         // INTERACTIVE MEDIA WITH BUTTONS
//         // ===================================================

//         elseif (
//             !empty($buttons)
//             && in_array(
//                 $mediaType,
//                 ['image', 'video', 'document'],
//                 true
//             )
//         ) {

//             $response = $this->whatsapp->sendInteractiveWithMedia(
//                 $session->user_identifier,
//                 $mediaType,
//                 $mediaUrl,
//                 $caption,
//                 $buttons,
//                 $footer,
//                 $fileName
//             );
//         }

//         // ===================================================
//         // NORMAL IMAGE
//         // ===================================================

//         elseif ($mediaType === 'image') {

//             $response = $this->whatsapp->sendImage(
//                 $session->user_identifier,
//                 $mediaUrl,
//                 $caption
//             );
//         }

//         // ===================================================
//         // NORMAL DOCUMENT
//         // ===================================================

//         elseif ($mediaType === 'document') {

//             $response = $this->whatsapp->sendDocument(
//                 $session->user_identifier,
//                 $mediaUrl,
//                 $fileName,
//                 $caption
//             );
//         }

//         // ===================================================
//         // NORMAL VIDEO
//         // ===================================================

//         elseif ($mediaType === 'video') {

//             $response = $this->whatsapp->sendVideo(
//                 $session->user_identifier,
//                 $mediaUrl,
//                 $caption
//             );
//         }

//         // ===================================================
//         // NORMALIZE RESPONSE
//         // ===================================================

//         if (!is_array($response)) {
//             $response = [
//                 'success' => false,
//                 'response' => $response,
//             ];
//         }

//         $sendSuccess = (bool) data_get(
//             $response,
//             'success',
//             false
//         );

//         $externalMid = data_get($response, 'data.mid')
//             ?? data_get($response, 'data.messages.0.id')
//             ?? data_get($response, 'data.message_id')
//             ?? data_get($response, 'data.id');

//         Log::info('MEDIA SEND RESPONSE DEBUG', [
//             'workflow_id' => $workflow->id ?? null,
//             'session_id' => $session->id,
//             'node_id' => $nodeId,
//             'media_type' => $mediaType,
//             'success' => $sendSuccess,
//             'mid' => $externalMid,
//             'response' => $response,
//         ]);

//         // ===================================================
//         // IF MEDIA SEND FAILED, STOP
//         // ===================================================

//         if (!$sendSuccess) {

//             Log::error('MEDIA SEND FAILED', [
//                 'workflow_id' => $workflow->id ?? null,
//                 'session_id' => $session->id,
//                 'node_id' => $nodeId,
//                 'response' => $response,
//             ]);

//             $this->saveOutbound(
//                 $session,
//                 $mediaType,
//                 $mediaUrl,
//                 $response,
//                 null
//             );

//             return;
//         }

//         // ===================================================
//         // FIND NEXT NODE
//         // ===================================================

//         $next = $this->nextNode(
//             $workflow,
//             $nodeId
//         );

//         Log::info('MEDIA NODE NEXT NODE CHECK', [
//             'workflow_id' => $workflow->id,
//             'session_id' => $session->id,
//             'current_node_id' => $nodeId,
//             'next_node_id' => $next,
//         ]);

//         // ===================================================
//         // SAVE OUTBOUND
//         // Do not wait for delivery webhook
//         // ===================================================

//         $this->saveOutbound(
//             $session,
//             $mediaType,
//             $mediaUrl,
//             $response,
//             null
//         );

//         // ===================================================
//         // EXECUTE NEXT NODE IMMEDIATELY
//         // ===================================================

//         if ($next) {

//             Log::info('MEDIA NODE EXECUTING NEXT NODE', [
//                 'workflow_id' => $workflow->id,
//                 'session_id' => $session->id,
//                 'media_node_id' => $nodeId,
//                 'next_node_id' => $next,
//                 'media_mid' => $externalMid,
//             ]);

//             $this->goToNode(
//                 $workflow,
//                 $session,
//                 $next,
//                 []
//             );

//         } else {

//             Log::warning('MEDIA NODE NEXT NODE NOT FOUND', [
//                 'workflow_id' => $workflow->id,
//                 'session_id' => $session->id,
//                 'node_id' => $nodeId,
//             ]);

//             $session->update([
//                 'current_node_id' => $nodeId,
//                 'status' => 'completed',
//                 'last_message_at' => now(),
//             ]);
//         }

//         return;

//     } catch (\Throwable $e) {

//         // ===================================================
//         // MEDIA NODE ERROR
//         // ===================================================

//         Log::error('NORMAL MEDIA NODE ERROR', [
//             'workflow_id' => $workflow->id ?? null,
//             'session_id' => $session->id ?? null,
//             'node_id' => $nodeId ?? null,
//             'media_type' => $mediaType ?? null,
//             'media_url' => $mediaUrl ?? null,
//             'media_id' => $mediaId ?? null,
//             'file_name' => $fileName ?? null,
//             'error' => $e->getMessage(),
//             'line' => $e->getLine(),
//             'file' => $e->getFile(),
//         ]);

//         $errorMessage = '⚠️ Unable to send media.';

//         try {

//             $errorResponse = $this->whatsapp->sendText(
//                 $session->user_identifier,
//                 $errorMessage
//             );

//         } catch (\Throwable $sendError) {

//             Log::error('MEDIA ERROR MESSAGE SEND FAILED', [
//                 'workflow_id' => $workflow->id ?? null,
//                 'node_id' => $nodeId ?? null,
//                 'error' => $sendError->getMessage(),
//             ]);

//             $errorResponse = [
//                 'success' => false,
//                 'error' => $sendError->getMessage(),
//             ];
//         }

//         if (!is_array($errorResponse)) {
//             $errorResponse = [
//                 'success' => false,
//                 'response' => $errorResponse,
//             ];
//         }

//         $this->saveOutbound(
//             $session,
//             'text',
//             $errorMessage,
//             $errorResponse
//         );

//         return;
//     }
// }

elseif ($type === 'video') {

    $mediaUrl = $this->resolveMediaUrl(
        $cfg,
        $workflow
    );

    $caption = $cfg['caption']
        ?? $cfg['message']
        ?? $cfg['text']
        ?? '';

    $mediaUrl = trim(
        (string) $this->resolve(
            (string) $mediaUrl,
            $session->variables ?? []
        )
    );

    $caption = trim(
        (string) $this->resolve(
            (string) $caption,
            $session->variables ?? []
        )
    );

    if ($mediaUrl === '') {

        throw new \RuntimeException(
            'Video media URL is empty.'
        );
    }

    // Send video
    $output = $this->whatsapp->sendVideo(
        $session->user_identifier,
        $mediaUrl,
        $caption
    );

    if (!is_array($output)) {
        $output = [
            'success' => false,
            'response' => $output,
        ];
    }

    // Verify provider response and MID
    $success = (bool) data_get($output, 'success', false);

    $messageId = data_get($output, 'data.mid')
        ?? data_get($output, 'data.messages.0.id')
        ?? data_get($output, 'data.message_id')
        ?? data_get($output, 'data.id');

    if (!$success || !$messageId) {

        Log::error('VIDEO SEND FAILED OR MID MISSING', [
            'workflow_id' => $workflow->id ?? null,
            'node_id' => $nodeId,
            'success' => $success,
            'mid' => $messageId,
            'response' => $output,
        ]);

        $this->saveOutbound(
            $session,
            'video',
            $caption !== '' ? $caption : null,
            $output
        );

        return;
    }

    // Find next node
    $next = $this->nextNode(
        $workflow,
        $nodeId
    );

    // Save outbound with continuation metadata
        $this->saveOutbound(
            $session,
            'video',
            $caption !== '' ? $caption : $mediaUrl,
            $output,
            $next ? [
                'action' => 'continue',
                'workflow_id' => $workflow->id,
                'node_id' => $nodeId,
                'next_node_id' => $next,
                'input' => [],
            ] : null
        );

    // Wait for delivery webhook.
    // Do not execute goToNode() here.

        $session->update([
            'current_node_id' => $next ? $nodeId : null,
            'status' => $next ? 'waiting' : 'completed',
            'last_message_at' => now(),
        ]);

    return;
}

elseif ($type === 'button') {

    /*
    |--------------------------------------------------------------------------
    | BUTTON CLICK RECEIVED
    |--------------------------------------------------------------------------
    */

    $sourceHandle = trim(
        (string) ($input['source_handle'] ?? '')
    );

    if ($sourceHandle !== '') {

        $next = $this->nextNode(
            $workflow,
            $nodeId,
            $sourceHandle
        );

        if ($next) {

           $this->goToNode(
                $workflow,
                $session,
                $next,
                []
            );

            return;
        }

        // Invalid button selection
        $validationMessage = $this->resolve(
            (string) (
                $cfg['validation_message']
                ?? $cfg['validationMessage']
                ?? '⚠️ This button is not available right now. Please select a valid option.'
            ),
            $session->variables ?? []
        );

        $output = $this->whatsapp->sendText(
            $session->user_identifier,
            $validationMessage
        );

        $this->saveOutbound(
            $session,
            'text',
            $validationMessage,
            $output
        );

        $session->update([
            'current_node_id' => $nodeId,
            'status' => 'waiting',
            'last_message_at' => now(),
        ]);

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | TEXT RECEIVED INSTEAD OF BUTTON CLICK
    |--------------------------------------------------------------------------
    */

    $typedText = trim(
        (string) ($input['text'] ?? '')
    );

    if ($typedText !== '') {

        $validationMessage = $this->resolve(
            (string) (
                $cfg['validation_message']
                ?? $cfg['validationMessage']
                ?? '⚠️ Please select one of the buttons above.'
            ),
            $session->variables ?? []
        );

        $output = $this->whatsapp->sendText(
            $session->user_identifier,
            $validationMessage
        );

        $this->saveOutbound(
            $session,
            'text',
            $validationMessage,
            $output
        );

        $session->update([
            'current_node_id' => $nodeId,
            'status' => 'waiting',
            'last_message_at' => now(),
        ]);

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | FIRST VISIT: SEND BUTTONS ONCE
    |--------------------------------------------------------------------------
    */

    $this->sendButton(
        $workflow,
        $session,
        (string) $nodeId,
        $cfg
    );

    $session->update([
        'current_node_id' => $nodeId,
        'status' => 'waiting',
        'last_message_at' => now(),
    ]);

    return;
}

elseif (
    $type === 'userInput'
    ||
    $type === 'input'
) {

    $variable = $cfg['variable']
        ?? $cfg['name']
        ?? 'last_input';

    /*
    |--------------------------------------------------------------------------
    | VALIDATION TYPE
    |--------------------------------------------------------------------------
    */

    $validationType = strtolower(trim((string) (
        $cfg['validation_type']
        ?? $cfg['validationType']
        ?? $cfg['validation']
        ?? $cfg['input_type']
        ?? $cfg['inputType']
        ?? ''
    )));

    $validationType = match ($validationType) {
        'mobile number',
        'mobile_number',
        'phone',
        'phone_number',
        'contact',
        'contact_number' => 'mobile',

        'email address' => 'email',
        'numeric' => 'number',

        'alphabets',
        'alphabets only',
        'alphabets_only',
        'alphabetsonly' => 'alpha',

        'alpha numeric',
        'alpha_numeric',
        'alpha-numeric' => 'alphanumeric',

        'custom regex',
        'custom_regex' => 'regex',

        default => $validationType,
    };

    /*
    |--------------------------------------------------------------------------
    | ALLOW SKIP
    |--------------------------------------------------------------------------
    */

    $rawAllowSkip = $cfg['allow_skip']
        ?? $cfg['allowSkip']
        ?? $cfg['skip']
        ?? $cfg['is_optional']
        ?? $cfg['optional']
        ?? false;

    if (is_bool($rawAllowSkip)) {
        $allowSkip = $rawAllowSkip;
    } elseif (is_numeric($rawAllowSkip)) {
        $allowSkip = ((int) $rawAllowSkip) === 1;
    } else {
        $allowSkip = in_array(
            strtolower(trim((string) $rawAllowSkip)),
            [
                '1',
                'true',
                'yes',
                'on',
                'enabled',
                'allow',
                'allowed',
            ],
            true
        );
    }

    /*
    |--------------------------------------------------------------------------
    | SKIP TEXT
    |--------------------------------------------------------------------------
    */

    $skipText = trim((string) (
        $cfg['skip_text']
        ?? $cfg['skipText']
        ?? $cfg['skip_value']
        ?? $cfg['skipValue']
        ?? 'skip'
    ));

    if ($skipText === '') {
        $skipText = 'skip';
    }

    /*
    |--------------------------------------------------------------------------
    | REQUIRED
    |--------------------------------------------------------------------------
    */

    $rawRequired = $cfg['required'] ?? true;

    if (is_bool($rawRequired)) {
        $required = $rawRequired;
    } elseif (is_numeric($rawRequired)) {
        $required = ((int) $rawRequired) === 1;
    } else {
        $required = !in_array(
            strtolower(trim((string) $rawRequired)),
            [
                '0',
                'false',
                'no',
                'off',
                'disabled',
            ],
            true
        );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATION MESSAGES
    |--------------------------------------------------------------------------
    */

    $validationMessage = $cfg['validation_message']
        ?? $cfg['validationMessage']
        ?? '⚠️ Please enter a valid response.';

    $requiredMessage = $cfg['required_validation_message']
        ?? $cfg['requiredValidationMessage']
        ?? $cfg['requiredMessage']
        ?? '⚠️ This field is required. Please enter a valid response.';

    $mobileValidationMessage = $cfg['mobile_validation_message']
        ?? $cfg['mobileValidationMessage']
        ?? '⚠️ Please enter a valid 10-digit mobile number.';

    /*
    |--------------------------------------------------------------------------
    | MIN / MAX CONFIGURATION
    |--------------------------------------------------------------------------
    */

    $minLength = $cfg['minLength']
        ?? $cfg['min_length']
        ?? null;

    $maxLength = $cfg['maxLength']
        ?? $cfg['max_length']
        ?? null;

    $minValue = $cfg['minValue']
        ?? $cfg['min_value']
        ?? null;

    $maxValue = $cfg['maxValue']
        ?? $cfg['max_value']
        ?? null;

    $regex = trim((string) ($cfg['regex'] ?? ''));

    /*
    |--------------------------------------------------------------------------
    | DATE CONFIGURATION
    |--------------------------------------------------------------------------
    */

    $dateFormat = trim((string) (
        $cfg['dateFormat']
        ?? $cfg['date_format']
        ?? 'YYYY-MM-DD'
    ));

    $minDate = trim((string) (
        $cfg['minDate']
        ?? $cfg['min_date']
        ?? ''
    ));

    $maxDate = trim((string) (
        $cfg['maxDate']
        ?? $cfg['max_date']
        ?? ''
    ));

    /*
    |--------------------------------------------------------------------------
    | TIME CONFIGURATION
    |--------------------------------------------------------------------------
    */

    $timeFormat = trim((string) (
        $cfg['timeFormat']
        ?? $cfg['time_format']
        ?? 'HH:mm'
    ));

    $minTime = trim((string) (
        $cfg['minTime']
        ?? $cfg['min_time']
        ?? ''
    ));

    $maxTime = trim((string) (
        $cfg['maxTime']
        ?? $cfg['max_time']
        ?? ''
    ));

    /*
    |--------------------------------------------------------------------------
    | DATE TIME CONFIGURATION
    |--------------------------------------------------------------------------
    */

    $dateTimeFormat = trim((string) (
        $cfg['dateTimeFormat']
        ?? $cfg['date_time_format']
        ?? 'YYYY-MM-DD HH:mm'
    ));

    $minDateTime = trim((string) (
        $cfg['minDateTime']
        ?? $cfg['min_date_time']
        ?? ''
    ));

    $maxDateTime = trim((string) (
        $cfg['maxDateTime']
        ?? $cfg['max_date_time']
        ?? ''
    ));

    /*
    |--------------------------------------------------------------------------
    | INPUT RECEIVED
    |--------------------------------------------------------------------------
    */

    if (array_key_exists('text', $input)) {

        $value = trim((string) ($input['text'] ?? ''));

        $isSkipText = $value !== ''
            && strcasecmp(trim($value), trim($skipText)) === 0;

        $isEmpty = $value === '';

        /*
        |--------------------------------------------------------------------------
        | ALLOWED SKIP
        |--------------------------------------------------------------------------
        */

        if (
            $allowSkip
            &&
            (
                $isSkipText
                ||
                ($isEmpty && !$required)
            )
        ) {

            $variables = $session->variables ?? [];

            if (is_string($variables)) {
                $variables = json_decode($variables, true) ?? [];
            }

            if (!is_array($variables)) {
                $variables = [];
            }

            $variables[$variable] = null;

            $session->update([
                'variables' => $variables,
                'status' => 'active',
                'last_message_at' => now(),
            ]);

            $session->refresh();

            $next = $this->nextNode(
                $workflow,
                $nodeId
            );

            if ($next) {

              $this->goToNode(
                    $workflow,
                    $session,
                    $next,
                    []
                );

            } else {

                $session->update([
                    'current_node_id' => $nodeId,
                    'status' => 'completed',
                    'last_message_at' => now(),
                ]);
            }

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | PREPARE VALIDATION MESSAGE
        |--------------------------------------------------------------------------
        */

        $validationFailed = false;
        $message = '';

        /*
        |--------------------------------------------------------------------------
        | SKIP NOT ALLOWED
        |--------------------------------------------------------------------------
        */

        if ($isSkipText && !$allowSkip) {

            $message = $this->resolve(
                (string) $requiredMessage,
                $session->variables ?? []
            );

            $validationFailed = true;
        }

        /*
        |--------------------------------------------------------------------------
        | EMPTY INPUT
        |--------------------------------------------------------------------------
        */

        elseif ($isEmpty) {

            $message = $required
                ? $requiredMessage
                : $validationMessage;

            $message = $this->resolve(
                (string) $message,
                $session->variables ?? []
            );

            $validationFailed = true;
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        else {

            $isValid = true;

            /*
            |--------------------------------------------------------------------------
            | TEXT
            |--------------------------------------------------------------------------
            */

            if (
                $validationType === ''
                ||
                $validationType === 'text'
                ||
                $validationType === 'string'
            ) {

                $isValid = $value !== '';
            }

            /*
            |--------------------------------------------------------------------------
            | ALPHA
            |--------------------------------------------------------------------------
            */

            elseif ($validationType === 'alpha') {

                $isValid = preg_match(
                    '/^[\pL\s]+$/u',
                    $value
                ) === 1;
            }

            /*
            |--------------------------------------------------------------------------
            | ALPHANUMERIC
            |--------------------------------------------------------------------------
            */

            elseif ($validationType === 'alphanumeric') {

                $isValid = preg_match(
                    '/^[\pL\pN\s]+$/u',
                    $value
                ) === 1;
            }

            /*
            |--------------------------------------------------------------------------
            | MOBILE
            |--------------------------------------------------------------------------
            */

            elseif ($validationType === 'mobile') {

                $digits = preg_replace('/\D+/', '', $value);

                if (
                    strlen($digits) === 12
                    &&
                    str_starts_with($digits, '91')
                ) {
                    $digits = substr($digits, 2);
                }

                $isValid = preg_match(
                    '/^[6-9][0-9]{9}$/',
                    $digits
                ) === 1;

                if ($isValid) {
                    $value = $digits;
                }
            }

            /*
            |--------------------------------------------------------------------------
            | EMAIL
            |--------------------------------------------------------------------------
            */

            elseif ($validationType === 'email') {

                $isValid = filter_var(
                    $value,
                    FILTER_VALIDATE_EMAIL
                ) !== false;
            }

            /*
            |--------------------------------------------------------------------------
            | NUMBER
            |--------------------------------------------------------------------------
            */

            elseif ($validationType === 'number') {

                $isValid = is_numeric($value);
            }

            /*
            |--------------------------------------------------------------------------
            | INTEGER
            |--------------------------------------------------------------------------
            */

            elseif ($validationType === 'integer') {

                $isValid = filter_var(
                    $value,
                    FILTER_VALIDATE_INT
                ) !== false;
            }

            /*
            |--------------------------------------------------------------------------
            | DATE
            |--------------------------------------------------------------------------
            */

            elseif ($validationType === 'date') {

                $dateFormatMap = [

                    'YYYY-MM-DD' => [
                        'php' => 'Y-m-d',
                        'regex' => '/^\d{4}-\d{2}-\d{2}$/',
                    ],

                    'DD-MM-YYYY' => [
                        'php' => 'd-m-Y',
                        'regex' => '/^\d{2}-\d{2}-\d{4}$/',
                    ],

                    'MM-DD-YYYY' => [
                        'php' => 'm-d-Y',
                        'regex' => '/^\d{2}-\d{2}-\d{4}$/',
                    ],

                    'DD/MM/YYYY' => [
                        'php' => 'd/m/Y',
                        'regex' => '/^\d{2}\/\d{2}\/\d{4}$/',
                    ],

                    'MM/DD/YYYY' => [
                        'php' => 'm/d/Y',
                        'regex' => '/^\d{2}\/\d{2}\/\d{4}$/',
                    ],
                ];

                $dateConfig = $dateFormatMap[$dateFormat]
                    ?? $dateFormatMap['YYYY-MM-DD'];

                $phpDateFormat = $dateConfig['php'];
                $dateRegex = $dateConfig['regex'];

                if (!preg_match($dateRegex, $value)) {

                    $isValid = false;

                } else {

                    $date = \DateTime::createFromFormat(
                        '!' . $phpDateFormat,
                        $value
                    );

                    $errors = \DateTime::getLastErrors();

                    $hasDateErrors = is_array($errors)
                        &&
                        (
                            $errors['warning_count'] > 0
                            ||
                            $errors['error_count'] > 0
                        );

                    $isValid = $date !== false
                        && !$hasDateErrors
                        && $date->format($phpDateFormat) === $value;

                    /*
                    |--------------------------------------------------------------------------
                    | MINIMUM DATE
                    |--------------------------------------------------------------------------
                    */

                    if ($isValid && $minDate !== '') {

                        $minDateObj = \DateTime::createFromFormat(
                            '!' . $phpDateFormat,
                            $minDate
                        );

                        if (
                            $minDateObj === false
                            ||
                            $date < $minDateObj
                        ) {
                            $isValid = false;
                        }
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | MAXIMUM DATE
                    |--------------------------------------------------------------------------
                    */

                    if ($isValid && $maxDate !== '') {

                        $maxDateObj = \DateTime::createFromFormat(
                            '!' . $phpDateFormat,
                            $maxDate
                        );

                        if (
                            $maxDateObj === false
                            ||
                            $date > $maxDateObj
                        ) {
                            $isValid = false;
                        }
                    }
                }
            }

            /*
            |--------------------------------------------------------------------------
            | TIME
            |--------------------------------------------------------------------------
            */

            elseif ($validationType === 'time') {

                $timeFormats = [
                    'HH:mm' => 'H:i',
                    'HH:mm:ss' => 'H:i:s',
                    'hh:mm A' => 'h:i A',
                ];

                $format = $timeFormats[$timeFormat] ?? 'H:i';

                $date = \DateTime::createFromFormat(
                    '!' . $format,
                    $value
                );

                $errors = \DateTime::getLastErrors();

                $hasErrors = is_array($errors)
                    &&
                    (
                        $errors['warning_count'] > 0
                        ||
                        $errors['error_count'] > 0
                    );

                $isValid = $date !== false
                    && !$hasErrors
                    && $date->format($format) === $value;

                /*
                |--------------------------------------------------------------------------
                | MIN TIME
                |--------------------------------------------------------------------------
                */

                if ($isValid && $minTime !== '') {

                    $minimumTime = \DateTime::createFromFormat(
                        '!' . $format,
                        $minTime
                    );

                    if (
                        $minimumTime === false
                        ||
                        $date < $minimumTime
                    ) {
                        $isValid = false;
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | MAX TIME
                |--------------------------------------------------------------------------
                */

                if ($isValid && $maxTime !== '') {

                    $maximumTime = \DateTime::createFromFormat(
                        '!' . $format,
                        $maxTime
                    );

                    if (
                        $maximumTime === false
                        ||
                        $date > $maximumTime
                    ) {
                        $isValid = false;
                    }
                }
            }

            /*
            |--------------------------------------------------------------------------
            | DATETIME
            |--------------------------------------------------------------------------
            */

            elseif ($validationType === 'datetime') {

                $dateTimeFormats = [

                    'YYYY-MM-DD HH:mm' => 'Y-m-d H:i',
                    'YYYY-MM-DD HH:mm:ss' => 'Y-m-d H:i:s',

                    'DD-MM-YYYY HH:mm' => 'd-m-Y H:i',
                    'DD-MM-YYYY HH:mm:ss' => 'd-m-Y H:i:s',

                    'MM-DD-YYYY HH:mm' => 'm-d-Y H:i',
                    'MM-DD-YYYY HH:mm:ss' => 'm-d-Y H:i:s',

                    'DD/MM/YYYY HH:mm' => 'd/m/Y H:i',
                    'DD/MM/YYYY HH:mm:ss' => 'd/m/Y H:i:s',

                    'MM/DD/YYYY HH:mm' => 'm/d/Y H:i',
                    'MM/DD/YYYY HH:mm:ss' => 'm/d/Y H:i:s',
                ];

                $format = $dateTimeFormats[$dateTimeFormat]
                    ?? 'Y-m-d H:i';

                $dateTime = \DateTime::createFromFormat(
                    '!' . $format,
                    $value
                );

                $errors = \DateTime::getLastErrors();

                $hasErrors = is_array($errors)
                    &&
                    (
                        $errors['warning_count'] > 0
                        ||
                        $errors['error_count'] > 0
                    );

                $isValid = $dateTime !== false
                    && !$hasErrors
                    && $dateTime->format($format) === $value;

                /*
                |--------------------------------------------------------------------------
                | MIN DATETIME
                |--------------------------------------------------------------------------
                */

                if ($isValid && $minDateTime !== '') {

                    $minimumDateTime = \DateTime::createFromFormat(
                        '!' . $format,
                        $minDateTime
                    );

                    if (
                        $minimumDateTime === false
                        ||
                        $dateTime < $minimumDateTime
                    ) {
                        $isValid = false;
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | MAX DATETIME
                |--------------------------------------------------------------------------
                */

                if ($isValid && $maxDateTime !== '') {

                    $maximumDateTime = \DateTime::createFromFormat(
                        '!' . $format,
                        $maxDateTime
                    );

                    if (
                        $maximumDateTime === false
                        ||
                        $dateTime > $maximumDateTime
                    ) {
                        $isValid = false;
                    }
                }
            }

            /*
            |--------------------------------------------------------------------------
            | CITY
            |--------------------------------------------------------------------------
            */

            elseif ($validationType === 'city') {

                $cityValidation = strtolower(trim((string) (
                    $cfg['cityValidation']
                    ?? $cfg['city_validation']
                    ?? 'any'
                )));

                $value = trim(
                    preg_replace('/\s+/', ' ', $value)
                );

                $isValid = preg_match(
                    "/^[\p{L}][\p{L}\s.'-]*$/u",
                    $value
                ) === 1;

                if (
                    $isValid
                    &&
                    $cityValidation === 'india'
                ) {

                    $indianCities = [
                        'ahmedabad',
                        'amritsar',
                        'aurangabad',
                        'bangalore',
                        'bengaluru',
                        'bhopal',
                        'bhubaneswar',
                        'chandigarh',
                        'chennai',
                        'coimbatore',
                        'dehradun',
                        'delhi',
                        'new delhi',
                        'faridabad',
                        'ghaziabad',
                        'goa',
                        'gurgaon',
                        'gurugram',
                        'guwahati',
                        'hyderabad',
                        'indore',
                        'jaipur',
                        'jalandhar',
                        'jammu',
                        'jodhpur',
                        'kanpur',
                        'kochi',
                        'kolkata',
                        'lucknow',
                        'ludhiana',
                        'madurai',
                        'meerut',
                        'mumbai',
                        'mysore',
                        'mysuru',
                        'nagpur',
                        'nashik',
                        'noida',
                        'patna',
                        'pondicherry',
                        'prayagraj',
                        'pune',
                        'rajkot',
                        'ranchi',
                        'surat',
                        'thane',
                        'thiruvananthapuram',
                        'udaipur',
                        'vadodara',
                        'varanasi',
                        'visakhapatnam',
                    ];

                    $cityKey = strtolower(trim(
                        preg_replace('/\s+/', ' ', $value)
                    ));

                    $isValid = in_array(
                        $cityKey,
                        $indianCities,
                        true
                    );
                }
            }

            /*
            |--------------------------------------------------------------------------
            | URL
            |--------------------------------------------------------------------------
            */

            elseif ($validationType === 'url') {

                $isValid = filter_var(
                    $value,
                    FILTER_VALIDATE_URL
                ) !== false;
            }

            /*
            |--------------------------------------------------------------------------
            | REGEX
            |--------------------------------------------------------------------------
            */

            elseif ($validationType === 'regex') {

                if ($regex === '') {

                    $isValid = false;

                } else {

                    $regexResult = @preg_match(
                        $regex,
                        $value
                    );

                    $isValid = $regexResult === 1;
                }
            }

            /*
            |--------------------------------------------------------------------------
            | UNKNOWN VALIDATION
            |--------------------------------------------------------------------------
            */

            else {

                $isValid = false;
            }

            /*
            |--------------------------------------------------------------------------
            | MIN LENGTH
            |--------------------------------------------------------------------------
            */

            if (
                $isValid
                &&
                in_array(
                    $validationType,
                    [
                        '',
                        'text',
                        'string',
                        'alpha',
                        'alphanumeric',
                        'mobile',
                    ],
                    true
                )
                &&
                $minLength !== null
                &&
                $minLength !== ''
                &&
                is_numeric($minLength)
            ) {

                $isValid = mb_strlen($value) >= (int) $minLength;
            }

            /*
            |--------------------------------------------------------------------------
            | MAX LENGTH
            |--------------------------------------------------------------------------
            */

            if (
                $isValid
                &&
                in_array(
                    $validationType,
                    [
                        '',
                        'text',
                        'string',
                        'alpha',
                        'alphanumeric',
                        'mobile',
                    ],
                    true
                )
                &&
                $maxLength !== null
                &&
                $maxLength !== ''
                &&
                is_numeric($maxLength)
            ) {

                $isValid = mb_strlen($value) <= (int) $maxLength;
            }

            /*
            |--------------------------------------------------------------------------
            | MIN VALUE
            |--------------------------------------------------------------------------
            */

            if (
                $isValid
                &&
                in_array($validationType, ['number', 'integer'], true)
                &&
                $minValue !== null
                &&
                $minValue !== ''
                &&
                is_numeric($minValue)
            ) {

                $isValid = is_numeric($value)
                    && (float) $value >= (float) $minValue;
            }

            /*
            |--------------------------------------------------------------------------
            | MAX VALUE
            |--------------------------------------------------------------------------
            */

            if (
                $isValid
                &&
                in_array($validationType, ['number', 'integer'], true)
                &&
                $maxValue !== null
                &&
                $maxValue !== ''
                &&
                is_numeric($maxValue)
            ) {

                $isValid = is_numeric($value)
                    && (float) $value <= (float) $maxValue;
            }

            /*
            |--------------------------------------------------------------------------
            | VALIDATION FAILED
            |--------------------------------------------------------------------------
            */

            if (!$isValid) {

                $message = $validationMessage;

                if (
                    $validationType === 'mobile'
                    &&
                    trim((string) $mobileValidationMessage) !== ''
                ) {
                    $message = $mobileValidationMessage;
                }

                $message = $this->resolve(
                    (string) $message,
                    $session->variables ?? []
                );

                $validationFailed = true;
            }
        }

        /*
        |--------------------------------------------------------------------------
        | SEND VALIDATION MESSAGE
        |--------------------------------------------------------------------------
        */

        if ($validationFailed) {

            $output = $this->whatsapp->sendText(
                $session->user_identifier,
                $message
            );


            $this->saveOutbound(
                $session,
                'text',
                $message,
                $output,
                [
                    'action' => 'send_input_prompt',
                    'workflow_id' => $workflow->id,
                    'node_id' => $nodeId,
                    'input' => [],
                    'config' => $cfg,
                ]
            );

            $session->update([
                'current_node_id' => $nodeId,
                'status' => 'waiting',
                'last_message_at' => now(),
            ]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | SAVE VALID INPUT
        |--------------------------------------------------------------------------
        */

        $variables = $session->variables ?? [];

        if (is_string($variables)) {
            $variables = json_decode($variables, true) ?? [];
        }

        if (!is_array($variables)) {
            $variables = [];
        }

        $variables[$variable] = $value;

        $session->update([
            'variables' => $variables,
            'status' => 'active',
            'last_message_at' => now(),
        ]);

        $session->refresh();

        /*
        |--------------------------------------------------------------------------
        | NEXT NODE
        |--------------------------------------------------------------------------
        */

        $next = $this->nextNode(
            $workflow,
            $nodeId
        );

        if ($next) {

                $this->goToNode(
                    $workflow,
                    $session,
                    $next,
                    []
                );

        } else {

            $session->update([
                'current_node_id' => $nodeId,
                'status' => 'completed',
                'last_message_at' => now(),
            ]);
        }

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | FIRST VISIT - SEND INPUT PROMPT
    |--------------------------------------------------------------------------
    */

    $this->sendInputPrompt(
        $session,
        $cfg
    );

    $session->update([
        'current_node_id' => $nodeId,
        'status' => 'waiting',
        'last_message_at' => now(),
    ]);

    return;
}
elseif ($type === 'api') {

    /*
    |--------------------------------------------------------------------------
    | LOAD VARIABLES
    |--------------------------------------------------------------------------
    */

    $variables = $session->variables ?? [];

    if (is_string($variables)) {
        $variables = json_decode($variables, true) ?? [];
    }

    if (!is_array($variables)) {
        $variables = [];
    }



    $otpEnabled = filter_var(
        $cfg['otpEnabled']
            ?? $cfg['otp_enabled']
            ?? false,
        FILTER_VALIDATE_BOOLEAN
    );

    /*
    |--------------------------------------------------------------------------
    | OTP API FLOW
    |--------------------------------------------------------------------------
    */

    if ($otpEnabled) {

        /*
        |--------------------------------------------------------------------------
        | VARIABLES
        |--------------------------------------------------------------------------
        */

        $mobileVariable = $cfg['mobileVariable']
            ?? $cfg['mobile_variable']
            ?? 'mobile';

        $nameVariable = $cfg['nameVariable']
            ?? $cfg['name_variable']
            ?? 'name';

        $otpVariable = $cfg['otpVariable']
            ?? $cfg['otp_variable']
            ?? 'otp';

        $verifiedVariable = $cfg['otpVerifiedVariable']
            ?? $cfg['otp_verified_variable']
            ?? 'otp_verified';

        $referenceVariable = $cfg['referenceVariable']
            ?? $cfg['reference_variable']
            ?? 'otp_reference';

        /*
        |--------------------------------------------------------------------------
        | MOBILE
        |--------------------------------------------------------------------------
        */

        $mobile = trim((string) (
            $variables[$mobileVariable]
            ?? $variables['mobile']
            ?? $session->user_identifier
            ?? ''
        ));

        if ($mobile === '') {

            Log::error('API OTP: MOBILE MISSING', [
                'node_id' => $nodeId,
                'session_id' => $session->id ?? null,
            ]);

            $message = $cfg['apiFailureMessage']
                ?? $cfg['api_failure_message']
                ?? '⚠️ Mobile number is missing.';

            $message = $this->resolve(
                (string) $message,
                $variables
            );

            $output = $this->whatsapp->sendText(
                $session->user_identifier,
                $message
            );

            $this->saveOutbound(
                $session,
                'text',
                $message,
                $output
            );

            $session->update([
                'variables' => $variables,
                'current_node_id' => $nodeId,
                'status' => 'waiting',
                'last_message_at' => now(),
            ]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | NAME
        |--------------------------------------------------------------------------
        */

        $name = trim((string) (
            $variables[$nameVariable]
            ?? $variables['name']
            ?? ''
        ));

        /*
        |--------------------------------------------------------------------------
        | OTP LENGTH
        |--------------------------------------------------------------------------
        */

        $otpLength = (int) (
            $cfg['otpLength']
            ?? $cfg['otp_length']
            ?? 6
        );

        $otpLength = max(4, min($otpLength, 8));

        /*
        |--------------------------------------------------------------------------
        | OTP SENT FLAG
        |--------------------------------------------------------------------------
        */

        $otpSentVariable = 'otp_sent';

        $otpSent = !empty(
            $variables[$otpSentVariable]
        );

        /*
        |--------------------------------------------------------------------------
        | FIRST REQUEST - SEND OTP
        |--------------------------------------------------------------------------
        */

        if (!$otpSent) {

            /*
            |--------------------------------------------------------------------------
            | GENERATE OTP
            |--------------------------------------------------------------------------
            */

            $min = 10 ** ($otpLength - 1);
            $max = (10 ** $otpLength) - 1;

            $generatedOtp = (string) random_int(
                $min,
                $max
            );

            $variables[$otpVariable] = $generatedOtp;

            /*
            |--------------------------------------------------------------------------
            | STANDARD VARIABLES
            |--------------------------------------------------------------------------
            */

            $variables['mobile'] = $mobile;

            if ($name !== '') {
                $variables['name'] = $name;
            }

            /*
            |--------------------------------------------------------------------------
            | SEND OTP API
            |--------------------------------------------------------------------------
            */

            $sendResult = $this->sendOtpForApiNode(
                $cfg,
                $mobile,
                $variables
            );

            /*
            |--------------------------------------------------------------------------
            | SEND OTP FAILED
            |--------------------------------------------------------------------------
            */

            if (!($sendResult['success'] ?? false)) {

                Log::error('API OTP: SEND FAILED', [
                    'node_id' => $nodeId,
                    'mobile' => $mobile,
                    'response' => $sendResult,
                ]);

                $message = $cfg['sendOtpErrorMessage']
                    ?? $cfg['send_otp_error_message']
                    ?? '⚠️ Unable to send OTP. Please try again later.';

                $message = $this->resolve(
                    (string) $message,
                    $variables
                );

                $output = $this->whatsapp->sendText(
                    $session->user_identifier,
                    $message
                );

                $this->saveOutbound(
                    $session,
                    'text',
                    $message,
                    $output
                );

                $variables[$otpVariable] = null;
                $variables['otp_sent'] = false;

                $session->update([
                    'variables' => $variables,
                    'current_node_id' => $nodeId,
                    'status' => 'waiting',
                    'last_message_at' => now(),
                ]);

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | SAVE OTP REFERENCE
            |--------------------------------------------------------------------------
            */

            if (!empty($sendResult['reference'])) {

                $variables[$referenceVariable] =
                    $sendResult['reference'];
            }

            /*
            |--------------------------------------------------------------------------
            | MARK OTP SENT
            |--------------------------------------------------------------------------
            */

            $variables[$otpSentVariable] = true;

            /*
            |--------------------------------------------------------------------------
            | OTP EXPIRY
            |--------------------------------------------------------------------------
            */

            $expiryMinutes = (int) (
                $cfg['expiryMinutes']
                ?? $cfg['expiry_minutes']
                ?? 5
            );

            $expiryMinutes = max(
                1,
                min($expiryMinutes, 60)
            );

            $variables['otp_expires_at'] = now()
                ->addMinutes($expiryMinutes)
                ->toDateTimeString();

            /*
            |--------------------------------------------------------------------------
            | ATTEMPTS
            |--------------------------------------------------------------------------
            */

            $variables['otp_attempts'] = 0;

            /*
            |--------------------------------------------------------------------------
            | VERIFIED FLAG
            |--------------------------------------------------------------------------
            */

            $variables[$verifiedVariable] = false;

            /*
            |--------------------------------------------------------------------------
            | OTP PROMPT
            |--------------------------------------------------------------------------
            */

            $prompt = $cfg['otpMessage']
                ?? $cfg['otp_message']
                ?? 'Your OTP has been sent. Please enter the OTP.';

            $prompt = $this->resolve(
                (string) $prompt,
                $variables
            );

            $output = $this->whatsapp->sendText(
                $session->user_identifier,
                $prompt
            );

            $this->saveOutbound(
                $session,
                'text',
                $prompt,
                $output
            );

            $session->update([
                'variables' => $variables,
                'current_node_id' => $nodeId,
                'status' => 'waiting',
                'last_message_at' => now(),
            ]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | OTP RECEIVED
        |--------------------------------------------------------------------------
        */

        $otp = trim((string) (
            $input['text'] ?? ''
        ));

        /*
        |--------------------------------------------------------------------------
        | EMPTY OTP
        |--------------------------------------------------------------------------
        */

        if ($otp === '') {

            $message = $cfg['validationMessage']
                ?? $cfg['validation_message']
                ?? '⚠️ Please enter the OTP.';

            $message = $this->resolve(
                (string) $message,
                $variables
            );

            $output = $this->whatsapp->sendText(
                $session->user_identifier,
                $message,

            );

            $this->saveOutbound(
                $session,
                'text',
                $message,
                $output
            );

            $session->update([
                'variables' => $variables,
                'current_node_id' => $nodeId,
                'status' => 'waiting',
                'last_message_at' => now(),
            ]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | OTP LENGTH VALIDATION
        |--------------------------------------------------------------------------
        */

        if (!preg_match('/^\d{' . $otpLength . '}$/', $otp)) {

            $message = $cfg['validationMessage']
                ?? $cfg['validation_message']
                ?? "⚠️ Please enter a valid {$otpLength}-digit OTP.";

            $message = $this->resolve(
                (string) $message,
                $variables
            );

            $output = $this->whatsapp->sendText(
                $session->user_identifier,
                $message,

            );

            $this->saveOutbound(
                $session,
                'text',
                $message,
                $output
            );

            $session->update([
                'variables' => $variables,
                'current_node_id' => $nodeId,
                'status' => 'waiting',
                'last_message_at' => now(),
            ]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | OTP EXPIRY
        |--------------------------------------------------------------------------
        */

        if (!empty($variables['otp_expires_at'])) {

            try {

                $expiresAt = \Carbon\Carbon::parse(
                    $variables['otp_expires_at']
                );

                if (now()->greaterThan($expiresAt)) {

                    $message = $cfg['otpExpiredMessage']
                        ?? $cfg['otp_expired_message']
                        ?? '⚠️ OTP has expired. Please request a new OTP.';

                    $message = $this->resolve(
                        (string) $message,
                        $variables
                    );

                    $output = $this->whatsapp->sendText(
                        $session->user_identifier,
                        $message,

                    );

                    $this->saveOutbound(
                        $session,
                        'text',
                        $message,
                        $output
                    );

                    /*
                    |--------------------------------------------------------------------------
                    | RESET OTP
                    |--------------------------------------------------------------------------
                    */

                    $variables['otp_sent'] = false;
                    $variables['otp_attempts'] = 0;
                    $variables['otp_expires_at'] = null;
                    $variables[$otpVariable] = null;
                    $variables[$referenceVariable] = null;
                    $variables[$verifiedVariable] = false;

                    $session->update([
                        'variables' => $variables,
                        'current_node_id' => $nodeId,
                        'status' => 'waiting',
                        'last_message_at' => now(),
                    ]);

                    return;
                }

            } catch (\Throwable $e) {

                Log::warning('OTP EXPIRY PARSE ERROR', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | MAX ATTEMPTS
        |--------------------------------------------------------------------------
        */

        $maxAttempts = (int) (
            $cfg['maxAttempts']
            ?? $cfg['max_attempts']
            ?? 3
        );

        $maxAttempts = max(
            1,
            min($maxAttempts, 10)
        );

        $attempts = (int) (
            $variables['otp_attempts'] ?? 0
        );

        /*
        |--------------------------------------------------------------------------
        | CHECK BEFORE ATTEMPT
        |--------------------------------------------------------------------------
        */

        if ($attempts >= $maxAttempts) {

            $message = $cfg['otpMaxAttemptsMessage']
                ?? $cfg['otp_max_attempts_message']
                ?? '⚠️ Maximum OTP attempts exceeded.';

            $message = $this->resolve(
                (string) $message,
                $variables
            );

            $next = $this->nextNode(
                $workflow,
                $nodeId,
                'source-no'
            );

            $output = $this->whatsapp->sendText(
                $session->user_identifier,
                $message,

            );

            $this->saveOutbound(
                $session,
                'text',
                $message,
                $output,
                [
                    'action' => 'continue',
                    'workflow_id' => $workflow->id,
                    'node_id' => $nodeId,
                    'next_node_id' => $next,
                    'input' => $input,
                ]
            );

            $variables[$verifiedVariable] = false;

            $session->update([
                'variables' => $variables,
                'current_node_id' => $nodeId,
                'status' => 'waiting',
                'last_message_at' => now(),
            ]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | INCREMENT ATTEMPT
        |--------------------------------------------------------------------------
        */

        $attempts++;

        $variables['otp_attempts'] = $attempts;

        /*
        |--------------------------------------------------------------------------
        | OTP FOR CURRENT VERIFY REQUEST
        |--------------------------------------------------------------------------
        */

        $variables[$otpVariable] = $otp;

        /*
        |--------------------------------------------------------------------------
        | REFERENCE
        |--------------------------------------------------------------------------
        */

        $reference = $variables[$referenceVariable] ?? null;

        /*
        |--------------------------------------------------------------------------
        | VERIFY OTP
        |--------------------------------------------------------------------------
        */

        $verifyResult = $this->verifyOtpForApiNode(
            $cfg,
            $mobile,
            $otp,
            $reference,
            $variables
        );

        /*
        |--------------------------------------------------------------------------
        | OTP VERIFIED SUCCESS
        |--------------------------------------------------------------------------
        */

        if ($verifyResult['verified'] ?? false) {

            Log::info('API OTP: VERIFIED SUCCESS', [
                'node_id' => $nodeId,
                'mobile' => $mobile,
                'verifyResult' => $verifyResult,
            ]);

            $variables[$verifiedVariable] = true;

            if (
                isset($verifyResult['data']) &&
                is_array($verifyResult['data'])
            ) {
                $variables['otp_response'] =
                    $verifyResult['data'];
            }

            $variables[$otpVariable] = '******';
            $variables['otp_sent'] = false;
            $variables['otp_attempts'] = 0;
            $variables['otp_expires_at'] = null;

            $session->update([
                'variables' => $variables,
                'current_node_id' => $nodeId,
                'status' => 'active',
                'last_message_at' => now(),
            ]);

            /*
            |--------------------------------------------------------------------------
            | SUCCESS MESSAGE
            |--------------------------------------------------------------------------
            */

            $successMessage = $cfg['apiSuccessMessage']
                ?? $cfg['api_success_message']
                ?? $cfg['successMessage']
                ?? $cfg['success_message']
                ?? 'OTP verified successfully.';

            $successMessage = $this->resolve(
                (string) $successMessage,
                $variables
            );

            /*
            |--------------------------------------------------------------------------
            | NEXT NODE - YES EDGE
            |--------------------------------------------------------------------------
            */

      $next = $this->nextNode(
    $workflow,
    $nodeId,
    'source-yes'
);

if (trim($successMessage) !== '') {

    $output = $this->whatsapp->sendText(
        $session->user_identifier,
        $successMessage
    );

    if ($next) {
        $this->saveOutbound(
            $session,
            'text',
            $successMessage,
            $output,
            [
                'action' => 'continue',
                'workflow_id' => $workflow->id,
                'node_id' => $nodeId,
                'next_node_id' => $next,
                'input' => [],
            ]
        );

        $session->update([
            'current_node_id' => $nodeId,
            'status' => 'waiting',
            'last_message_at' => now(),
        ]);
    } else {
        $this->saveOutbound(
            $session,
            'text',
            $successMessage,
            $output
        );

        $session->update([
            'current_node_id' => null,
            'status' => 'completed',
            'last_message_at' => now(),
        ]);
    }

    return;
}

if ($next) {
    $this->goToNode(
        $workflow,
        $session,
        $next,
        []
    );
} else {
    $session->update([
        'current_node_id' => null,
        'status' => 'completed',
        'last_message_at' => now(),
    ]);
}

return;
        }

        /*
        |--------------------------------------------------------------------------
        | OTP FAILED
        |--------------------------------------------------------------------------
        */

        $variables[$verifiedVariable] = false;
        $variables[$otpVariable] = '******';

        $session->update([
            'variables' => $variables,
            'current_node_id' => $nodeId,
            'status' => 'waiting',
            'last_message_at' => now(),
        ]);

        /*
        |--------------------------------------------------------------------------
        | INVALID OTP MESSAGE
        |--------------------------------------------------------------------------
        */

        $failureMessage = $cfg['apiFailureMessage']
            ?? $cfg['api_failure_message']
            ?? $cfg['invalidOtpMessage']
            ?? $cfg['invalid_otp_message']
            ?? '⚠️ Invalid OTP. Please try again.';

        $failureMessage = $this->resolve(
            (string) $failureMessage,
            $variables
        );

        /*
        |--------------------------------------------------------------------------
        | NEXT NODE AFTER MAX ATTEMPTS
        |--------------------------------------------------------------------------
        */

        $next = null;

        if ($attempts >= $maxAttempts) {

            $next = $this->nextNode(
                $workflow,
                $nodeId,
                'source-no'
            );
        }

        if (trim($failureMessage) !== '') {

            $output = $this->whatsapp->sendText(
                $session->user_identifier,
                $failureMessage,

            );

            $this->saveOutbound(
                $session,
                'text',
                $failureMessage,
                $output,
                $next ? [
                    'action' => 'continue',
                    'workflow_id' => $workflow->id,
                    'node_id' => $nodeId,
                    'next_node_id' => $next,
                    'input' => $input,
                ] : null
            );

            $session->update([
                'current_node_id' => $nodeId,
                'status' => 'waiting',
                'last_message_at' => now(),
            ]);

            return;
        }

              if ($next) {
            $this->goToNode(
                $workflow,
                $session,
                $next,
                []
            );
        } else {
            $session->update([
                'current_node_id' => null,
                'status' => 'completed',
                'last_message_at' => now(),
            ]);
        }

return;
    }

    /*
    |--------------------------------------------------------------------------
    | NORMAL API
    |--------------------------------------------------------------------------
    */

    $apiResult = $this->executeApi(
        $cfg,
        $session
    );

    /*
    |--------------------------------------------------------------------------
    | RELOAD VARIABLES
    |--------------------------------------------------------------------------
    */

    $variables = $session->variables ?? [];

    if (is_string($variables)) {

        $variables = json_decode(
            $variables,
            true
        ) ?? [];
    }

    if (!is_array($variables)) {
        $variables = [];
    }

    /*
    |--------------------------------------------------------------------------
    | RESPONSE VARIABLE
    |--------------------------------------------------------------------------
    */

    $responseVariable = $cfg['apiResponseVariable']
        ?? $cfg['api_response_variable']
        ?? 'api_response';

    $variables[$responseVariable] = $apiResult;

    /*
    |--------------------------------------------------------------------------
    | OPTIONAL RESPONSE PATH
    |--------------------------------------------------------------------------
    */

    $responsePath = $cfg['apiResponsePath']
        ?? $cfg['api_response_path']
        ?? '';

    if ($responsePath !== '') {

        $responseValue = data_get(
            $apiResult,
            $responsePath
        );

        $variables[$responseVariable . '_value'] =
            $responseValue;
    }

    /*
    |--------------------------------------------------------------------------
    | BACKWARD COMPATIBILITY
    |--------------------------------------------------------------------------
    */

    if (isset($apiResult['order_status'])) {
        $variables['order_status'] = $apiResult['order_status'];
    }

    if (isset($apiResult['status'])) {
        $variables['status'] = $apiResult['status'];
    }

    /*
    |--------------------------------------------------------------------------
    | API SUCCESS / FAILURE
    |--------------------------------------------------------------------------
    */

    $apiSuccess = $this->isApiSuccess(
        $cfg,
        $apiResult
    );

    /*
    |--------------------------------------------------------------------------
    | SAVE VARIABLES
    |--------------------------------------------------------------------------
    */

    $session->update([
        'variables' => $variables,
        'current_node_id' => $nodeId,
        'status' => 'active',
        'last_message_at' => now(),
    ]);

    /*
    |--------------------------------------------------------------------------
    | API SUCCESS
    |--------------------------------------------------------------------------
    */

    if ($apiSuccess) {

        $message = $cfg['apiSuccessMessage']
            ?? $cfg['api_success_message']
            ?? '';

        $next = $this->nextNode(
            $workflow,
            $nodeId
        );

        if (trim((string) $message) !== '') {

            $message = $this->resolve(
                (string) $message,
                $variables
            );

            $output = $this->whatsapp->sendText(
                $session->user_identifier,
                $message
            );

            $this->saveOutbound(
                $session,
                'text',
                $message,
                $output,
                [
                    'action' => 'continue',
                    'workflow_id' => $workflow->id,
                    'node_id' => $nodeId,
                    'next_node_id' => $next,
                    'input' => $input,
                ]
            );

            $session->update([
                'variables' => $variables,
                'current_node_id' => $nodeId,
                'status' => 'waiting',
                'last_message_at' => now(),
            ]);

            return;
        }

        if ($next) {

            $this->goToNode(
                $workflow,
                $session,
                $next,
                $input
            );

        } else {

            $session->update([
                'current_node_id' => $nodeId,
                'status' => 'completed',
                'last_message_at' => now(),
            ]);
        }

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | API FAILURE
    |--------------------------------------------------------------------------
    */

    $message = $cfg['apiFailureMessage']
        ?? $cfg['api_failure_message']
        ?? '';

    $next = $this->nextNode(
        $workflow,
        $nodeId
    );

    if (trim((string) $message) !== '') {

        $message = $this->resolve(
            (string) $message,
            $variables
        );

        $output = $this->whatsapp->sendText(
            $session->user_identifier,
            $message
        );

        $this->saveOutbound(
            $session,
            'text',
            $message,
            $output,
            [
                'action' => 'continue',
                'workflow_id' => $workflow->id,
                'node_id' => $nodeId,
                'next_node_id' => $next,
                'input' => $input,
            ]
        );

        $session->update([
            'variables' => $variables,
            'current_node_id' => $nodeId,
            'status' => 'waiting',
            'last_message_at' => now(),
        ]);

        return;
    }

    if ($next) {

        $this->goToNode(
            $workflow,
            $session,
            $next,
            $input
        );

    } else {

        $session->update([
            'current_node_id' => $nodeId,
            'status' => 'completed',
            'last_message_at' => now(),
        ]);
    }

    return;
}

elseif ($type === 'delay') {

    /*
    |--------------------------------------------------------------------------
    | DELAY VALUE
    |--------------------------------------------------------------------------
    */

    $delay = (int) (
        $cfg['delay']
        ?? $cfg['delay_value']
        ?? 1
    );

    $delayUnit = strtolower(
        trim((string) (
            $cfg['delayUnit']
            ?? $cfg['delay_unit']
            ?? 'seconds'
        ))
    );

    $delay = max(1, $delay);

    /*
    |--------------------------------------------------------------------------
    | CONVERT TO SECONDS
    |--------------------------------------------------------------------------
    */

    switch ($delayUnit) {

        case 'minute':
        case 'minutes':
            $delaySeconds = $delay * 60;
            break;

        case 'hour':
        case 'hours':
            $delaySeconds = $delay * 3600;
            break;

        case 'day':
        case 'days':
            $delaySeconds = $delay * 86400;
            break;

        case 'second':
        case 'seconds':
        default:
            $delaySeconds = $delay;
            break;
    }

    /*
    |--------------------------------------------------------------------------
    | FIND NEXT NODE
    |--------------------------------------------------------------------------
    */

    $nextNodeId = $this->nextNode(
        $workflow,
        $nodeId
    );

    if (!$nextNodeId) {

        $session->update([
            'status' => 'completed',
            'current_node_id' => $nodeId,
            'last_message_at' => now(),
        ]);

        Log::info('WHATSAPP DELAY NO NEXT NODE', [
            'workflow_id' => $workflow->id,
            'session_id' => $session->id,
            'delay_node_id' => $nodeId,
        ]);

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | SAVE SESSION
    |--------------------------------------------------------------------------
    */

    $session->update([
        'status' => 'waiting',
        'current_node_id' => $nodeId,
        'last_message_at' => now(),
    ]);

    /*
    |--------------------------------------------------------------------------
    | SCHEDULE DELAY JOB
    |--------------------------------------------------------------------------
    */

    $executeAt = now()->addSeconds($delaySeconds);

    \App\Jobs\ExecuteDelayedWorkflow::dispatch(
        workflowId: (int) $workflow->id,
        sessionId: (int) $session->id,
        delayNodeId: (string) $nodeId,
        nextNodeId: (string) $nextNodeId
    )->delay($executeAt);

    /*
    |--------------------------------------------------------------------------
    | LOG
    |--------------------------------------------------------------------------
    */

    Log::info('WHATSAPP DELAY SCHEDULED', [
        'workflow_id' => $workflow->id,
        'session_id' => $session->id,
        'delay_node_id' => $nodeId,
        'next_node_id' => $nextNodeId,
        'delay' => $delay,
        'delay_unit' => $delayUnit,
        'delay_seconds' => $delaySeconds,
        'execute_at' => $executeAt->toDateTimeString(),
    ]);

    return;
}
/*
|--------------------------------------------------------------------------
| END NODE
|--------------------------------------------------------------------------
*/

elseif ($type === 'end') {

    $this->saveCustomerLead(
        $workflow,
        $session
    );

    $session->update([
        'current_node_id' => $nodeId,
        'status' => 'completed',
        'last_message_at' => now(),
    ]);

    $output = [
        'status' => 'completed',
        'customer_lead_saved' => true,
    ];
}

/*
|--------------------------------------------------------------------------
| DEFAULT NODE
|--------------------------------------------------------------------------
*/

else {

    $next = $this->nextNode(
        $workflow,
        $nodeId
    );

    if ($next) {

        $this->goToNode(
            $workflow,
            $session,
            $next,
            $input
        );

        $output = [
            'status' => 'continued',
            'next_node_id' => $next,
        ];

    } else {

        $session->update([
            'current_node_id' => $nodeId,
            'status' => 'completed',
            'last_message_at' => now(),
        ]);

        $output = [
            'status' => 'completed',
            'reason' => 'No next node found',
        ];
    }
}

/*
|--------------------------------------------------------------------------
| EXECUTION SUCCESS
|--------------------------------------------------------------------------
*/

$log->update([
    'status' => 'success',
    'output_payload' => $output,
    'finished_at' => now(),
]);

} catch (\Throwable $e) {

    $log->update([
        'status' => 'failed',
        'error_message' => $e->getMessage(),
        'finished_at' => now(),
    ]);

    $session->update([
        'status' => 'error',
    ]);

    throw $e;
}


    }

    /*
    |--------------------------------------------------------------------------
    | GO TO NODE
    |--------------------------------------------------------------------------
    */

    private function goToNode(
        Workflow $workflow,
        BotSession $session,
        string $nodeId,
        array $input = []
    ): void {

        $session->update([
            'current_node_id' => $nodeId,
            'last_message_at' => now(),
        ]);



        $this->execute(
            $workflow,
            $session,
            $nodeId,
            $input
        );
    }

    /*
    |--------------------------------------------------------------------------
    | NEXT NODE
    |--------------------------------------------------------------------------
    */

    private function nextNode(
        Workflow $workflow,
        string $source,
        ?string $sourceHandle = null
    ): ?string {

        $query = $workflow->edges()
            ->where(
                'source',
                $source
            );

        if ($sourceHandle !== null) {

            $query->where(
                'source_handle',
                $sourceHandle
            );
        }

        $edge = $query
            ->orderBy('id')
            ->first();

        if (! $edge) {
            return null;
        }

        return $edge->target
            ? (string) $edge->target
            : null;
    }



private function resolveButtonSourceHandle(
    Workflow $workflow,
    string $nodeId
): string {
    $edge = $workflow->edges()
        ->where('source', $nodeId)
        ->whereNotNull('source_handle')
        ->orderBy('id')
        ->first();

    return $edge
        ? (string) $edge->source_handle
        : '';
}
    /*
    |--------------------------------------------------------------------------
    | RESOLVE VARIABLES
    |--------------------------------------------------------------------------
    */

    private function resolve(
        string $text,
        array $vars
    ): string {

        return preg_replace_callback(
            '/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/',
            function ($match) use ($vars) {

                $value = data_get(
                    $vars,
                    $match[1],
                    $match[0]
                );

                return $value === null
                    ? ''
                    : (string) $value;
            },
            $text
        );
    }



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
        ];

        foreach ($keys as $key) {

            $value = data_get(
                $response,
                $key
            );

            if (
                $value !== null
                &&
                $value !== ''
            ) {

                return (string) $value;
            }
        }

        return null;
    }



    /*
    |--------------------------------------------------------------------------
    | OTP VERIFICATION SUCCESS
    |--------------------------------------------------------------------------
    */

    private function otpVerificationSucceeded(
        array $response
    ): bool {

        $values = [
            data_get($response, 'success'),
            data_get($response, 'verified'),
            data_get($response, 'valid'),
            data_get($response, 'data.success'),
            data_get($response, 'data.verified'),
            data_get($response, 'data.valid'),
        ];

        foreach ($values as $value) {

            if (
                $value === true
                ||
                $value === 1
            ) {
                return true;
            }

            if (
                is_string($value)
                &&
                in_array(
                    strtolower(trim($value)),
                    [
                        'true',
                        '1',
                        'success',
                        'verified',
                        'valid',
                        'approved',
                    ],
                    true
                )
            ) {
                return true;
            }
        }

        $status = strtolower(
            (string) (
                data_get(
                    $response,
                    'status'
                )
                ??
                data_get(
                    $response,
                    'data.status'
                )
                ??
                ''
            )
        );

        return in_array(
            $status,
            [
                'success',
                'verified',
                'valid',
                'approved',
            ],
            true
        );
    }

    /*
|--------------------------------------------------------------------------
| RESOLVE MEDIA URL
|--------------------------------------------------------------------------
*/

    private function resolveMediaUrl(
        array $cfg,
        Workflow $workflow
    ): string {

        $mediaId = $cfg['media_upload_id']
            ?? $cfg['mediaUploadId']
            ?? $cfg['media_id']
            ?? $cfg['mediaId']
            ?? null;

        /*
        |--------------------------------------------------------------------------
        | MEDIA UPLOAD ID
        |--------------------------------------------------------------------------
        */

        if ($mediaId) {

            $media = MediaUpload::query()
                ->where('id', $mediaId)
                ->where('status', 'active')
                ->first();

            if (! $media) {

                throw new \RuntimeException(
                    "Media upload not found: {$mediaId}"
                );
            }

            if (empty($media->url)) {

                throw new \RuntimeException(
                    "Media URL is empty for upload ID: {$mediaId}"
                );
            }

            return (string) $media->url;
        }

        /*
        |--------------------------------------------------------------------------
        | DIRECT MEDIA URL
        |--------------------------------------------------------------------------
        */

        $mediaUrl = $cfg['media_url']
            ?? $cfg['mediaUrl']
            ?? $cfg['url']
            ?? $cfg['file_url']
            ?? $cfg['fileUrl']
            ?? '';

        return (string) $mediaUrl;
    }

private function findMenuOptionByText(
    array $cfg,
    string $typedText
): ?array {

    $typedText = trim($typedText);

    $options = $cfg['menuOptions']
        ?? $cfg['options']
        ?? $cfg['menu_options']
        ?? [];

    Log::info('FIND MENU OPTION DEBUG', [
        'typed_text' => $typedText,
        'options' => $options,
    ]);

    if ($typedText === '' || !is_array($options)) {
        return null;
    }

    foreach ($options as $index => $option) {
        if (!is_array($option)) {
            continue;
        }

        $label = trim((string) (
            $option['label']
            ?? $option['title']
            ?? $option['text']
            ?? ''
        ));

        $handle = (string) (
            $option['source_handle']
            ?? $option['sourceHandle']
            ?? "source-option-{$index}"
        );

        Log::info('MENU OPTION COMPARISON', [
            'typed_text' => $typedText,
            'label' => $label,
            'handle' => $handle,
            'matches' => strcasecmp($typedText, $label) === 0,
        ]);

        if (
            $label !== ''
            && strcasecmp($typedText, $label) === 0
        ) {
            return [
                'source_handle' => $handle,
                'label' => $label,
                'index' => $index,
            ];
        }
    }

    return null;
}
    /*
    |--------------------------------------------------------------------------
    | GET MENU OPTION LABEL
    |--------------------------------------------------------------------------
    */

    private function getMenuOptionLabel(
        array $cfg,
        string $sourceHandle,
        array $input = []
    ): ?string {

        $options =
            $cfg['menuOptions']
            ??
            $cfg['options']
            ??
            $cfg['menu_options']
            ??
            [];

        if (! is_array($options)) {
            return $input['title'] ?? null;
        }

        foreach ($options as $index => $option) {

            if (! is_array($option)) {
                continue;
            }

            $optionSourceHandle =
                $option['source_handle']
                ??
                $option['sourceHandle']
                ??
                null;

            $optionId =
                $option['id']
                ??
                null;

            if (
                (string) $optionSourceHandle ===
                (string) $sourceHandle
            ) {

                return
                    $option['label']
                    ??
                    $option['title']
                    ??
                    $option['text']
                    ??
                    null;
            }

            if (
                (string) $optionId ===
                (string) $sourceHandle
            ) {

                return
                    $option['label']
                    ??
                    $option['title']
                    ??
                    $option['text']
                    ??
                    null;
            }
        }

        if (
            preg_match(
                '/^source-option-(\d+)$/',
                $sourceHandle,
                $matches
            )
        ) {

            $index =
                (int) $matches[1];

            if (
                isset($options[$index])
                &&
                is_array($options[$index])
            ) {

                return
                    $options[$index]['label']
                    ??
                    $options[$index]['title']
                    ??
                    $options[$index]['text']
                    ??
                    null;
            }
        }

        return $input['title'] ?? null;
    }

/*
|--------------------------------------------------------------------------
| SEND INPUT PROMPT
|--------------------------------------------------------------------------
*/
private function sendInputPrompt(
    BotSession $session,
    array $cfg
): void {

    $prompt = $cfg['prompt']
        ?? $cfg['message']
        ?? '';

    if (trim((string) $prompt) === '') {
        return;
    }

    /*
    |--------------------------------------------------------------------------
    | SESSION VARIABLES
    |--------------------------------------------------------------------------
    */

    $variables = $session->variables ?? [];

    if (is_string($variables)) {
        $variables = json_decode($variables, true) ?? [];
    }

    /*
    |--------------------------------------------------------------------------
    | RESOLVE VARIABLES
    |--------------------------------------------------------------------------
    */

    $prompt = $this->resolve(
        (string) $prompt,
        $variables
    );

    /*
    |--------------------------------------------------------------------------
    | ALLOW SKIP
    |--------------------------------------------------------------------------
    */

    $rawAllowSkip = $cfg['allow_skip']
        ?? $cfg['allowSkip']
        ?? $cfg['skip']
        ?? $cfg['is_optional']
        ?? $cfg['optional']
        ?? false;

    if (is_bool($rawAllowSkip)) {
        $allowSkip = $rawAllowSkip;
    } elseif (is_numeric($rawAllowSkip)) {
        $allowSkip = ((int) $rawAllowSkip) === 1;
    } else {
        $allowSkip = in_array(
            strtolower(trim((string) $rawAllowSkip)),
            [
                '1',
                'true',
                'yes',
                'on',
                'enabled',
                'allow',
                'allowed',
            ],
            true
        );
    }

    /*
    |--------------------------------------------------------------------------
    | BUTTONS - NO EXIT BUTTON
    |--------------------------------------------------------------------------
    */

    $buttons = [];

    if ($allowSkip) {
        $buttons[] = [
            'id' => 'skip',
            'title' => 'Skip',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | SEND MESSAGE
    |--------------------------------------------------------------------------
    */

    if (empty($buttons)) {
        $output = $this->whatsapp->sendText(
            $session->user_identifier,
            $prompt,

        );

        $this->saveOutbound(
            $session,
            'text',
            $prompt,
            $output
        );

        return;
    }

    $output = $this->whatsapp->sendInteractive(
        $session->user_identifier,
        $prompt,
        $buttons
    );

    /*
    |--------------------------------------------------------------------------
    | SAVE OUTBOUND MESSAGE
    |--------------------------------------------------------------------------
    */

    $this->saveOutbound(
        $session,
        'interactive',
        $prompt,
        $output
    );
}
    /*
    |--------------------------------------------------------------------------
    | SAVE OUTBOUND
    |--------------------------------------------------------------------------
    */



private function saveOutbound(
    BotSession $session,
    string $type,
    ?string $text,
    array $payload,
    ?array $sequence = null
): BotMessage {

    // Workflow se bot_id fallback lo.
    $botId = $session->bot_id
        ?? Workflow::where('id', $session->workflow_id)
            ->value('bot_id');

    Log::info('SAVE OUTBOUND SESSION DATA', [
        'session_id' => $session->id,
        'workflow_id' => $session->workflow_id,
        'user_id' => $session->user_id,
        'session_bot_id' => $session->bot_id,
        'resolved_bot_id' => $botId,
        'whatsapp_account_id' => $session->whatsapp_account_id,
    ]);

    $responseData = data_get($payload, 'data', []);

    $messageId =
        data_get($responseData, 'mid')
        ?? data_get($responseData, 'messages.0.id')
        ?? data_get($responseData, 'message_id')
        ?? data_get($responseData, 'id');

    $success = (bool) data_get($payload, 'success', false);

    $status = $success
        ? ($messageId ? 'sent' : 'pending')
        : 'failed';

    $storedPayload = $payload;

    if ($sequence !== null) {
        $storedPayload['_sequence'] = [
            'pending' => true,
            'workflow_id' => $sequence['workflow_id'] ?? null,
            'next_node_id' => $sequence['next_node_id'] ?? null,
            'input' => $sequence['input'] ?? [],
        ];
    }

    $message = new BotMessage();

    $message->bot_session_id = $session->id;
    $message->user_id = $session->user_id;
    $message->bot_id = $botId;
    $message->whatsapp_account_id = $session->whatsapp_account_id;

    $message->direction = 'outbound';
    $message->message_type = $type;
    $message->text = $text;
    $message->payload = $storedPayload;

    $message->external_message_id = $messageId;

    $message->delivery_status = $status;
    $message->external_status = $status;

    $message->sent_at = $success && $messageId ? now() : null;
    $message->delivered_at = null;
    $message->read_at = null;
    $message->failed_at = !$success ? now() : null;

    $message->save();

    Log::info('OUTBOUND MESSAGE SAVED SUCCESSFULLY', [
        'message_id' => $message->id,
        'bot_session_id' => $message->bot_session_id,
        'user_id' => $message->user_id,
        'bot_id' => $message->bot_id,
        'whatsapp_account_id' => $message->whatsapp_account_id,
        'external_message_id' => $message->external_message_id,
    ]);

    return $message;
}







/**
 * Handle WhatsApp delivery webhook.
 */
public function handleDeliveryWebhook(array $payload): void
{
    $eventType = strtoupper(trim((string) data_get(
        $payload,
        'events.eventType',
        ''
    )));

    if ($eventType !== 'DELIVERY EVENTS') {
        return;
    }

    $mid = trim((string) data_get(
        $payload,
        'events.mid',
        ''
    ));

    $sender = preg_replace(
        '/\D+/',
        '',
        (string) data_get($payload, 'sender.from', '')
    );

    $providerStatus = strtolower(trim((string) data_get(
        $payload,
        'notificationAttributes.status',
        ''
    )));

    $statusMap = [
        'queued'       => 'queued',
        'sent'         => 'sent',
        'delivered'    => 'delivered',
        'read'         => 'read',
        'failed'       => 'failed',
        'undelivered'  => 'failed',
        'un_delivered' => 'failed',
        'rejected'     => 'failed',
        'not sent'     => 'failed',
    ];

    $status = $statusMap[$providerStatus] ?? null;

    Log::info('WHATSAPP DELIVERY EVENT PARSED', [
        'event_type' => $eventType,
        'mid' => $mid,
        'sender' => $sender,
        'provider_status' => $providerStatus,
        'mapped_status' => $status,
    ]);

    if ($mid === '' || $status === null) {

        Log::warning('WHATSAPP DELIVERY EVENT INVALID', [
            'mid' => $mid,
            'sender' => $sender,
            'provider_status' => $providerStatus,
            'payload' => $payload,
        ]);

        return;
    }

    $this->processDeliveryStatus($mid, $status, $sender);
}





private function processDeliveryStatus(
    string $mid,
    string $status,
    string $sender
): void {

    $continuation = null;
    $walletDeductionMessageId = null;

    $status = strtolower(trim($status));
    $mid = trim($mid);
    $sender = trim($sender);

    if ($mid === '') {
        Log::warning('DELIVERY MID EMPTY');
        return;
    }

    /*
    |--------------------------------------------------------------------------
    | 1. PROCESS DELIVERY EVENT
    |--------------------------------------------------------------------------
    */

    try {

        DB::transaction(function () use (
            $mid,
            $status,
            $sender,
            &$continuation,
            &$walletDeductionMessageId
        ) {

            /*
            |--------------------------------------------------------------------------
            | 2. FIND OUTBOUND MESSAGE
            |--------------------------------------------------------------------------
            */

            $messages = BotMessage::query()
                ->where('external_message_id', $mid)
                ->where('direction', 'outbound')
                ->lockForUpdate()
                ->get();

            if ($messages->isEmpty()) {

                Log::warning('DELIVERY MESSAGE NOT FOUND', [
                    'mid' => $mid,
                    'status' => $status,
                    'sender' => $sender,
                ]);

                return;
            }

            if ($messages->count() !== 1) {

                Log::error('DUPLICATE DELIVERY MID FOUND', [
                    'mid' => $mid,
                    'message_ids' => $messages->pluck('id')->all(),
                    'bot_ids' => $messages->pluck('bot_id')->all(),
                    'account_ids' => $messages->pluck(
                        'whatsapp_account_id'
                    )->all(),
                ]);

                return;
            }

            $message = $messages->first();

            $messageId = (int) $message->id;

            /*
            |--------------------------------------------------------------------------
            | 3. MESSAGE OWNERSHIP
            |--------------------------------------------------------------------------
            */

            $botId = $message->bot_id
                ? (int) $message->bot_id
                : null;

            $userId = $message->user_id
                ? (int) $message->user_id
                : null;

            $accountId = $message->whatsapp_account_id
                ? (int) $message->whatsapp_account_id
                : null;

            if (!$userId || !$accountId) {

                Log::warning('DELIVERY MESSAGE DETAILS MISSING', [
                    'mid' => $mid,
                    'message_id' => $messageId,
                    'bot_id' => $botId,
                    'user_id' => $userId,
                    'whatsapp_account_id' => $accountId,
                ]);

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | 4. VERIFY WHATSAPP ACCOUNT
            |--------------------------------------------------------------------------
            */

            $account = WhatsAppAccount::query()
                ->where('id', $accountId)
                ->where('user_id', $userId)
                ->first();

            if (!$account) {

                Log::error('DELIVERY ACCOUNT VALIDATION FAILED', [
                    'mid' => $mid,
                    'message_id' => $messageId,
                    'account_id' => $accountId,
                    'user_id' => $userId,
                ]);

                return;
            }

            Log::info('DELIVERY ACCOUNT VERIFIED', [
                'mid' => $mid,
                'message_id' => $messageId,
                'user_id' => $userId,
                'whatsapp_account_id' => $account->id,
                'account_number' => $account->waba_id,
                'event_sender' => $sender,
            ]);

            /*
            |--------------------------------------------------------------------------
            | 5. DECODE MESSAGE PAYLOAD
            |--------------------------------------------------------------------------
            */

            $storedPayload = $message->payload ?? [];

            if (is_string($storedPayload)) {

                $storedPayload = json_decode(
                    $storedPayload,
                    true
                ) ?: [];
            }

            if (!is_array($storedPayload)) {
                $storedPayload = [];
            }

            $sequence = $storedPayload['_sequence'] ?? null;

            if (
                !is_array($sequence) ||
                empty($sequence['workflow_id'])
            ) {
                $sequence = null;
            }

            /*
            |--------------------------------------------------------------------------
            | 6. VERIFY WORKFLOW
            |--------------------------------------------------------------------------
            */

            $workflow = null;

            if ($sequence !== null) {

                $workflow = Workflow::query()
                    ->where('id', $sequence['workflow_id'])
                    ->where('user_id', $userId)
                    ->where('whatsapp_account_id', $accountId)
                    ->where('channel', 'whatsapp')
                    ->first();

                if (!$workflow) {

                    Log::error(
                        'DELIVERY WORKFLOW ACCOUNT VALIDATION FAILED',
                        [
                            'mid' => $mid,
                            'workflow_id' => $sequence['workflow_id'],
                            'user_id' => $userId,
                            'whatsapp_account_id' => $accountId,
                        ]
                    );

                    return;
                }

                $workflowBotId = (int) $workflow->bot_id;

                if (!$workflowBotId) {

                    Log::error('DELIVERY WORKFLOW BOT ID MISSING', [
                        'mid' => $mid,
                        'workflow_id' => $workflow->id,
                    ]);

                    return;
                }

                if (
                    $botId !== null &&
                    $botId !== $workflowBotId
                ) {

                    Log::error('DELIVERY BOT ID MISMATCH', [
                        'mid' => $mid,
                        'message_bot_id' => $botId,
                        'workflow_bot_id' => $workflowBotId,
                        'workflow_id' => $workflow->id,
                        'user_id' => $userId,
                        'whatsapp_account_id' => $accountId,
                    ]);

                    return;
                }

                $botId = $workflowBotId;

                $message->bot_id = $botId;
            }

            /*
            |--------------------------------------------------------------------------
            | 7. VERIFY BOT
            |--------------------------------------------------------------------------
            */

            if (!$botId) {

                Log::warning('DELIVERY BOT ID NOT FOUND', [
                    'mid' => $mid,
                    'message_id' => $messageId,
                    'user_id' => $userId,
                    'whatsapp_account_id' => $accountId,
                ]);

                return;
            }

            $now = now();

            /*
            |--------------------------------------------------------------------------
            | 8. FAILED STATUS
            |--------------------------------------------------------------------------
            */

            if ($status === 'failed') {

                if (!in_array(
                    $message->delivery_status,
                    ['delivered', 'read'],
                    true
                )) {

                    $message->bot_id = $botId;
                    $message->delivery_status = 'failed';
                    $message->external_status = 'failed';

                    $message->failed_at = $message->failed_at ?? $now;

                    $message->save();

                    Log::warning('DELIVERY MESSAGE FAILED', [
                        'mid' => $mid,
                        'message_id' => $messageId,
                        'workflow_id' => $workflow?->id,
                        'user_id' => $userId,
                        'whatsapp_account_id' => $accountId,
                    ]);
                }

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | 9. QUEUED / SENT STATUS
            |--------------------------------------------------------------------------
            */

            if (in_array($status, ['queued', 'sent'], true)) {

                if (!in_array(
                    $message->delivery_status,
                    ['delivered', 'read', 'failed'],
                    true
                )) {

                    $message->bot_id = $botId;
                    $message->delivery_status = $status;
                    $message->external_status = $status;

                    $message->save();
                }

                Log::info('DELIVERY NON FINAL STATUS PROCESSED', [
                    'mid' => $mid,
                    'message_id' => $messageId,
                    'status' => $status,
                ]);

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | 10. ONLY DELIVERED / READ CONTINUE
            |--------------------------------------------------------------------------
            */

            if (!in_array($status, ['delivered', 'read'], true)) {

                Log::info('DELIVERY UNKNOWN STATUS IGNORED', [
                    'mid' => $mid,
                    'message_id' => $messageId,
                    'status' => $status,
                ]);

                return;
            }



            $walletDeductionMessageId = $messageId;

            /*
            |--------------------------------------------------------------------------
            | 11. PREVENT DUPLICATE CONTINUATION
            |--------------------------------------------------------------------------
            */

            if (in_array(
                $message->delivery_status,
                ['delivered', 'read'],
                true
            )) {

                if (
                    $status === 'read' &&
                    $message->delivery_status === 'delivered'
                ) {

                    $message->bot_id = $botId;
                    $message->delivery_status = 'read';
                    $message->external_status = 'read';

                    $message->read_at = $message->read_at ?? $now;

                    $message->save();
                }

                Log::info('DELIVERY EVENT ALREADY PROCESSED', [
                    'mid' => $mid,
                    'message_id' => $messageId,
                    'current_status' => $message->delivery_status,
                    'received_status' => $status,
                ]);

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | 12. UPDATE DELIVERY STATUS
            |--------------------------------------------------------------------------
            */

            $message->bot_id = $botId;

            $message->delivery_status = $status;
            $message->external_status = $status;

            $message->delivered_at = $message->delivered_at ?? $now;

            if ($status === 'read') {
                $message->read_at = $message->read_at ?? $now;
            }

            /*
            |--------------------------------------------------------------------------
            | 13. VERIFY PENDING SEQUENCE
            |--------------------------------------------------------------------------
            */

            if (
                $sequence === null ||
                !$workflow ||
                empty($sequence['pending']) ||
                empty($sequence['next_node_id'])
            ) {

                $message->save();

                Log::info('DELIVERY NO PENDING CONTINUATION', [
                    'mid' => $mid,
                    'message_id' => $messageId,
                    'workflow_id' => $workflow?->id,
                    'sequence_exists' => $sequence !== null,
                    'pending' => $sequence['pending'] ?? false,
                    'next_node_id' => $sequence['next_node_id'] ?? null,
                ]);

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | 14. VERIFY SESSION BEFORE CLAIMING
            |--------------------------------------------------------------------------
            */

            $sessionId = $message->bot_session_id;

            if (!$sessionId) {

                $message->save();

                Log::warning('DELIVERY SESSION ID MISSING', [
                    'mid' => $mid,
                    'message_id' => $messageId,
                ]);

                return;
            }

            $verifiedSession = BotSession::query()
                ->where('id', $sessionId)
                ->where('user_id', $userId)
                ->where('bot_id', $botId)
                ->where('whatsapp_account_id', $accountId)
                ->where('workflow_id', $workflow->id)
                ->where('channel', 'whatsapp')
                ->first();

            if (!$verifiedSession) {

                $message->save();

                Log::error('DELIVERY SESSION VALIDATION FAILED', [
                    'mid' => $mid,
                    'message_id' => $messageId,
                    'session_id' => $sessionId,
                    'workflow_id' => $workflow->id,
                    'bot_id' => $botId,
                    'user_id' => $userId,
                    'whatsapp_account_id' => $accountId,
                ]);

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | 15. CLAIM CONTINUATION
            |--------------------------------------------------------------------------
            */

            $nextNodeId = $sequence['next_node_id'];

            $sequence['pending'] = false;
            $sequence['claimed_at'] = $now->toDateTimeString();

            $storedPayload['_sequence'] = $sequence;

            $message->payload = $storedPayload;

            $continuation = [
                'message_id' => $messageId,
                'workflow_id' => (int) $workflow->id,
                'next_node_id' => $nextNodeId,
                'input' => is_array($sequence['input'] ?? null)
                    ? $sequence['input']
                    : [],
                'bot_id' => $botId,
                'user_id' => $userId,
                'whatsapp_account_id' => $accountId,
                'bot_session_id' => (int) $sessionId,
            ];

            $message->save();

            Log::info('DELIVERY WORKFLOW CONTINUATION CLAIMED', [
                'mid' => $mid,
                'message_id' => $messageId,
                'workflow_id' => $workflow->id,
                'session_id' => $sessionId,
                'next_node_id' => $nextNodeId,
                'bot_id' => $botId,
                'user_id' => $userId,
                'whatsapp_account_id' => $accountId,
            ]);

        }, 3);

    } catch (\Throwable $e) {

        Log::error('DELIVERY STATUS TRANSACTION FAILED', [
            'mid' => $mid,
            'status' => $status,
            'sender' => $sender,
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);

        return;
    }


    if ($walletDeductionMessageId) {

        $messageIdForWallet = $walletDeductionMessageId;

        app()->terminating(function () use ($messageIdForWallet) {

            $this->processDeliveredMessageWallet(
                $messageIdForWallet
            );

        });
    }

    /*
    |--------------------------------------------------------------------------
    | 16. STOP IF NO CONTINUATION
    |--------------------------------------------------------------------------
    */

    if (!$continuation) {
        return;
    }

    /*
    |--------------------------------------------------------------------------
    | 17. LOAD VERIFIED WORKFLOW
    |--------------------------------------------------------------------------
    */

    $workflow = Workflow::query()
        ->where('id', $continuation['workflow_id'])
        ->where('user_id', $continuation['user_id'])
        ->where('bot_id', $continuation['bot_id'])
        ->where(
            'whatsapp_account_id',
            $continuation['whatsapp_account_id']
        )
        ->where('channel', 'whatsapp')
        ->first();

    if (!$workflow) {

        Log::error('DELIVERY CONTINUATION WORKFLOW NOT FOUND', [
            'mid' => $mid,
            'continuation' => $continuation,
        ]);

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | 18. LOAD VERIFIED SESSION
    |--------------------------------------------------------------------------
    */

    $session = BotSession::query()
        ->where('id', $continuation['bot_session_id'])
        ->where('user_id', $continuation['user_id'])
        ->where('bot_id', $continuation['bot_id'])
        ->where(
            'whatsapp_account_id',
            $continuation['whatsapp_account_id']
        )
        ->where('workflow_id', $workflow->id)
        ->where('channel', 'whatsapp')
        ->first();

    if (!$session) {

        Log::error('DELIVERY CONTINUATION SESSION NOT FOUND', [
            'mid' => $mid,
            'session_id' => $continuation['bot_session_id'],
            'workflow_id' => $workflow->id,
            'bot_id' => $continuation['bot_id'],
            'whatsapp_account_id' => $continuation['whatsapp_account_id'],
        ]);

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | 19. VERIFY WHATSAPP ACCOUNT
    |--------------------------------------------------------------------------
    */

    $continuationAccount = WhatsAppAccount::query()
        ->where('id', $continuation['whatsapp_account_id'])
        ->where('user_id', $continuation['user_id'])
        ->first();

    if (!$continuationAccount) {

        Log::error('DELIVERY CONTINUATION ACCOUNT NOT FOUND', [
            'mid' => $mid,
            'user_id' => $continuation['user_id'],
            'whatsapp_account_id' => $continuation['whatsapp_account_id'],
        ]);

        return;
    }

    if (empty($continuationAccount->waba_id)) {

        Log::error('DELIVERY CONTINUATION ACCOUNT NUMBER MISSING', [
            'mid' => $mid,
            'whatsapp_account_id' => $continuationAccount->id,
            'user_id' => $continuation['user_id'],
        ]);

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | 20. INITIALIZE CORRECT WHATSAPP ACCOUNT
    |--------------------------------------------------------------------------
    */

    try {

        $this->useWhatsAppAccount(
            (int) $continuation['user_id'],
            (string) $continuationAccount->waba_id
        );

        Log::info('DELIVERY WHATSAPP ACCOUNT INITIALIZED', [
            'mid' => $mid,
            'user_id' => $continuation['user_id'],
            'whatsapp_account_id' => $continuationAccount->id,
            'whatsapp_number' => $continuationAccount->waba_id,
        ]);

    } catch (\Throwable $e) {

        Log::error('DELIVERY WHATSAPP ACCOUNT INITIALIZATION FAILED', [
            'mid' => $mid,
            'user_id' => $continuation['user_id'],
            'whatsapp_account_id' => $continuation['whatsapp_account_id'],
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | 21. CONTINUATION STARTED
    |--------------------------------------------------------------------------
    */

    Log::info('DELIVERY WORKFLOW CONTINUATION STARTED', [
        'mid' => $mid,
        'message_id' => $continuation['message_id'],
        'workflow_id' => $workflow->id,
        'session_id' => $session->id,
        'bot_id' => $continuation['bot_id'],
        'user_id' => $continuation['user_id'],
        'whatsapp_account_id' => $continuation['whatsapp_account_id'],
        'whatsapp_number' => $continuationAccount->waba_id,
        'next_node_id' => $continuation['next_node_id'],
        'current_node_id' => $session->current_node_id,
    ]);

    /*
    |--------------------------------------------------------------------------
    | 22. EXECUTE NEXT NODE
    |--------------------------------------------------------------------------
    */

    try {

        Log::info('DELIVERY NODE EXECUTION STARTED', [
            'mid' => $mid,
            'workflow_id' => $workflow->id,
            'session_id' => $session->id,
            'current_node_id' => $session->current_node_id,
            'next_node_id' => $continuation['next_node_id'],
            'input_keys' => array_keys($continuation['input']),
        ]);

        $this->goToNode(
            $workflow,
            $session,
            $continuation['next_node_id'],
            $continuation['input']
        );

        Log::info('DELIVERY NODE EXECUTION COMPLETED', [
            'mid' => $mid,
            'workflow_id' => $workflow->id,
            'session_id' => $session->id,
            'next_node_id' => $continuation['next_node_id'],
        ]);

    } catch (\Throwable $e) {

        Log::error('DELIVERY NODE EXECUTION FAILED', [
            'mid' => $mid,
            'workflow_id' => $workflow->id,
            'session_id' => $session->id,
            'next_node_id' => $continuation['next_node_id'],
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);

    }
}



// private function processDeliveryStatus(
//     string $mid,
//     string $status,
//     string $sender
// ): void {

//     $continuation = null;

//     $status = strtolower(trim($status));
//     $mid = trim($mid);
//     $sender = trim($sender);

//     if ($mid === '') {
//         Log::warning('DELIVERY MID EMPTY');
//         return;
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | 1. PROCESS DELIVERY EVENT
//     |--------------------------------------------------------------------------
//     */

//     try {

//         DB::transaction(function () use (
//             $mid,
//             $status,
//             $sender,
//             &$continuation
//         ) {

//             /*
//             |--------------------------------------------------------------------------
//             | 2. FIND OUTBOUND MESSAGE
//             |--------------------------------------------------------------------------
//             */

//             $messages = BotMessage::query()
//                 ->where('external_message_id', $mid)
//                 ->where('direction', 'outbound')
//                 ->lockForUpdate()
//                 ->get();

//             if ($messages->isEmpty()) {

//                 Log::warning('DELIVERY MESSAGE NOT FOUND', [
//                     'mid' => $mid,
//                     'status' => $status,
//                     'sender' => $sender,
//                 ]);

//                 return;
//             }

//             if ($messages->count() !== 1) {

//                 Log::error('DUPLICATE DELIVERY MID FOUND', [
//                     'mid' => $mid,
//                     'message_ids' => $messages->pluck('id')->all(),
//                     'bot_ids' => $messages->pluck('bot_id')->all(),
//                     'account_ids' => $messages->pluck(
//                         'whatsapp_account_id'
//                     )->all(),
//                 ]);

//                 return;
//             }

//             $message = $messages->first();

//             $messageId = (int) $message->id;

//             /*
//             |--------------------------------------------------------------------------
//             | 3. MESSAGE OWNERSHIP
//             |--------------------------------------------------------------------------
//             */

//             $botId = $message->bot_id
//                 ? (int) $message->bot_id
//                 : null;

//             $userId = $message->user_id
//                 ? (int) $message->user_id
//                 : null;

//             $accountId = $message->whatsapp_account_id
//                 ? (int) $message->whatsapp_account_id
//                 : null;

//             if (!$userId || !$accountId) {

//                 Log::warning('DELIVERY MESSAGE DETAILS MISSING', [
//                     'mid' => $mid,
//                     'message_id' => $messageId,
//                     'bot_id' => $botId,
//                     'user_id' => $userId,
//                     'whatsapp_account_id' => $accountId,
//                 ]);

//                 return;
//             }

//             /*
//             |--------------------------------------------------------------------------
//             | 4. VERIFY WHATSAPP ACCOUNT
//             |--------------------------------------------------------------------------
//             */

//             $account = WhatsAppAccount::query()
//                 ->where('id', $accountId)
//                 ->where('user_id', $userId)
//                 ->first();

//             if (!$account) {

//                 Log::error('DELIVERY ACCOUNT VALIDATION FAILED', [
//                     'mid' => $mid,
//                     'message_id' => $messageId,
//                     'account_id' => $accountId,
//                     'user_id' => $userId,
//                 ]);

//                 return;
//             }

//             Log::info('DELIVERY ACCOUNT VERIFIED', [
//                 'mid' => $mid,
//                 'message_id' => $messageId,
//                 'user_id' => $userId,
//                 'whatsapp_account_id' => $account->id,
//                 'account_number' => $account->waba_id,
//                 'event_sender' => $sender,
//             ]);

//             /*
//             |--------------------------------------------------------------------------
//             | 5. DECODE MESSAGE PAYLOAD
//             |--------------------------------------------------------------------------
//             */

//             $storedPayload = $message->payload ?? [];

//             if (is_string($storedPayload)) {

//                 $storedPayload = json_decode(
//                     $storedPayload,
//                     true
//                 ) ?: [];
//             }

//             if (!is_array($storedPayload)) {
//                 $storedPayload = [];
//             }

//             $sequence = $storedPayload['_sequence'] ?? null;

//             if (
//                 !is_array($sequence) ||
//                 empty($sequence['workflow_id'])
//             ) {
//                 $sequence = null;
//             }

//             /*
//             |--------------------------------------------------------------------------
//             | 6. VERIFY WORKFLOW
//             |--------------------------------------------------------------------------
//             */

//             $workflow = null;

//             if ($sequence !== null) {

//                 $workflow = Workflow::query()
//                     ->where('id', $sequence['workflow_id'])
//                     ->where('user_id', $userId)
//                     ->where('whatsapp_account_id', $accountId)
//                     ->where('channel', 'whatsapp')
//                     ->first();

//                 if (!$workflow) {

//                     Log::error(
//                         'DELIVERY WORKFLOW ACCOUNT VALIDATION FAILED',
//                         [
//                             'mid' => $mid,
//                             'workflow_id' => $sequence['workflow_id'],
//                             'user_id' => $userId,
//                             'whatsapp_account_id' => $accountId,
//                         ]
//                     );

//                     return;
//                 }

//                 $workflowBotId = (int) $workflow->bot_id;

//                 if (!$workflowBotId) {

//                     Log::error('DELIVERY WORKFLOW BOT ID MISSING', [
//                         'mid' => $mid,
//                         'workflow_id' => $workflow->id,
//                     ]);

//                     return;
//                 }

//                 if (
//                     $botId !== null &&
//                     $botId !== $workflowBotId
//                 ) {

//                     Log::error('DELIVERY BOT ID MISMATCH', [
//                         'mid' => $mid,
//                         'message_bot_id' => $botId,
//                         'workflow_bot_id' => $workflowBotId,
//                         'workflow_id' => $workflow->id,
//                         'user_id' => $userId,
//                         'whatsapp_account_id' => $accountId,
//                     ]);

//                     return;
//                 }

//                 $botId = $workflowBotId;

//                 $message->bot_id = $botId;
//             }

//             /*
//             |--------------------------------------------------------------------------
//             | 7. VERIFY BOT
//             |--------------------------------------------------------------------------
//             */

//             if (!$botId) {

//                 Log::warning('DELIVERY BOT ID NOT FOUND', [
//                     'mid' => $mid,
//                     'message_id' => $messageId,
//                     'user_id' => $userId,
//                     'whatsapp_account_id' => $accountId,
//                 ]);

//                 return;
//             }

//             $now = now();

//             /*
//             |--------------------------------------------------------------------------
//             | 8. FAILED STATUS
//             |--------------------------------------------------------------------------
//             */

//             if ($status === 'failed') {

//                 if (!in_array(
//                     $message->delivery_status,
//                     ['delivered', 'read'],
//                     true
//                 )) {

//                     $message->bot_id = $botId;
//                     $message->delivery_status = 'failed';
//                     $message->external_status = 'failed';

//                     $message->failed_at = $message->failed_at ?? $now;

//                     $message->save();

//                     Log::warning('DELIVERY MESSAGE FAILED', [
//                         'mid' => $mid,
//                         'message_id' => $messageId,
//                         'workflow_id' => $workflow?->id,
//                         'user_id' => $userId,
//                         'whatsapp_account_id' => $accountId,
//                     ]);
//                 }

//                 return;
//             }

//             /*
//             |--------------------------------------------------------------------------
//             | 9. QUEUED / SENT STATUS
//             |--------------------------------------------------------------------------
//             */

//             if (in_array($status, ['queued', 'sent'], true)) {

//                 if (!in_array(
//                     $message->delivery_status,
//                     ['delivered', 'read', 'failed'],
//                     true
//                 )) {

//                     $message->bot_id = $botId;
//                     $message->delivery_status = $status;
//                     $message->external_status = $status;

//                     $message->save();
//                 }

//                 Log::info('DELIVERY NON FINAL STATUS PROCESSED', [
//                     'mid' => $mid,
//                     'message_id' => $messageId,
//                     'status' => $status,
//                 ]);

//                 return;
//             }

//             /*
//             |--------------------------------------------------------------------------
//             | 10. ONLY DELIVERED / READ CONTINUE
//             |--------------------------------------------------------------------------
//             */

//             if (!in_array($status, ['delivered', 'read'], true)) {

//                 Log::info('DELIVERY UNKNOWN STATUS IGNORED', [
//                     'mid' => $mid,
//                     'message_id' => $messageId,
//                     'status' => $status,
//                 ]);

//                 return;
//             }

//             /*
//             |--------------------------------------------------------------------------
//             | 11. PREVENT DUPLICATE CONTINUATION
//             |--------------------------------------------------------------------------
//             */

//             if (in_array(
//                 $message->delivery_status,
//                 ['delivered', 'read'],
//                 true
//             )) {

//                 if (
//                     $status === 'read' &&
//                     $message->delivery_status === 'delivered'
//                 ) {

//                     $message->bot_id = $botId;
//                     $message->delivery_status = 'read';
//                     $message->external_status = 'read';

//                     $message->read_at = $message->read_at ?? $now;

//                     $message->save();
//                 }

//                 Log::info('DELIVERY EVENT ALREADY PROCESSED', [
//                     'mid' => $mid,
//                     'message_id' => $messageId,
//                     'current_status' => $message->delivery_status,
//                     'received_status' => $status,
//                 ]);

//                 return;
//             }

//             /*
//             |--------------------------------------------------------------------------
//             | 12. UPDATE DELIVERY STATUS
//             |--------------------------------------------------------------------------
//             */

//             $message->bot_id = $botId;

//             $message->delivery_status = $status;
//             $message->external_status = $status;

//             $message->delivered_at = $message->delivered_at ?? $now;

//             if ($status === 'read') {
//                 $message->read_at = $message->read_at ?? $now;
//             }

//             /*
//             |--------------------------------------------------------------------------
//             | 13. VERIFY PENDING SEQUENCE
//             |--------------------------------------------------------------------------
//             */

//             if (
//                 $sequence === null ||
//                 !$workflow ||
//                 empty($sequence['pending']) ||
//                 empty($sequence['next_node_id'])
//             ) {

//                 $message->save();

//                 Log::info('DELIVERY NO PENDING CONTINUATION', [
//                     'mid' => $mid,
//                     'message_id' => $messageId,
//                     'workflow_id' => $workflow?->id,
//                     'sequence_exists' => $sequence !== null,
//                     'pending' => $sequence['pending'] ?? false,
//                     'next_node_id' => $sequence['next_node_id'] ?? null,
//                 ]);

//                 return;
//             }

//             /*
//             |--------------------------------------------------------------------------
//             | 14. VERIFY SESSION BEFORE CLAIMING
//             |--------------------------------------------------------------------------
//             */

//             $sessionId = $message->bot_session_id;

//             if (!$sessionId) {

//                 $message->save();

//                 Log::warning('DELIVERY SESSION ID MISSING', [
//                     'mid' => $mid,
//                     'message_id' => $messageId,
//                 ]);

//                 return;
//             }

//             $verifiedSession = BotSession::query()
//                 ->where('id', $sessionId)
//                 ->where('user_id', $userId)
//                 ->where('bot_id', $botId)
//                 ->where('whatsapp_account_id', $accountId)
//                 ->where('workflow_id', $workflow->id)
//                 ->where('channel', 'whatsapp')
//                 ->first();

//             if (!$verifiedSession) {

//                 $message->save();

//                 Log::error('DELIVERY SESSION VALIDATION FAILED', [
//                     'mid' => $mid,
//                     'message_id' => $messageId,
//                     'session_id' => $sessionId,
//                     'workflow_id' => $workflow->id,
//                     'bot_id' => $botId,
//                     'user_id' => $userId,
//                     'whatsapp_account_id' => $accountId,
//                 ]);

//                 return;
//             }

//             /*
//             |--------------------------------------------------------------------------
//             | 15. CLAIM CONTINUATION
//             |--------------------------------------------------------------------------
//             |
//             | This claim happens inside the same transaction as the message
//             | row lock. Duplicate delivery events cannot claim it again.
//             |
//             */

//             $nextNodeId = $sequence['next_node_id'];

//             $sequence['pending'] = false;
//             $sequence['claimed_at'] = $now->toDateTimeString();

//             $storedPayload['_sequence'] = $sequence;


//             $message->payload = $storedPayload;

//             $continuation = [
//                 'message_id' => $messageId,
//                 'workflow_id' => (int) $workflow->id,
//                 'next_node_id' => $nextNodeId,
//                 'input' => is_array($sequence['input'] ?? null)
//                     ? $sequence['input']
//                     : [],
//                 'bot_id' => $botId,
//                 'user_id' => $userId,
//                 'whatsapp_account_id' => $accountId,
//                 'bot_session_id' => (int) $sessionId,
//             ];

//             $message->save();

//             Log::info('DELIVERY WORKFLOW CONTINUATION CLAIMED', [
//                 'mid' => $mid,
//                 'message_id' => $messageId,
//                 'workflow_id' => $workflow->id,
//                 'session_id' => $sessionId,
//                 'next_node_id' => $nextNodeId,
//                 'bot_id' => $botId,
//                 'user_id' => $userId,
//                 'whatsapp_account_id' => $accountId,
//             ]);

//         }, 3);

//     } catch (\Throwable $e) {

//         Log::error('DELIVERY STATUS TRANSACTION FAILED', [
//             'mid' => $mid,
//             'status' => $status,
//             'sender' => $sender,
//             'error' => $e->getMessage(),
//             'file' => $e->getFile(),
//             'line' => $e->getLine(),
//         ]);

//         return;
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | 16. STOP IF NO CONTINUATION
//     |--------------------------------------------------------------------------
//     */

//     if (!$continuation) {
//         return;
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | 17. LOAD VERIFIED WORKFLOW
//     |--------------------------------------------------------------------------
//     */

//     $workflow = Workflow::query()
//         ->where('id', $continuation['workflow_id'])
//         ->where('user_id', $continuation['user_id'])
//         ->where('bot_id', $continuation['bot_id'])
//         ->where(
//             'whatsapp_account_id',
//             $continuation['whatsapp_account_id']
//         )
//         ->where('channel', 'whatsapp')
//         ->first();

//     if (!$workflow) {

//         Log::error('DELIVERY CONTINUATION WORKFLOW NOT FOUND', [
//             'mid' => $mid,
//             'continuation' => $continuation,
//         ]);

//         return;
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | 18. LOAD VERIFIED SESSION
//     |--------------------------------------------------------------------------
//     */

//     $session = BotSession::query()
//         ->where('id', $continuation['bot_session_id'])
//         ->where('user_id', $continuation['user_id'])
//         ->where('bot_id', $continuation['bot_id'])
//         ->where(
//             'whatsapp_account_id',
//             $continuation['whatsapp_account_id']
//         )
//         ->where('workflow_id', $workflow->id)
//         ->where('channel', 'whatsapp')
//         ->first();

//     if (!$session) {

//         Log::error('DELIVERY CONTINUATION SESSION NOT FOUND', [
//             'mid' => $mid,
//             'session_id' => $continuation['bot_session_id'],
//             'workflow_id' => $workflow->id,
//             'bot_id' => $continuation['bot_id'],
//             'whatsapp_account_id' => $continuation['whatsapp_account_id'],
//         ]);

//         return;
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | 19. VERIFY WHATSAPP ACCOUNT
//     |--------------------------------------------------------------------------
//     */

//     $continuationAccount = WhatsAppAccount::query()
//         ->where('id', $continuation['whatsapp_account_id'])
//         ->where('user_id', $continuation['user_id'])
//         ->first();

//     if (!$continuationAccount) {

//         Log::error('DELIVERY CONTINUATION ACCOUNT NOT FOUND', [
//             'mid' => $mid,
//             'user_id' => $continuation['user_id'],
//             'whatsapp_account_id' => $continuation['whatsapp_account_id'],
//         ]);

//         return;
//     }

//     if (empty($continuationAccount->waba_id)) {

//         Log::error('DELIVERY CONTINUATION ACCOUNT NUMBER MISSING', [
//             'mid' => $mid,
//             'whatsapp_account_id' => $continuationAccount->id,
//             'user_id' => $continuation['user_id'],
//         ]);

//         return;
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | 20. INITIALIZE CORRECT WHATSAPP ACCOUNT
//     |--------------------------------------------------------------------------
//     */

//     try {

//         $this->useWhatsAppAccount(
//             (int) $continuation['user_id'],
//             (string) $continuationAccount->waba_id
//         );

//         Log::info('DELIVERY WHATSAPP ACCOUNT INITIALIZED', [
//             'mid' => $mid,
//             'user_id' => $continuation['user_id'],
//             'whatsapp_account_id' => $continuationAccount->id,
//             'whatsapp_number' => $continuationAccount->waba_id,
//         ]);

//     } catch (\Throwable $e) {

//         Log::error('DELIVERY WHATSAPP ACCOUNT INITIALIZATION FAILED', [
//             'mid' => $mid,
//             'user_id' => $continuation['user_id'],
//             'whatsapp_account_id' => $continuation['whatsapp_account_id'],
//             'error' => $e->getMessage(),
//             'file' => $e->getFile(),
//             'line' => $e->getLine(),
//         ]);

//         return;
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | 21. CONTINUATION STARTED
//     |--------------------------------------------------------------------------
//     */

//     Log::info('DELIVERY WORKFLOW CONTINUATION STARTED', [
//         'mid' => $mid,
//         'message_id' => $continuation['message_id'],
//         'workflow_id' => $workflow->id,
//         'session_id' => $session->id,
//         'bot_id' => $continuation['bot_id'],
//         'user_id' => $continuation['user_id'],
//         'whatsapp_account_id' => $continuation['whatsapp_account_id'],
//         'whatsapp_number' => $continuationAccount->waba_id,
//         'next_node_id' => $continuation['next_node_id'],
//         'current_node_id' => $session->current_node_id,
//     ]);

//     /*
//     |--------------------------------------------------------------------------
//     | 22. EXECUTE NEXT NODE
//     |--------------------------------------------------------------------------
//     */

//     try {

//         Log::info('DELIVERY NODE EXECUTION STARTED', [
//             'mid' => $mid,
//             'workflow_id' => $workflow->id,
//             'session_id' => $session->id,
//             'current_node_id' => $session->current_node_id,
//             'next_node_id' => $continuation['next_node_id'],
//             'input_keys' => array_keys($continuation['input']),
//         ]);

//         $this->goToNode(
//             $workflow,
//             $session,
//             $continuation['next_node_id'],
//             $continuation['input']
//         );

//         Log::info('DELIVERY NODE EXECUTION COMPLETED', [
//             'mid' => $mid,
//             'workflow_id' => $workflow->id,
//             'session_id' => $session->id,
//             'next_node_id' => $continuation['next_node_id'],
//         ]);

//     } catch (\Throwable $e) {

//         Log::error('DELIVERY NODE EXECUTION FAILED', [
//             'mid' => $mid,
//             'workflow_id' => $workflow->id,
//             'session_id' => $session->id,
//             'next_node_id' => $continuation['next_node_id'],
//             'error' => $e->getMessage(),
//             'file' => $e->getFile(),
//             'line' => $e->getLine(),
//         ]);

//     }
// }


private function getBotIdFromMessageMid(string $mid): ?array
{
    $mid = trim($mid);

    if ($mid === '') {
        Log::warning('DELIVERY MID EMPTY');

        return null;
    }

    $messages = BotMessage::query()
        ->where('external_message_id', $mid)
        ->where('direction', 'outbound')
        ->limit(2)
        ->get([
            'id',
            'bot_id',
            'user_id',
            'whatsapp_account_id',
            'external_message_id',
            'delivery_status',
        ]);

    /*
    |--------------------------------------------------------------------------
    | Validate MID
    |--------------------------------------------------------------------------
    */

    if ($messages->count() !== 1) {

        Log::warning('DELIVERY MESSAGE LOOKUP AMBIGUOUS', [
            'mid' => $mid,
            'count' => $messages->count(),
        ]);

        return null;
    }

    $message = $messages->first();

    /*
    |--------------------------------------------------------------------------
    | Read details directly from bot_messages
    |--------------------------------------------------------------------------
    */

    $botId = $message->bot_id
        ? (int) $message->bot_id
        : null;

    $userId = $message->user_id
        ? (int) $message->user_id
        : null;

    $whatsappAccountId = $message->whatsapp_account_id
        ? (int) $message->whatsapp_account_id
        : null;

    /*
    |--------------------------------------------------------------------------
    | Validate message details
    |--------------------------------------------------------------------------
    */

    if (!$botId || !$userId || !$whatsappAccountId) {

        Log::warning('DELIVERY MESSAGE DETAILS MISSING', [
            'mid' => $mid,
            'message_id' => $message->id,
            'bot_id' => $botId,
            'user_id' => $userId,
            'whatsapp_account_id' => $whatsappAccountId,
        ]);

        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Success log
    |--------------------------------------------------------------------------
    */

    Log::info('DELIVERY MESSAGE DETAILS FOUND', [
        'mid' => $mid,
        'message_id' => $message->id,
        'bot_id' => $botId,
        'user_id' => $userId,
        'whatsapp_account_id' => $whatsappAccountId,
    ]);

    return [
        'message_id' => (int) $message->id,
        'bot_id' => $botId,
        'user_id' => $userId,
        'whatsapp_account_id' => $whatsappAccountId,
    ];
}



/*
|--------------------------------------------------------------------------
| PROCESS DELIVERED MESSAGE WALLET DEDUCTION
|--------------------------------------------------------------------------
*/

private function processDeliveredMessageWallet(int $messageId): void
{
    try {

        /*
        |--------------------------------------------------------------------------
        | 1. FIND DELIVERED MESSAGE
        |--------------------------------------------------------------------------
        */

        $message = BotMessage::query()
            ->where('id', $messageId)
            ->where('direction', 'outbound')
            ->whereIn('delivery_status', ['delivered', 'read'])
            ->first();

        if (!$message) {

            Log::info('WALLET DEDUCTION SKIPPED - MESSAGE NOT DELIVERED', [
                'message_id' => $messageId,
            ]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | 2. VERIFY USER AND WHATSAPP ACCOUNT
        |--------------------------------------------------------------------------
        */

        if (
            !$message->user_id ||
            !$message->whatsapp_account_id
        ) {

            Log::warning('WALLET DEDUCTION DETAILS MISSING', [
                'message_id' => $message->id,
                'user_id' => $message->user_id,
                'whatsapp_account_id' => $message->whatsapp_account_id,
            ]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | 3. FIND USER
        |--------------------------------------------------------------------------
        */

        $user = User::query()->find($message->user_id);

        if (!$user) {

            Log::warning('WALLET BILLING USER NOT FOUND', [
                'message_id' => $message->id,
                'user_id' => $message->user_id,
            ]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | 4. DEDUCT WALLET CREDIT
        |--------------------------------------------------------------------------
        */

        $walletTransaction = app(WalletService::class)
            ->deductDeliveredMessage(
                $user,
                (int) $message->id,
                (int) $message->whatsapp_account_id
            );

        /*
        |--------------------------------------------------------------------------
        | 5. SUCCESS LOG
        |--------------------------------------------------------------------------
        */

        Log::info('WHATSAPP MESSAGE WALLET DEDUCTION SUCCESS', [
            'message_id' => $message->id,
            'user_id' => $user->id,
            'whatsapp_account_id' => $message->whatsapp_account_id,
            'transaction_id' => $walletTransaction->id,
            'amount' => $walletTransaction->amount,
            'balance_after' => $walletTransaction->balance_after,
            'delivery_status' => $message->delivery_status,
        ]);

    } catch (\Throwable $e) {

        Log::error('WHATSAPP MESSAGE WALLET DEDUCTION FAILED', [
            'message_id' => $messageId,
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);
    }
}



private function sendMenu(
    BotSession $session,
    array $cfg,

): void {

    $message =
        $cfg['message']
        ?? $cfg['text']
        ?? 'Please select an option.';

    $variables = $session->variables ?? [];

    if (is_string($variables)) {
        $variables = json_decode($variables, true) ?? [];
    }

    $message = $this->resolve(
        (string) $message,
        $variables
    );

    $options =
        $cfg['menuOptions']
        ?? $cfg['options']
        ?? $cfg['menu_options']
        ?? [];

    if (!is_array($options)) {
        $options = [];
    }

    $normalizedOptions = [];

    foreach ($options as $index => $option) {

        if (!is_array($option)) {
            continue;
        }

        $sourceHandle = "source-option-{$index}";

        $label =
            $option['label']
            ?? $option['title']
            ?? $option['text']
            ?? 'Option ' . ($index + 1);

        $label = trim((string) $label);

        if ($label === '') {
            continue;
        }

        $normalizedOptions[] = [
            'id' => $sourceHandle,
            'label' => $label,
            'title' => $label,
            'source_handle' => $sourceHandle,
        ];
    }

    if (!empty($normalizedOptions)) {

        $whatsappResponse = $this->whatsapp->sendMenuButtons(
            $session->user_identifier,
            $message,
            $normalizedOptions,

        );

        // Extract ONLY MID
        $messageId =
            data_get($whatsappResponse, 'data.mid')
            ?? data_get($whatsappResponse, 'mid');

        $success = (bool) (
            data_get($whatsappResponse, 'success', false)
        );

        $payload = [
            'type' => 'menu',
            'message' => $message,
            'options' => $normalizedOptions,
            'whatsapp_response' => $whatsappResponse,
        ];

        BotMessage::create([
            'bot_session_id' => $session->id,
            'user_id' => $session->user_id,
            'bot_id' => $session->bot_id,
            'whatsapp_account_id' => $session->whatsapp_account_id,

            'direction' => 'outbound',
            'message_type' => 'menu',
            'text' => $message,
            'payload' => $payload,

            'external_message_id' => $messageId,

            'delivery_status' => $success
                ? ($messageId ? 'sent' : 'pending')
                : 'failed',

            'external_status' => $success
                ? ($messageId ? 'sent' : 'pending')
                : 'failed',

            'sent_at' => $success && $messageId ? now() : null,
            'delivered_at' => null,
            'read_at' => null,
            'failed_at' => !$success ? now() : null,
        ]);
    }
}




private function sendButton(
    Workflow $workflow,
    BotSession $session,
    string $nodeId,
    array $cfg
): void {
    $message = $this->resolve(
        (string) ($cfg['message'] ?? $cfg['text'] ?? ''),
        $session->variables ?? []
    );

    /*
    |--------------------------------------------------------------------------
    | Collect primary button
    |--------------------------------------------------------------------------
    */

    $buttons = [
        [
            'type' => strtolower((string) (
                $cfg['buttonType']
                ?? $cfg['button_type']
                ?? 'reply'
            )),
            'title' => trim((string) (
                $cfg['buttonText']
                ?? $cfg['button_text']
                ?? $cfg['label']
                ?? $cfg['title']
                ?? 'Continue'
            )),
            'url' => trim((string) (
                $cfg['buttonUrl']
                ?? $cfg['button_url']
                ?? $cfg['url']
                ?? ''
            )),
            'source_handle' => trim((string) (
                $cfg['source_handle']
                ?? $cfg['sourceHandle']
                ?? ''
            )),
        ],
    ];

    /*
    |--------------------------------------------------------------------------
    | Collect extra buttons
    |--------------------------------------------------------------------------
    */

    $extraButtons = $cfg['extraButtons']
        ?? $cfg['extra_buttons']
        ?? [];

    foreach ($extraButtons as $extra) {
        if (!is_array($extra)) {
            continue;
        }

        $buttons[] = [
            'type' => strtolower((string) (
                $extra['type']
                ?? $extra['buttonType']
                ?? $extra['button_type']
                ?? 'reply'
            )),
            'title' => trim((string) (
                $extra['text']
                ?? $extra['title']
                ?? $extra['label']
                ?? ''
            )),
            'url' => trim((string) (
                $extra['url']
                ?? $extra['buttonUrl']
                ?? $extra['button_url']
                ?? ''
            )),
            'source_handle' => trim((string) (
                $extra['source_handle']
                ?? $extra['sourceHandle']
                ?? ''
            )),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Load edges for this node
    |--------------------------------------------------------------------------
    */

    $edges = $workflow->edges()
        ->where('source', $nodeId)
        ->get()
        ->keyBy('source_handle');

    $replyButtons = [];
    $urlButtons = [];
    $replyIndex = 0;

    /*
    |--------------------------------------------------------------------------
    | Prepare buttons
    |--------------------------------------------------------------------------
    */

    foreach ($buttons as $index => $button) {
        $type = strtolower(trim((string) $button['type']));
        $title = trim((string) $button['title']);
        $url = trim((string) $button['url']);

        if ($title === '') {
            continue;
        }

        /*
        |--------------------------------------------------------------------------
        | URL button does not need an edge
        |--------------------------------------------------------------------------
        */

        if ($type === 'url') {
            if (
                $url === ''
                || !filter_var($url, FILTER_VALIDATE_URL)
                || strtolower((string) parse_url(
                    $url,
                    PHP_URL_SCHEME
                )) !== 'https'
            ) {
                throw new \RuntimeException(
                    "Button '{$title}' requires a valid HTTPS URL."
                );
            }

            if (count($urlButtons) >= 1) {
                throw new \RuntimeException(
                    'Only one URL button is supported.'
                );
            }

            $urlButtons[] = [
                'type' => 'url',
                'title' => $title,
                'url' => $url,
            ];

            continue;
        }

        /*
        |--------------------------------------------------------------------------
        | Reply button
        |--------------------------------------------------------------------------
        */

        if ($type !== 'reply') {
            throw new \RuntimeException(
                "Unsupported button type '{$type}' for '{$title}'."
            );
        }

        /*
         * Prefer the exact handle supplied by the button configuration.
         */
        $handle = trim((string) $button['source_handle']);

        if ($handle !== '') {
            $edge = $edges->get($handle);
        } else {
            $edge = null;
        }

        /*
         * Fallback to the conventional option handle.
         */
        if (!$edge) {
            $handle = 'source-option-' . $index;
            $edge = $edges->get($handle);
        }

        /*
         * Fallback to source-bottom only when that saved edge exists.
         */
        if (!$edge) {
            $bottomEdge = $edges->get('source-bottom');

            if ($bottomEdge) {
                $handle = 'source-bottom';
                $edge = $bottomEdge;
            }
        }

        /*
         * Final fallback: sequential reply handle.
         */
        if (!$edge) {
            $fallbackHandle = 'source-option-' . $replyIndex;
            $fallbackEdge = $edges->get($fallbackHandle);

            if ($fallbackEdge) {
                $handle = $fallbackHandle;
                $edge = $fallbackEdge;
            }
        }

        if (!$edge) {
            throw new \RuntimeException(
                "No saved edge found for reply button '{$title}'. "
                . 'Available handles: '
                . $edges->keys()->implode(', ')
            );
        }

        $replyButtons[] = [
            'type' => 'reply',
            'title' => $title,
            'id' => $handle,
            'source_handle' => $handle,
        ];

        $replyIndex++;
    }

    /*
    |--------------------------------------------------------------------------
    | Validate limits
    |--------------------------------------------------------------------------
    */

    if (count($replyButtons) > 3) {
        throw new \RuntimeException(
            'WhatsApp supports a maximum of 3 reply buttons.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | URL button first, then reply buttons
    |--------------------------------------------------------------------------
    */

    $buttonsToSend = array_merge(
        $urlButtons,
        $replyButtons
    );

    if (empty($buttonsToSend)) {
        throw new \RuntimeException(
            "No valid buttons configured for node {$nodeId}."
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Send WhatsApp message
    |--------------------------------------------------------------------------
    */

    $whatsappResponse = $this->whatsapp->sendInteractive(
        $session->user_identifier,
        $message,
        $buttonsToSend
    );

    if (
        empty($whatsappResponse['success'])
        || !empty($whatsappResponse['error'])
    ) {
        throw new \RuntimeException(
            $whatsappResponse['message']
            ?? 'WhatsApp interactive message failed.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Save outbound message
    |--------------------------------------------------------------------------
    */

    BotMessage::create([
        'bot_session_id' => $session->id,
        'direction' => 'outbound',
        'message_type' => 'button',
        'text' => $message,
        'payload' => [
            'type' => 'button',
            'message' => $message,
            'buttons' => $buttonsToSend,
            'whatsapp_response' => $whatsappResponse,
        ],
    ]);
}
    /*
    |--------------------------------------------------------------------------
    | EXECUTE API
    |--------------------------------------------------------------------------
    */

    private function executeApi(
        array $cfg,
        BotSession $session
    ): array {

        $method =
            strtoupper(
                $cfg['method'] ?? 'GET'
            );

        $url =
            $cfg['api_url']
            ??
            $cfg['apiUrl']
            ??
            $cfg['url']
            ??
            '';

        $url =
            $this->resolve(
                (string) $url,
                $session->variables ?? []
            );

        if ($url === '') {

            return [
                'success' => false,
                'message' => 'API URL is empty.',
            ];
        }

        if (
            str_starts_with(
                $url,
                '/'
            )
        ) {

            $url = url($url);
        }

        $response =
            Http::timeout(15)
                ->send(
                    $method,
                    $url
                );

        if (! $response->successful()) {

            return [
                'success' => false,
                'status_code' => $response->status(),
                'message' => $response->body(),
            ];
        }

        $json =
            $response->json();

        return is_array($json)
            ? $json
            : [
                'success' => true,
                'data' => $json,
            ];
    }

    /*
    |--------------------------------------------------------------------------
    | EVALUATE CONDITION
    |--------------------------------------------------------------------------
    */

    private function evaluateCondition(
        string $condition,
        array $variables
    ): bool {

        if ($condition === '') {
            return false;
        }

        $condition =
            $this->resolve(
                $condition,
                $variables
            );

        if (
            ! preg_match(
                '/^\s*([a-zA-Z0-9_.-]+)\s*(==|!=|>=|<=|>|<)\s*(.+?)\s*$/',
                $condition,
                $matches
            )
        ) {

            return false;
        }

        $leftKey =
            $matches[1];

        $operator =
            $matches[2];

        $right =
            trim(
                $matches[3]
            );

        $left =
            data_get(
                $variables,
                $leftKey
            );

        $right =
            trim(
                $right,
                "\"'"
            );

        if (
            is_numeric($left)
            &&
            is_numeric($right)
        ) {

            $leftValue =
                (float) $left;

            $rightValue =
                (float) $right;

        } else {

            $leftValue =
                strtolower(
                    trim(
                        (string) $left
                    )
                );

            $rightValue =
                strtolower(
                    trim(
                        (string) $right
                    )
                );
        }

        return match ($operator) {

            '==' => $leftValue == $rightValue,

            '!=' => $leftValue != $rightValue,

            '>' => $leftValue > $rightValue,

            '<' => $leftValue < $rightValue,

            '>=' => $leftValue >= $rightValue,

            '<=' => $leftValue <= $rightValue,

            default => false,
        };
    }


    /*
    |--------------------------------------------------------------------------
    | SAVE CUSTOMER LEAD
    |--------------------------------------------------------------------------
    */

    private function saveCustomerLead(
        Workflow $workflow,
        BotSession $session
    ): void {

        $session->refresh();

        $variables =
            $session->variables ?? [];

        $mobile =
            $variables['mobile']
            ??
            $variables['phone']
            ??
            $variables['phone_number']
            ??
            $variables['contact']
            ??
            $session->user_identifier
            ??
            null;

        CustomerLead::updateOrCreate(
            [
                'session_id' => $session->id,
            ],
            [
                'workflow_id' => $workflow->id,

                'mobile' => $mobile,

                'status' => 'new',

                'details' => $variables,
            ]
        );
    }



    /**
 * =====================================================
 * SEND TEXT WITH EXIT BUTTON
 * =====================================================
 */

private function sendTextWithExit(
    BotSession $session,
    string $text
): array {

    $output = $this->whatsapp->sendText(
        $session->user_identifier,
        $text,

    );

    $this->saveOutbound(
        $session,
        'text',
        $text,
        $output
    );

    return $output;
}


}
