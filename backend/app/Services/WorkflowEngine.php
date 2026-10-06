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

class WorkflowEngine
{
    public function __construct(
        private WhatsAppService $whatsapp,

    ) {}
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

    public function findWorkflowByTrigger(string $message): ?Workflow
    {
        $message = mb_strtolower(
            trim($message)
        );

        if ($message === '') {
            return null;
        }

        $workflows = Workflow::query()
            ->where('channel', 'whatsapp')
            ->where('status', 'published')
            ->get();

        foreach ($workflows as $workflow) {

            $startNode = $workflow->nodes()
                ->where('node_type', 'start')
                ->first();

            if (! $startNode) {
                continue;
            }

            $cfg = $startNode->configuration ?? [];

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
                continue;
            }

            $triggers = [];

            if (
                isset($cfg['triggerText'])
                &&
                ! is_array($cfg['triggerText'])
            ) {
                $triggers[] = $cfg['triggerText'];
            }

            if (
                isset($cfg['trigger'])
                &&
                ! is_array($cfg['trigger'])
            ) {
                $triggers[] = $cfg['trigger'];
            }

            if (isset($cfg['triggers'])) {

                if (is_array($cfg['triggers'])) {

                    foreach ($cfg['triggers'] as $trigger) {
                        $triggers[] = $trigger;
                    }

                } else {

                    $triggers[] = $cfg['triggers'];
                }
            }

            if (
                isset($cfg['keyword'])
                &&
                ! is_array($cfg['keyword'])
            ) {
                $triggers[] = $cfg['keyword'];
            }

            if (isset($cfg['keywords'])) {

                if (is_array($cfg['keywords'])) {

                    foreach ($cfg['keywords'] as $trigger) {
                        $triggers[] = $trigger;
                    }

                } else {

                    $triggers[] = $cfg['keywords'];
                }
            }

            $normalizedTriggers = [];

            foreach ($triggers as $trigger) {

                if (
                    is_array($trigger)
                    ||
                    is_object($trigger)
                ) {
                    continue;
                }

                $trigger = mb_strtolower(
                    trim((string) $trigger)
                );

                if ($trigger === '') {
                    continue;
                }

                $normalizedTriggers[] = $trigger;
            }

            $normalizedTriggers = array_values(
                array_unique(
                    $normalizedTriggers
                )
            );

            foreach ($normalizedTriggers as $trigger) {

                if ($message === $trigger) {

                    return $workflow;
                }
            }
        }

        return null;
    }

    public function findActiveSession(string $user): ?BotSession
    {
        return BotSession::query()
            ->where('channel', 'whatsapp')
            ->where('user_identifier', $user)
            ->whereIn('status', [
                'active',
                'waiting',
            ])
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

        $messageNormalized = mb_strtolower(
            trim($message)
        );

        $exitCommands = [
            'exit',
            'stop',
            'cancel',
            'quit',
            'end',
        ];

        if (in_array($messageNormalized, $exitCommands, true)) {

            $session = $this->findActiveSession($user);

            if ($session) {

                $session->update([
                    'status' => 'completed',
                    'current_node_id' => null,
                    'last_message_at' => now(),
                ]);

                $session->refresh();

                $exitMessage =
                    'You have exited the current journey. You can start again anytime.';

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

                return $session;
            }

            return null;
        }

        $existingSession = $this->findActiveSession($user);

        if ($existingSession) {

            $workflow = Workflow::query()
                ->where('id', $existingSession->workflow_id)
                ->where('channel', 'whatsapp')
                ->where('status', 'published')
                ->first();

            if (! $workflow) {

                return $existingSession;
            }

            $currentNodeId = $existingSession->current_node_id;

            if (! $currentNodeId) {

                $startNode = $this->getStartNode($workflow);

                if (! $startNode) {

                    return $existingSession;
                }

                $existingSession->update([
                    'current_node_id' => $startNode->node_id,
                    'status' => 'active',
                    'last_message_at' => now(),
                ]);

                $existingSession->refresh();

                $this->execute(
                    $workflow,
                    $existingSession,
                    (string) $startNode->node_id,
                    []
                );

                $existingSession->refresh();

                return $existingSession;
            }

            $nodeInput = $incoming;

            $nodeInput['text'] = $message;

            $this->execute(
                $workflow,
                $existingSession,
                (string) $currentNodeId,
                $nodeInput
            );

            $existingSession->refresh();

            return $existingSession;
        }

        $workflow = $this->findWorkflowByTrigger($message);

        if (! $workflow) {

            return null;
        }

        return $this->start(
            $workflow,
            $user,
            $incoming
        );
    }

    public function start(
        Workflow $workflow,
        string $user,
        array $incoming = []
    ): BotSession {

        $existingSession = $this->findActiveSession($user);

        if ($existingSession) {

            return $existingSession;
        }

        $session = BotSession::query()
            ->where('channel', 'whatsapp')
            ->where('user_identifier', $user)
            ->where('workflow_id', $workflow->id)
            ->orderByDesc('id')
            ->first();

        if (! $session) {

            $session = BotSession::create([
                'channel' => 'whatsapp',
                'user_identifier' => $user,
                'workflow_id' => $workflow->id,
                'variables' => [],
                'status' => 'active',
                'current_node_id' => null,
                'last_message_at' => now(),
            ]);

        } else {

            $session->update([
                'workflow_id' => $workflow->id,
                'variables' => [],
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

        $session->refresh();

        return $session;
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

        $log = WorkflowExecution::create([
            'workflow_id' => $workflow->id,
            'bot_session_id' => $session->id,
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
                        ??
                        $cfg['startMessage']
                        ??
                        $cfg['start_message']
                        ??
                        $cfg['text']
                        ??
                        ''
                    )
                );

                if ($startMessage !== '') {

                    $startMessage = $this->resolve(
                        $startMessage,
                        $session->variables ?? []
                    );

                    $output = $this->whatsapp->sendText(
                        $session->user_identifier,
                        $startMessage
                    );

                    $this->saveOutbound(
                        $session,
                        'text',
                        $startMessage,
                        $output
                    );
                }

                $next = $this->nextNode(
                    $workflow,
                    $nodeId
                );

                if ($next) {

                    $this->goToNode(
                        $workflow,
                        $session,
                        $next
                    );

                } else {

                    $session->update([
                        'current_node_id' => $nodeId,
                        'status' => 'completed',
                        'last_message_at' => now(),
                    ]);
                }
            } elseif ($type === 'message') {

                $text = $this->resolve(
                    (string) (
                        $cfg['message']
                        ??
                        $cfg['text']
                        ??
                        ''
                    ),
                    $session->variables ?? []
                );

                if ($text !== '') {

                    $output = $this->whatsapp->sendText(
                        $session->user_identifier,
                        $text
                    );

                    $this->saveOutbound(
                        $session,
                        'text',
                        $text,
                        $output
                    );
                }

                $next = $this->nextNode(
                    $workflow,
                    $nodeId
                );

                if ($next) {

                    $this->goToNode(
                        $workflow,
                        $session,
                        $next
                    );
                }
            } elseif ($type === 'menu') {

                if (! empty($input['source_handle'])) {

                    $sourceHandle =
                        (string) $input['source_handle'];

                    $next = $this->nextNode(
                        $workflow,
                        $nodeId,
                        $sourceHandle
                    );

                    $variable =
                        $cfg['variable'] ?? null;

                    if ($variable) {

                        $selectedLabel =
                            $this->getMenuOptionLabel(
                                $cfg,
                                $sourceHandle,
                                $input
                            );

                        if (
                            $selectedLabel !== null
                            &&
                            trim((string) $selectedLabel) !== ''
                        ) {

                            $variables =
                                $session->variables ?? [];

                            $variables[$variable] =
                                trim(
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
                            $next
                        );

                        return;
                    }

                    $validationMessage =
                        $cfg['validation_message']
                        ??
                        $cfg['validationMessage']
                        ??
                        '⚠️ This option is not available right now. Please select another option.';

                    $validationMessage =
                        $this->resolve(
                            (string) $validationMessage,
                            $session->variables ?? []
                        );

                    $output =
                        $this->whatsapp->sendText(
                            $session->user_identifier,
                            $validationMessage
                        );

                    $this->saveOutbound(
                        $session,
                        'text',
                        $validationMessage,
                        $output
                    );

                    $this->sendMenu(
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

                if (array_key_exists('text', $input)) {

                    $typedText =
                        trim(
                            (string) (
                                $input['text'] ?? ''
                            )
                        );

                    $matchedOption =
                        $this->findMenuOptionByText(
                            $cfg,
                            $typedText
                        );

                    if ($matchedOption !== null) {

                        $sourceHandle =
                            $matchedOption['source_handle'];

                        $selectedLabel =
                            $matchedOption['label'];

                        $variable =
                            $cfg['variable'] ?? null;

                        if ($variable) {

                            $variables =
                                $session->variables ?? [];

                            $variables[$variable] =
                                $selectedLabel;

                            $session->update([
                                'variables' => $variables,
                                'status' => 'active',
                                'last_message_at' => now(),
                            ]);

                            $session->refresh();
                        }

                        $next =
                            $this->nextNode(
                                $workflow,
                                $nodeId,
                                $sourceHandle
                            );

                        if ($next) {

                            $this->goToNode(
                                $workflow,
                                $session,
                                $next
                            );

                            return;
                        }
                    }

                    $validationMessage =
                        $cfg['validation_message']
                        ??
                        $cfg['validationMessage']
                        ??
                        '⚠️ Please select one of the options above.';

                    $validationMessage =
                        $this->resolve(
                            (string) $validationMessage,
                            $session->variables ?? []
                        );

                    $output =
                        $this->whatsapp->sendText(
                            $session->user_identifier,
                            $validationMessage
                        );

                    $this->saveOutbound(
                        $session,
                        'text',
                        $validationMessage,
                        $output
                    );

                    $this->sendMenu(
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

                $this->sendMenu(
                    $session,
                    $cfg
                );

                $session->update([
                    'current_node_id' => $nodeId,
                    'status' => 'waiting',
                    'last_message_at' => now(),
                ]);
            }

            /*
|--------------------------------------------------------------------------
| IMAGE
|--------------------------------------------------------------------------
*/

            elseif ($type === 'image') {

                $mediaUrl = $this->resolveMediaUrl(
                    $cfg,
                    $workflow
                );

                $caption = $cfg['caption']
                    ?? $cfg['message']
                    ?? $cfg['text']
                    ?? '';

                $mediaUrl = $this->resolve(
                    (string) $mediaUrl,
                    $session->variables ?? []
                );

                $caption = $this->resolve(
                    (string) $caption,
                    $session->variables ?? []
                );

                if ($mediaUrl === '') {

                    throw new \RuntimeException(
                        'Image media URL is empty.'
                    );
                }

                $output = $this->whatsapp->sendImage(
                    $session->user_identifier,
                    $mediaUrl,
                    $caption
                );

                $this->saveOutbound(
                    $session,
                    'image',
                    $caption !== '' ? $caption : null,
                    $output
                );

                $next = $this->nextNode(
                    $workflow,
                    $nodeId
                );

                if ($next) {

                    $this->goToNode(
                        $workflow,
                        $session,
                        $next
                    );
                }
            }

            /*
            |--------------------------------------------------------------------------
            | DOCUMENT / PDF
            |--------------------------------------------------------------------------
            */

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

                $this->saveOutbound(
                    $session,
                    'document',
                    $caption !== '' ? $caption : $filename,
                    $output
                );

                $next = $this->nextNode(
                    $workflow,
                    $nodeId
                );

                if ($next) {

                    $this->goToNode(
                        $workflow,
                        $session,
                        $next
                    );
                }
            }

            /*
            |--------------------------------------------------------------------------
            | AUDIO
            |--------------------------------------------------------------------------
            */
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

                $this->saveOutbound(
                    $session,
                    'audio',
                    null,
                    $output
                );

                $next = $this->nextNode(
                    $workflow,
                    $nodeId
                );

                if ($next) {

                    $this->goToNode(
                        $workflow,
                        $session,
                        $next
                    );
                }
            }

            /*
            |--------------------------------------------------------------------------
            | MEDIA TEMPLATE
            |--------------------------------------------------------------------------
            */
            elseif ($type === 'media_template') {

                /*
                |--------------------------------------------------------------------------
                | TEMPLATE NAME
                |--------------------------------------------------------------------------
                */

                $templateName = $cfg['templateName']
                    ?? $cfg['template_name']
                    ?? $cfg['name']
                    ?? '';

                /*
                |--------------------------------------------------------------------------
                | TEMPLATE ID
                |--------------------------------------------------------------------------
                */

                $templateId = $cfg['templateId']
                    ?? $cfg['template_id']
                    ?? $cfg['id']
                    ?? '';

                /*
                |--------------------------------------------------------------------------
                | TEMPLATE LANGUAGE
                |--------------------------------------------------------------------------
                */

                $templateLanguage = $cfg['templateLanguage']
                    ?? $cfg['template_language']
                    ?? $cfg['language']
                    ?? 'en';

                /*
                |--------------------------------------------------------------------------
                | TEMPLATE BODY
                |--------------------------------------------------------------------------
                */

                $templateBody = $cfg['templateBody']
                    ?? $cfg['template_body']
                    ?? $cfg['body']
                    ?? $cfg['caption']
                    ?? $cfg['message']
                    ?? '';

                /*
                |--------------------------------------------------------------------------
                | TEMPLATE IMAGE URL
                |--------------------------------------------------------------------------
                |
                | Support all possible frontend/backend field names.
                |
                */

                $templateImageUrl = $cfg['templateImageUrl']
                    ?? $cfg['template_image_url']
                    ?? $cfg['image_url']
                    ?? $cfg['imageUrl']
                    ?? $cfg['template_image']
                    ?? $cfg['templateImage']
                    ?? $cfg['media_url']
                    ?? $cfg['mediaUrl']
                    ?? $cfg['url']
                    ?? '';

                /*
                |--------------------------------------------------------------------------
                | MEDIA UPLOAD ID
                |--------------------------------------------------------------------------
                */

                $mediaUploadId = $cfg['media_upload_id']
                    ?? $cfg['mediaUploadId']
                    ?? $cfg['media_id']
                    ?? $cfg['mediaId']
                    ?? null;

                /*
                |--------------------------------------------------------------------------
                | TEMPLATE VARIABLES
                |--------------------------------------------------------------------------
                */

                $templateVariables = $cfg['templateVariables']
                    ?? $cfg['template_variables']
                    ?? $cfg['variables']
                    ?? [];

                if (! is_array($templateVariables)) {
                    $templateVariables = [];
                }

                /*
                |--------------------------------------------------------------------------
                | SESSION VARIABLES
                |--------------------------------------------------------------------------
                */

                $variables = $session->variables ?? [];

                /*
                |--------------------------------------------------------------------------
                | RESOLVE TEMPLATE BASIC VALUES
                |--------------------------------------------------------------------------
                */

                $templateName = $this->resolve(
                    (string) $templateName,
                    $variables
                );

                $templateId = $this->resolve(
                    (string) $templateId,
                    $variables
                );

                $templateLanguage = $this->resolve(
                    (string) $templateLanguage,
                    $variables
                );

                $templateBody = $this->resolve(
                    (string) $templateBody,
                    $variables
                );

                $templateImageUrl = $this->resolve(
                    (string) $templateImageUrl,
                    $variables
                );

                /*
                |--------------------------------------------------------------------------
                | RESOLVE IMAGE FROM MEDIA_UPLOADS
                |--------------------------------------------------------------------------
                |
                | If image URL is not directly available but media_upload_id exists,
                | get URL from media_uploads table.
                |
                */

                if (
                    trim($templateImageUrl) === ''
                    &&
                    ! empty($mediaUploadId)
                ) {

                    $media = MediaUpload::query()
                        ->where('id', $mediaUploadId)
                        ->where('status', 'active')
                        ->first();

                    if (! $media) {

                        throw new \RuntimeException(
                            "Media upload not found: {$mediaUploadId}"
                        );
                    }

                    $templateImageUrl =
                        $media->url
                        ?? $media->file_url
                        ?? $media->media_url
                        ?? '';

                    $templateImageUrl = trim(
                        (string) $templateImageUrl
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | FALLBACK: RESOLVE MEDIA URL
                |--------------------------------------------------------------------------
                */

                if (trim($templateImageUrl) === '') {

                    try {

                        $mediaConfig = $cfg;

                        /*
                         * Convert template-specific media ID
                         * into the generic resolver fields.
                         */

                        if (
                            empty($mediaConfig['media_upload_id'])
                            &&
                            ! empty($mediaUploadId)
                        ) {
                            $mediaConfig['media_upload_id'] =
                                $mediaUploadId;
                        }

                        $resolvedMediaUrl =
                            $this->resolveMediaUrl(
                                $mediaConfig,
                                $workflow
                            );

                        if (
                            trim((string) $resolvedMediaUrl) !== ''
                        ) {
                            $templateImageUrl =
                                trim(
                                    (string) $resolvedMediaUrl
                                );
                        }

                    } catch (\Throwable $mediaException) {

                        Log::warning(
                            'MEDIA TEMPLATE MEDIA RESOLVE FAILED',
                            [
                                'workflow_id' => $workflow->id,
                                'session_id' => $session->id,
                                'error' => $mediaException->getMessage(),
                            ]
                        );
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | RESOLVE TEMPLATE VARIABLES
                |--------------------------------------------------------------------------
                */

                $resolvedVariables = [];

                foreach ($templateVariables as $key => $value) {

                    if (is_array($value)) {

                        $resolvedValue = [];

                        foreach ($value as $subKey => $subValue) {

                            if (is_string($subValue)) {

                                $resolvedValue[$subKey] =
                                    $this->resolve(
                                        $subValue,
                                        $variables
                                    );

                            } else {

                                $resolvedValue[$subKey] =
                                    $subValue;
                            }
                        }

                        $resolvedVariables[$key] =
                            $resolvedValue;

                    } else {

                        $resolvedVariables[$key] =
                            $this->resolve(
                                (string) $value,
                                $variables
                            );
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | CLEAN VALUES
                |--------------------------------------------------------------------------
                */

                $templateName =
                    trim((string) $templateName);

                $templateId =
                    trim((string) $templateId);

                $templateLanguage =
                    trim((string) $templateLanguage);

                $templateBody =
                    trim((string) $templateBody);

                $templateImageUrl =
                    trim((string) $templateImageUrl);

                /*
                |--------------------------------------------------------------------------
                | VALIDATE TEMPLATE
                |--------------------------------------------------------------------------
                */

                if (
                    $templateName === ''
                    &&
                    $templateId === ''
                ) {

                    throw new \RuntimeException(
                        'Media Template name or template ID is required.'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | IMAGE REQUIRED
                |--------------------------------------------------------------------------
                */

                if ($templateImageUrl === '') {

                    Log::error(
                        'MEDIA TEMPLATE IMAGE URL EMPTY',
                        [
                            'workflow_id' => $workflow->id,
                            'session_id' => $session->id,
                            'node_id' => $nodeId,

                            'configuration' => $cfg,

                            'template_name' => $templateName,

                            'template_id' => $templateId,

                            'media_upload_id' => $mediaUploadId,

                            'image_url_candidates' => [
                                'templateImageUrl' => $cfg['templateImageUrl'] ?? null,

                                'template_image_url' => $cfg['template_image_url'] ?? null,

                                'image_url' => $cfg['image_url'] ?? null,

                                'imageUrl' => $cfg['imageUrl'] ?? null,

                                'media_url' => $cfg['media_url'] ?? null,

                                'mediaUrl' => $cfg['mediaUrl'] ?? null,

                                'url' => $cfg['url'] ?? null,
                            ],
                        ]
                    );

                    throw new \RuntimeException(
                        'Media Template image URL is empty.'
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | VALIDATE IMAGE URL
                |--------------------------------------------------------------------------
                */

                if (
                    ! filter_var(
                        $templateImageUrl,
                        FILTER_VALIDATE_URL
                    )
                ) {

                    throw new \RuntimeException(
                        'Invalid Media Template image URL: '
                        .$templateImageUrl
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | DEBUG
                |--------------------------------------------------------------------------
                */

                Log::info(
                    'MEDIA TEMPLATE BEFORE SEND',
                    [
                        'workflow_id' => $workflow->id,

                        'session_id' => $session->id,

                        'user' => $session->user_identifier,

                        'template_name' => $templateName,

                        'template_id' => $templateId,

                        'language' => $templateLanguage,

                        'body' => $templateBody,

                        'image_url' => $templateImageUrl,

                        'variables' => $resolvedVariables,
                    ]
                );

                /*
                |--------------------------------------------------------------------------
                | SEND TO WHATSAPP PROVIDER
                |--------------------------------------------------------------------------
                */

                $output =
                    $this->whatsapp->sendMediaTemplate(
                        $session->user_identifier,
                        $templateName,
                        $templateId,
                        $templateLanguage,
                        $templateBody,
                        $templateImageUrl,
                        $resolvedVariables
                    );

                /*
                |--------------------------------------------------------------------------
                | PROVIDER RESPONSE
                |--------------------------------------------------------------------------
                */

                Log::info(
                    'MEDIA TEMPLATE PROVIDER RESPONSE',
                    [
                        'workflow_id' => $workflow->id,

                        'session_id' => $session->id,

                        'user' => $session->user_identifier,

                        'response' => $output,
                    ]
                );

                /*
                |--------------------------------------------------------------------------
                | SAVE OUTBOUND
                |--------------------------------------------------------------------------
                */

                $displayText =
                    $templateBody !== ''
                        ? $templateBody
                        : $templateName;

                $this->saveOutbound(
                    $session,
                    'media_template',
                    $displayText !== ''
                        ? $displayText
                        : null,
                    is_array($output)
                        ? $output
                        : []
                );

                /*
                |--------------------------------------------------------------------------
                | NEXT NODE
                |--------------------------------------------------------------------------
                */

                $next =
                    $this->nextNode(
                        $workflow,
                        $nodeId
                    );

                if ($next) {

                    $this->goToNode(
                        $workflow,
                        $session,
                        $next
                    );

                } else {

                    $session->update([
                        'current_node_id' => $nodeId,

                        'status' => 'completed',

                        'last_message_at' => now(),
                    ]);
                }
            }
            /*
            |--------------------------------------------------------------------------
            | VIDEO
            |--------------------------------------------------------------------------
            */
            elseif ($type === 'video') {

                $mediaUrl = $this->resolveMediaUrl(
                    $cfg,
                    $workflow
                );

                $caption = $cfg['caption']
                    ?? $cfg['message']
                    ?? $cfg['text']
                    ?? '';

                $mediaUrl = $this->resolve(
                    (string) $mediaUrl,
                    $session->variables ?? []
                );

                $caption = $this->resolve(
                    (string) $caption,
                    $session->variables ?? []
                );

                if ($mediaUrl === '') {

                    throw new \RuntimeException(
                        'Video media URL is empty.'
                    );
                }

                $output = $this->whatsapp->sendVideo(
                    $session->user_identifier,
                    $mediaUrl,
                    $caption
                );

                $this->saveOutbound(
                    $session,
                    'video',
                    $caption !== '' ? $caption : null,
                    $output
                );

                $next = $this->nextNode(
                    $workflow,
                    $nodeId
                );

                if ($next) {

                    $this->goToNode(
                        $workflow,
                        $session,
                        $next
                    );
                }
            } elseif ($type === 'button') {

                if (! empty($input['source_handle'])) {

                    $sourceHandle =
                        (string) $input['source_handle'];

                    $next =
                        $this->nextNode(
                            $workflow,
                            $nodeId,
                            $sourceHandle
                        );

                    if ($next) {

                        $this->goToNode(
                            $workflow,
                            $session,
                            $next
                        );

                        return;
                    }

                    $validationMessage =
                        $cfg['validation_message']
                        ??
                        $cfg['validationMessage']
                        ??
                        '⚠️ This button is not available right now.';

                    $validationMessage =
                        $this->resolve(
                            (string) $validationMessage,
                            $session->variables ?? []
                        );

                    $output =
                        $this->whatsapp->sendText(
                            $session->user_identifier,
                            $validationMessage
                        );

                    $this->saveOutbound(
                        $session,
                        'text',
                        $validationMessage,
                        $output
                    );

                    $this->sendButton(
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

                $this->sendButton(
                    $session,
                    $cfg
                );

                $session->update([
                    'current_node_id' => $nodeId,
                    'status' => 'waiting',
                    'last_message_at' => now(),
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | USER INPUT
            |--------------------------------------------------------------------------
            */

            elseif (
                $type === 'userInput'
                ||
                $type === 'input'
            ) {

                $variable =
                    $cfg['variable']
                    ??
                    $cfg['name']
                    ??
                    'last_input';

                /*
                |--------------------------------------------------------------------------
                | VALIDATION TYPE
                |--------------------------------------------------------------------------
                */

                $validationType =
                    strtolower(
                        trim(
                            (string) (
                                $cfg['validation_type']
                                ??
                                $cfg['validationType']
                                ??
                                $cfg['validation']
                                ??
                                $cfg['input_type']
                                ??
                                $cfg['inputType']
                                ??
                                ''
                            )
                        )
                    );

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

                $rawAllowSkip =
                    $cfg['allow_skip']
                    ??
                    $cfg['allowSkip']
                    ??
                    $cfg['skip']
                    ??
                    $cfg['is_optional']
                    ??
                    $cfg['optional']
                    ??
                    false;

                if (is_bool($rawAllowSkip)) {

                    $allowSkip =
                        $rawAllowSkip;

                } elseif (is_numeric($rawAllowSkip)) {

                    $allowSkip =
                        ((int) $rawAllowSkip) === 1;

                } else {

                    $allowSkip =
                        in_array(
                            strtolower(
                                trim(
                                    (string) $rawAllowSkip
                                )
                            ),
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

                $skipText =
                    trim(
                        (string) (
                            $cfg['skip_text']
                            ??
                            $cfg['skipText']
                            ??
                            $cfg['skip_value']
                            ??
                            $cfg['skipValue']
                            ??
                            'skip'
                        )
                    );

                if ($skipText === '') {
                    $skipText = 'skip';
                }

                /*
                |--------------------------------------------------------------------------
                | REQUIRED
                |--------------------------------------------------------------------------
                */

                $rawRequired =
                    $cfg['required']
                    ??
                    true;

                if (is_bool($rawRequired)) {

                    $required =
                        $rawRequired;

                } elseif (is_numeric($rawRequired)) {

                    $required =
                        ((int) $rawRequired) === 1;

                } else {

                    $required =
                        ! in_array(
                            strtolower(
                                trim(
                                    (string) $rawRequired
                                )
                            ),
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

                $validationMessage =
                    $cfg['validation_message']
                    ??
                    $cfg['validationMessage']
                    ??
                    '⚠️ Please enter a valid response.';

                $requiredMessage =
                    $cfg['required_validation_message']
                    ??
                    $cfg['requiredValidationMessage']
                    ??
                    $cfg['requiredMessage']
                    ??
                    '⚠️ This field is required. Please enter a valid response.';

                $mobileValidationMessage =
                    $cfg['mobile_validation_message']
                    ??
                    $cfg['mobileValidationMessage']
                    ??
                    '⚠️ Please enter a valid 10-digit mobile number.';

                /*
                |--------------------------------------------------------------------------
                | MIN / MAX
                |--------------------------------------------------------------------------
                */

                $minLength =
                    $cfg['minLength']
                    ??
                    $cfg['min_length']
                    ??
                    null;

                $maxLength =
                    $cfg['maxLength']
                    ??
                    $cfg['max_length']
                    ??
                    null;

                $minValue =
                    $cfg['minValue']
                    ??
                    $cfg['min_value']
                    ??
                    null;

                $maxValue =
                    $cfg['maxValue']
                    ??
                    $cfg['max_value']
                    ??
                    null;

                $regex =
                    trim(
                        (string) (
                            $cfg['regex']
                            ??
                            ''
                        )
                    );

                /*
                |--------------------------------------------------------------------------
                | INPUT RECEIVED
                |--------------------------------------------------------------------------
                */

                if (array_key_exists('text', $input)) {

                    $value =
                        trim(
                            (string) (
                                $input['text'] ?? ''
                            )
                        );

                    $isSkipText =
                        $value !== ''
                        &&
                        strcasecmp(
                            trim($value),
                            trim($skipText)
                        ) === 0;

                    $isEmpty =
                        $value === '';

                    if (
                        $allowSkip
                        &&
                        (
                            $isSkipText
                            ||
                            (
                                $isEmpty
                                &&
                                ! $required
                            )
                        )
                    ) {

                        $variables =
                            $session->variables ?? [];

                        $variables[$variable] = null;

                        $session->update([
                            'variables' => $variables,
                            'status' => 'active',
                            'last_message_at' => now(),
                        ]);

                        $session->refresh();

                        $next =
                            $this->nextNode(
                                $workflow,
                                $nodeId
                            );

                        if ($next) {

                            $this->goToNode(
                                $workflow,
                                $session,
                                $next
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
                    | SKIP NOT ALLOWED
                    |--------------------------------------------------------------------------
                    */

                    if (
                        $isSkipText
                        &&
                        ! $allowSkip
                    ) {

                        $message =
                            $this->resolve(
                                (string) $requiredMessage,
                                $session->variables ?? []
                            );

                        $output =
                            $this->whatsapp->sendText(
                                $session->user_identifier,
                                $message
                            );

                        $this->saveOutbound(
                            $session,
                            'text',
                            $message,
                            $output
                        );

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

                    /*
                    |--------------------------------------------------------------------------
                    | EMPTY INPUT
                    |--------------------------------------------------------------------------
                    */

                    if ($isEmpty) {

                        $message =
                            $required
                                ? $requiredMessage
                                : $validationMessage;

                        $message =
                            $this->resolve(
                                (string) $message,
                                $session->variables ?? []
                            );

                        $output =
                            $this->whatsapp->sendText(
                                $session->user_identifier,
                                $message
                            );

                        $this->saveOutbound(
                            $session,
                            'text',
                            $message,
                            $output
                        );

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

                    /*
                    |--------------------------------------------------------------------------
                    | VALIDATION
                    |--------------------------------------------------------------------------
                    */

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

                        $isValid =
                            $value !== '';
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | ALPHA
                    |--------------------------------------------------------------------------
                    */

                    elseif ($validationType === 'alpha') {

                        $isValid =
                            preg_match(
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

                        $isValid =
                            preg_match(
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

                        $digits =
                            preg_replace(
                                '/\D+/',
                                '',
                                $value
                            );

                        if (
                            strlen($digits) === 12
                            &&
                            str_starts_with(
                                $digits,
                                '91'
                            )
                        ) {

                            $digits =
                                substr(
                                    $digits,
                                    2
                                );
                        }

                        $isValid =
                            preg_match(
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

                        $isValid =
                            filter_var(
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

                        $isValid =
                            is_numeric($value);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | INTEGER
                    |--------------------------------------------------------------------------
                    */

                    elseif ($validationType === 'integer') {

                        $isValid =
                            filter_var(
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

                        $timestamp =
                            strtotime($value);

                        $isValid =
                            $timestamp !== false;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | URL
                    |--------------------------------------------------------------------------
                    */

                    elseif ($validationType === 'url') {

                        $isValid =
                            filter_var(
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

                            $regexResult =
                                @preg_match(
                                    $regex,
                                    $value
                                );

                            $isValid =
                                $regexResult === 1;
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
                        $minLength !== null
                        &&
                        $minLength !== ''
                        &&
                        is_numeric($minLength)
                    ) {

                        $isValid =
                            mb_strlen($value)
                            >=
                            (int) $minLength;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | MAX LENGTH
                    |--------------------------------------------------------------------------
                    */

                    if (
                        $isValid
                        &&
                        $maxLength !== null
                        &&
                        $maxLength !== ''
                        &&
                        is_numeric($maxLength)
                    ) {

                        $isValid =
                            mb_strlen($value)
                            <=
                            (int) $maxLength;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | MIN VALUE
                    |--------------------------------------------------------------------------
                    */

                    if (
                        $isValid
                        &&
                        $minValue !== null
                        &&
                        $minValue !== ''
                        &&
                        is_numeric($minValue)
                    ) {

                        if (is_numeric($value)) {

                            $isValid =
                                (float) $value
                                >=
                                (float) $minValue;

                        } else {

                            $isValid = false;
                        }
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | MAX VALUE
                    |--------------------------------------------------------------------------
                    */

                    if (
                        $isValid
                        &&
                        $maxValue !== null
                        &&
                        $maxValue !== ''
                        &&
                        is_numeric($maxValue)
                    ) {

                        if (is_numeric($value)) {

                            $isValid =
                                (float) $value
                                <=
                                (float) $maxValue;

                        } else {

                            $isValid = false;
                        }
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | VALIDATION FAILED
                    |--------------------------------------------------------------------------
                    */

                    if (! $isValid) {

                        $message =
                            $this->resolve(
                                (string) $validationMessage,
                                $session->variables ?? []
                            );

                        if (
                            $validationType === 'mobile'
                            &&
                            trim(
                                (string)
                                $mobileValidationMessage
                            ) !== ''
                        ) {

                            $message =
                                $this->resolve(
                                    (string)
                                    $mobileValidationMessage,
                                    $session->variables ?? []
                                );
                        }

                        $output =
                            $this->whatsapp->sendText(
                                $session->user_identifier,
                                $message
                            );

                        $this->saveOutbound(
                            $session,
                            'text',
                            $message,
                            $output
                        );

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

                    /*
                    |--------------------------------------------------------------------------
                    | SAVE VALID INPUT
                    |--------------------------------------------------------------------------
                    */

                    $variables =
                        $session->variables ?? [];

                    $variables[$variable] =
                        $value;

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

                    $next =
                        $this->nextNode(
                            $workflow,
                            $nodeId
                        );

                    if ($next) {

                        $this->goToNode(
                            $workflow,
                            $session,
                            $next
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
                | FIRST VISIT
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
            }

    /*
    |--------------------------------------------------------------------------
    | API
    |--------------------------------------------------------------------------
    */
    elseif ($type === 'api') {

    $variables = $session->variables ?? [];

    if (is_string($variables)) {
        $variables = json_decode($variables, true) ?? [];
    }

    if (!is_array($variables)) {
        $variables = [];
    }

    /*
    |--------------------------------------------------------------------------
    | OTP ENABLED?
    |--------------------------------------------------------------------------
    */

    $otpEnabled = filter_var(
        $cfg['otpEnabled']
            ?? $cfg['otp_enabled']
            ?? false,
        FILTER_VALIDATE_BOOLEAN
    );

    /*
    |--------------------------------------------------------------------------
    | ================================================================
    | OTP API FLOW
    | ================================================================
    */

    if ($otpEnabled) {

        /*
        |--------------------------------------------------------------------------
        | VARIABLES
        |--------------------------------------------------------------------------
        */

        $mobileVariable =
            $cfg['mobileVariable']
            ?? $cfg['mobile_variable']
            ?? 'mobile';

        $nameVariable =
            $cfg['nameVariable']
            ?? $cfg['name_variable']
            ?? 'name';

        $otpVariable =
            $cfg['otpVariable']
            ?? $cfg['otp_variable']
            ?? 'otp';

        $verifiedVariable =
            $cfg['otpVerifiedVariable']
            ?? $cfg['otp_verified_variable']
            ?? 'otp_verified';

        $referenceVariable =
            $cfg['referenceVariable']
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

            $message =
                $cfg['apiFailureMessage']
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
                'status' => 'active',
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

        $otpLength = max(
            4,
            min($otpLength, 8)
        );

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
        | ================================================================
        | FIRST REQUEST -> SEND OTP
        | ================================================================
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

            /*
            |--------------------------------------------------------------------------
            | STORE OTP TEMPORARILY
            |--------------------------------------------------------------------------
            */

            $variables[$otpVariable] =
                $generatedOtp;

            /*
            |--------------------------------------------------------------------------
            | STANDARD VARIABLES
            |--------------------------------------------------------------------------
            */

            $variables['mobile'] =
                $mobile;

            if ($name !== '') {

                $variables['name'] =
                    $name;
            }

            /*
            |--------------------------------------------------------------------------
            | SEND OTP API
            |--------------------------------------------------------------------------
            */

            $sendResult =
                $this->sendOtpForApiNode(
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

                Log::error(
                    'API OTP: SEND FAILED',
                    [
                        'node_id' => $nodeId,
                        'mobile' => $mobile,
                        'response' => $sendResult,
                    ]
                );

                $message =
                    $cfg['sendOtpErrorMessage']
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

                /*
                |--------------------------------------------------------------------------
                | RESET OTP STATE
                |--------------------------------------------------------------------------
                */

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

            $variables[$otpSentVariable] =
                true;

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

            $variables['otp_expires_at'] =
                now()
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

            $variables[$verifiedVariable] =
                false;

            /*
            |--------------------------------------------------------------------------
            | OTP PROMPT
            |--------------------------------------------------------------------------
            */

            $prompt =
                $cfg['otpMessage']
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

            /*
            |--------------------------------------------------------------------------
            | SAVE SESSION
            |--------------------------------------------------------------------------
            */

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
        | ================================================================
        | OTP RECEIVED
        | ================================================================
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

            $message =
                $cfg['validationMessage']
                ?? $cfg['validation_message']
                ?? '⚠️ Please enter the OTP.';

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
        | OTP LENGTH
        |--------------------------------------------------------------------------
        */

        if (
            !preg_match(
                '/^\d{' . $otpLength . '}$/',
                $otp
            )
        ) {

            $message =
                $cfg['validationMessage']
                ?? $cfg['validation_message']
                ?? "⚠️ Please enter a valid {$otpLength}-digit OTP.";

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
        | ================================================================
        | OTP EXPIRY
        | ================================================================
        */

        if (!empty($variables['otp_expires_at'])) {

            try {

                $expiresAt = \Carbon\Carbon::parse(
                    $variables['otp_expires_at']
                );

                if (now()->greaterThan($expiresAt)) {

                    $message =
                        $cfg['otpExpiredMessage']
                        ?? $cfg['otp_expired_message']
                        ?? '⚠️ OTP has expired. Please request a new OTP.';

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

                Log::warning(
                    'OTP EXPIRY PARSE ERROR',
                    [
                        'error' => $e->getMessage(),
                    ]
                );
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

            $message =
                $cfg['otpMaxAttemptsMessage']
                ?? $cfg['otp_max_attempts_message']
                ?? '⚠️ Maximum OTP attempts exceeded.';

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

            $variables[$verifiedVariable] =
                false;

            $session->update([
                'variables' => $variables,
                'status' => 'active',
                'last_message_at' => now(),
            ]);

            $next = $this->nextNode(
                $workflow,
                $nodeId,

            );

            if ($next) {

                $this->goToNode(
                    $workflow,
                    $session,
                    $next
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
        | INCREMENT ATTEMPT
        |--------------------------------------------------------------------------
        */

        $attempts++;

        $variables['otp_attempts'] =
            $attempts;

        /*
        |--------------------------------------------------------------------------
        | OTP ONLY FOR CURRENT VERIFY REQUEST
        |--------------------------------------------------------------------------
        */

        $variables[$otpVariable] =
            $otp;

        /*
        |--------------------------------------------------------------------------
        | REFERENCE
        |--------------------------------------------------------------------------
        */

        $reference =
            $variables[$referenceVariable]
            ?? null;



        $verifyResult =
            $this->verifyOtpForApiNode(
                $cfg,
                $mobile,
                $otp,
                $reference,
                $variables
            );


       if ($verifyResult['verified'] ?? false) {

    Log::info('API OTP: VERIFIED SUCCESS', [
        'node_id' => $nodeId,
        'mobile' => $mobile,
        'verifyResult' => $verifyResult,
    ]);

    $variables[$verifiedVariable] = true;

    if (
        isset($verifyResult['data'])
        && is_array($verifyResult['data'])
    ) {
        $variables['otp_response'] = $verifyResult['data'];
    }

    $variables[$otpVariable] = '******';
    $variables['otp_sent'] = false;
    $variables['otp_attempts'] = 0;
    $variables['otp_expires_at'] = null;

    /*
    |------------------------------------------------------------------
    | SAVE SESSION
    |------------------------------------------------------------------
    */

    $session->update([
        'variables' => $variables,
        'status' => 'active',
        'last_message_at' => now(),
    ]);

    /*
    |------------------------------------------------------------------
    | SUCCESS MESSAGE
    |------------------------------------------------------------------
    */

    $successMessage =
        $cfg['apiSuccessMessage']
        ?? $cfg['api_success_message']
        ?? $cfg['successMessage']
        ?? $cfg['success_message']
        ?? 'OTP verified successfully.';

    $successMessage = $this->resolve(
        (string) $successMessage,
        $variables
    );

    Log::info('API OTP: SENDING SUCCESS MESSAGE', [
        'mobile' => $mobile,
        'message' => $successMessage,
    ]);

    $output = $this->whatsapp->sendText(
        $session->user_identifier,
        $successMessage
    );

    $this->saveOutbound(
        $session,
        'text',
        $successMessage,
        $output
    );

    /*
    |------------------------------------------------------------------
    | NEXT NODE
    |------------------------------------------------------------------
    */

    $next = $this->nextNode(
        $workflow,
        $nodeId,
    );

    Log::info('API OTP: SUCCESS NEXT NODE', [
        'workflow_id' => $workflow->id ?? null,
        'current_node_id' => $nodeId,
        'source_handle' => 'source-yes',
        'next_node_id' => $next?->id ?? null,
    ]);

    if ($next) {

        $this->goToNode(
            $workflow,
            $session,
            $next
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
        | ================================================================
        | OTP FAILED
        | ================================================================
        */

        $variables[$verifiedVariable] =
            false;

        /*
        |--------------------------------------------------------------------------
        | NEVER STORE REAL OTP
        |--------------------------------------------------------------------------
        */

        $variables[$otpVariable] =
            '******';

        /*
        |--------------------------------------------------------------------------
        | SAVE
        |--------------------------------------------------------------------------
        */

        $session->update([
            'variables' => $variables,
            'status' => 'waiting',
            'last_message_at' => now(),
        ]);

        /*
        |--------------------------------------------------------------------------
        | INVALID OTP MESSAGE
        |--------------------------------------------------------------------------
        */

        $failureMessage =
            $cfg['apiFailureMessage']
            ?? $cfg['api_failure_message']
            ?? $cfg['invalidOtpMessage']
            ?? $cfg['invalid_otp_message']
            ?? '⚠️ Invalid OTP. Please try again.';

        $failureMessage =
            $this->resolve(
                (string) $failureMessage,
                $variables
            );

        $output =
            $this->whatsapp->sendText(
                $session->user_identifier,
                $failureMessage
            );

        $this->saveOutbound(
            $session,
            'text',
            $failureMessage,
            $output
        );

        /*
        |--------------------------------------------------------------------------
        | MAX ATTEMPTS REACHED AFTER THIS TRY
        |--------------------------------------------------------------------------
        */

        if ($attempts >= $maxAttempts) {

            $next = $this->nextNode(
                $workflow,
                $nodeId,
                'source-no'
            );

            if ($next) {

                $session->update([
                    'status' => 'active',
                    'last_message_at' => now(),
                ]);

                $this->goToNode(
                    $workflow,
                    $session,
                    $next
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
        | WAIT FOR NEXT OTP
        |--------------------------------------------------------------------------
        */

        $session->update([
            'current_node_id' => $nodeId,
            'status' => 'waiting',
            'last_message_at' => now(),
        ]);

        return;
    }

    /*
    |--------------------------------------------------------------------------
    | ================================================================
    | NORMAL API
    | ================================================================
    */

    $apiResult = $this->executeApi(
        $cfg,
        $session
    );

    /*
    |--------------------------------------------------------------------------
    | VARIABLES
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

    $responseVariable =
        $cfg['apiResponseVariable']
        ?? $cfg['api_response_variable']
        ?? 'api_response';

    /*
    |--------------------------------------------------------------------------
    | STORE COMPLETE API RESULT
    |--------------------------------------------------------------------------
    */

    $variables[$responseVariable] =
        $apiResult;

    /*
    |--------------------------------------------------------------------------
    | OPTIONAL RESPONSE PATH
    |--------------------------------------------------------------------------
    */

    $responsePath =
        $cfg['apiResponsePath']
        ?? $cfg['api_response_path']
        ?? '';

    if ($responsePath !== '') {

        $responseValue =
            data_get(
                $apiResult,
                $responsePath
            );

        $variables[
            $responseVariable . '_value'
        ] = $responseValue;
    }

    /*
    |--------------------------------------------------------------------------
    | BACKWARD COMPATIBILITY
    |--------------------------------------------------------------------------
    */

    if (isset($apiResult['order_status'])) {

        $variables['order_status'] =
            $apiResult['order_status'];
    }

    if (isset($apiResult['status'])) {

        $variables['status'] =
            $apiResult['status'];
    }

    /*
    |--------------------------------------------------------------------------
    | API SUCCESS / FAILURE
    |--------------------------------------------------------------------------
    */

    $apiSuccess =
        $this->isApiSuccess(
            $cfg,
            $apiResult
        );

    /*
    |--------------------------------------------------------------------------
    | SAVE
    |--------------------------------------------------------------------------
    */

    $session->update([
        'variables' => $variables,
        'status' => 'active',
        'last_message_at' => now(),
    ]);

    /*
    |--------------------------------------------------------------------------
    | ================================================================
    | API SUCCESS
    | ================================================================
    */

    if ($apiSuccess) {

        $message =
            $cfg['apiSuccessMessage']
            ?? $cfg['api_success_message']
            ?? '';

        if ($message !== '') {

            $message =
                $this->resolve(
                    (string) $message,
                    $variables
                );

            $output =
                $this->whatsapp->sendText(
                    $session->user_identifier,
                    $message
                );

            $this->saveOutbound(
                $session,
                'text',
                $message,
                $output
            );
        }

        /*
        |--------------------------------------------------------------------------
        | SUCCESS EDGE
        |--------------------------------------------------------------------------
        */

        $next = $this->nextNode(
            $workflow,
            $nodeId,

        );

        /*
        |--------------------------------------------------------------------------
        | BACKWARD COMPATIBILITY
        |--------------------------------------------------------------------------
        */

        if (!$next) {

            $next = $this->nextNode(
                $workflow,
                $nodeId
            );
        }

        if ($next) {

            $this->goToNode(
                $workflow,
                $session,
                $next
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
    | ================================================================
    | API FAILURE
    | ================================================================
    */

    $message =
        $cfg['apiFailureMessage']
        ?? $cfg['api_failure_message']
        ?? '';

    if ($message !== '') {

        $message =
            $this->resolve(
                (string) $message,
                $variables
            );

        $output =
            $this->whatsapp->sendText(
                $session->user_identifier,
                $message
            );

        $this->saveOutbound(
            $session,
            'text',
            $message,
            $output
        );
    }

/*
|--------------------------------------------------------------------------
| NEXT NODE AFTER OTP VERIFICATION
|--------------------------------------------------------------------------
*/

$nextNodeId = $this->nextNode(
    $workflow,
    $nodeId
);

Log::info('API OTP: SUCCESS NEXT NODE', [
    'workflow_id' => $workflow->id ?? null,
    'current_node_id' => $nodeId,
    'next_node_id' => $nextNodeId,
]);

if ($nextNodeId) {

    Log::info('API OTP: GOING TO NEXT NODE', [
        'workflow_id' => $workflow->id ?? null,
        'from_node_id' => $nodeId,
        'to_node_id' => $nextNodeId,
    ]);

    $this->goToNode(
        $workflow,
        $session,
        $nextNodeId
    );

} else {

    Log::warning('API OTP: NEXT NODE NOT FOUND', [
        'workflow_id' => $workflow->id ?? null,
        'current_node_id' => $nodeId,
    ]);

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
            | END
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
            } else {

                $next =
                    $this->nextNode(
                        $workflow,
                        $nodeId
                    );

                if ($next) {

                    $this->goToNode(
                        $workflow,
                        $session,
                        $next
                    );
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

    /*
    |--------------------------------------------------------------------------
    | FIND MENU OPTION BY TEXT
    |--------------------------------------------------------------------------
    */

    private function findMenuOptionByText(
        array $cfg,
        string $typedText
    ): ?array {

        $typedText =
            trim($typedText);

        if ($typedText === '') {
            return null;
        }

        $options =
            $cfg['menuOptions']
            ??
            $cfg['options']
            ??
            $cfg['menu_options']
            ??
            [];

        if (! is_array($options)) {
            return null;
        }

        foreach ($options as $index => $option) {

            if (! is_array($option)) {
                continue;
            }

            $label =
                trim(
                    (string) (
                        $option['label']
                        ??
                        $option['title']
                        ??
                        $option['text']
                        ??
                        ''
                    )
                );

            if ($label === '') {
                continue;
            }

            if (
                strcasecmp(
                    $typedText,
                    $label
                ) !== 0
            ) {
                continue;
            }

            $sourceHandle =
                "source-option-{$index}";

            return [
                'source_handle' => $sourceHandle,
                'label' => $label,
                'index' => $index,
            ];
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

        $prompt =
            $cfg['prompt']
            ??
            $cfg['message']
            ??
            '';

        if (
            trim(
                (string) $prompt
            ) === ''
        ) {
            return;
        }

        $prompt =
            $this->resolve(
                (string) $prompt,
                $session->variables ?? []
            );

        $output =
            $this->whatsapp->sendText(
                $session->user_identifier,
                $prompt
            );

        $this->saveOutbound(
            $session,
            'text',
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
        array $payload
    ): void {

        BotMessage::create([
            'bot_session_id' => $session->id,

            'direction' => 'outbound',

            'message_type' => $type,

            'text' => $text,

            'payload' => $payload,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SEND MENU
    |--------------------------------------------------------------------------
    */

    private function sendMenu(
        BotSession $session,
        array $cfg
    ): void {

        $message =
            $cfg['message']
            ??
            $cfg['text']
            ??
            'Please select an option.';

        $message =
            $this->resolve(
                (string) $message,
                $session->variables ?? []
            );

        $options =
            $cfg['menuOptions']
            ??
            $cfg['options']
            ??
            $cfg['menu_options']
            ??
            [];

        if (! is_array($options)) {
            $options = [];
        }

        $normalizedOptions = [];

        foreach ($options as $index => $option) {

            if (! is_array($option)) {
                continue;
            }

            $sourceHandle =
                "source-option-{$index}";

            $label =
                $option['label']
                ??
                $option['title']
                ??
                $option['text']
                ??
                'Option '.($index + 1);

            $label =
                trim(
                    (string) $label
                );

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

        $whatsappResponse =
            $this->whatsapp->sendMenuButtons(
                $session->user_identifier,
                $message,
                $normalizedOptions
            );

        $payload = [
            'type' => 'menu',

            'message' => $message,

            'options' => $normalizedOptions,

            'whatsapp_response' => $whatsappResponse,
        ];

        BotMessage::create([
            'bot_session_id' => $session->id,

            'direction' => 'outbound',

            'message_type' => 'menu',

            'text' => $message,

            'payload' => $payload,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SEND BUTTON
    |--------------------------------------------------------------------------
    */

    private function sendButton(
        BotSession $session,
        array $cfg
    ): void {

        $message =
            $cfg['message']
            ??
            $cfg['text']
            ??
            '';

        $message =
            $this->resolve(
                (string) $message,
                $session->variables ?? []
            );

        $buttonText =
            $cfg['buttonText']
            ??
            $cfg['button_text']
            ??
            $cfg['label']
            ??
            $cfg['title']
            ??
            'Continue';

        $sourceHandle =
            $cfg['source_handle']
            ??
            $cfg['sourceHandle']
            ??
            'source-bottom';

        $whatsappResponse =
            $this->whatsapp->sendInteractive(
                $session->user_identifier,
                $message,
                [
                    [
                        'id' => (string) $sourceHandle,

                        'title' => (string) $buttonText,
                    ],
                ]
            );

        $payload = [
            'type' => 'button',

            'message' => $message,

            'button' => [
                'id' => (string) $sourceHandle,

                'title' => (string) $buttonText,

                'source_handle' => (string) $sourceHandle,
            ],

            'whatsapp_response' => $whatsappResponse,
        ];

        BotMessage::create([
            'bot_session_id' => $session->id,

            'direction' => 'outbound',

            'message_type' => 'button',

            'text' => $message,

            'payload' => $payload,
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



}
