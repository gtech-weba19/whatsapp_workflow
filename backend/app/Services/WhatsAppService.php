<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected string $apiUrl;
    protected string $token;
    protected string $senderNumber;
    protected string $senderName;
    protected string $webhookDNId;

    public function __construct()
    {
        $this->apiUrl = (string) config(
            'services.whatsapp.api_url'
        );

        $this->token = (string) config(
            'services.whatsapp.token'
        );

        $this->senderNumber = (string) config(
            'services.whatsapp.sender_number'
        );

        $this->senderName = (string) config(
            'services.whatsapp.sender_name',
            'Whatsappdemo'
        );

        $this->webhookDNId = (string) config(
            'services.whatsapp.webhook_dn_id',
            '1001'
        );


    }


        /**
     * =====================================================
     * SEND OTP
     * =====================================================
     */
    public function sendOtp(
        string $mobile,
        array $config = []
    ): array {

        try {

            $url = trim(
                (string) (
                    $config['sendOtpUrl']
                    ?? $this->sendUrl
                    ?? ''
                )
            );

            if ($url === '') {
                return [
                    'success' => false,
                    'message' => 'OTP send URL is not configured.',
                ];
            }

            $method = strtoupper(
                (string) (
                    $config['sendOtpMethod']
                    ?? 'POST'
                )
            );

            $payload = $config[
                'sendOtpPayload'
            ] ?? [];

            if (!is_array($payload)) {
                $payload = [];
            }



            $payload = $this->replaceVariables(
                $payload,
                [
                    'phone' => $mobile,
                    'mobile' => $mobile,
                    'phone_number' => $mobile,
                ]
            );



            if (
                empty($payload['mobile']) &&
                empty($payload['phone']) &&
                empty($payload['phone_number'])
            ) {
                $payload['mobile'] = $mobile;
            }

            Log::info(
                'OTP SEND REQUEST',
                [
                    'url' => $url,
                    'method' => $method,
                    'mobile' => $mobile,
                ]
            );

            $request = Http::acceptJson()
                ->timeout(30);

            /*
             * -------------------------------------------------
             * Token
             * -------------------------------------------------
             */

            if ($this->token !== '') {
                $request = $request->withToken(
                    $this->token
                );
            }

            /*
             * -------------------------------------------------
             * Send request
             * -------------------------------------------------
             */

            if ($method === 'GET') {

                $response = $request->get(
                    $url,
                    $payload
                );

            } else {

                $response = $request->post(
                    $url,
                    $payload
                );
            }

            $body = $response->json();

            Log::info(
                'OTP SEND RESPONSE',
                [
                    'status' => $response->status(),
                    'body' => $body,
                ]
            );

            if (!$response->successful()) {

                return [
                    'success' => false,
                    'message' =>
                        $body['message']
                        ?? $body['error']
                        ?? 'OTP send request failed.',

                    'status' =>
                        $response->status(),

                    'response' => $body,
                ];
            }

            return [
                'success' => true,

                'message' =>
                    $body['message']
                    ?? 'OTP sent successfully.',

                'status' =>
                    $response->status(),

                'response' => $body,

                /*
                 * Provider may return a transaction ID.
                 */
                'reference' =>
                    $body['reference']
                    ?? $body['reference_id']
                    ?? $body['transaction_id']
                    ?? $body['request_id']
                    ?? null,
            ];

        } catch (Throwable $e) {

            Log::error(
                'OTP SEND ERROR',
                [
                    'message' =>
                        $e->getMessage(),
                ]
            );

            return [
                'success' => false,
                'message' =>
                    'Unable to send OTP.',
                'error' =>
                    $e->getMessage(),
            ];
        }
    }


    /**
     * =====================================================
     * VERIFY OTP
     * =====================================================
     */
    public function verifyOtp(
        string $mobile,
        string $otp,
        array $config = [],
        ?string $reference = null
    ): array {

        try {

            $url = trim(
                (string) (
                    $config['verifyOtpUrl']
                    ?? $this->verifyUrl
                    ?? ''
                )
            );

            if ($url === '') {
                return [
                    'success' => false,
                    'verified' => false,
                    'message' =>
                        'OTP verify URL is not configured.',
                ];
            }

            $method = strtoupper(
                (string) (
                    $config['verifyOtpMethod']
                    ?? 'POST'
                )
            );

            $payload = $config[
                'verifyOtpPayload'
            ] ?? [];

            if (!is_array($payload)) {
                $payload = [];
            }

            /*
             * -------------------------------------------------
             * Replace placeholders
             * -------------------------------------------------
             */

            $payload = $this->replaceVariables(
                $payload,
                [
                    'phone' => $mobile,
                    'mobile' => $mobile,
                    'phone_number' => $mobile,
                    'otp' => $otp,
                    'reference' => $reference ?? '',
                    'reference_id' => $reference ?? '',
                    'transaction_id' => $reference ?? '',
                ]
            );

            /*
             * -------------------------------------------------
             * Default values
             * -------------------------------------------------
             */

            if (
                empty($payload['mobile']) &&
                empty($payload['phone']) &&
                empty($payload['phone_number'])
            ) {
                $payload['mobile'] = $mobile;
            }

            if (
                empty($payload['otp']) &&
                empty($payload['code'])
            ) {
                $payload['otp'] = $otp;
            }

            Log::info(
                'OTP VERIFY REQUEST',
                [
                    'url' => $url,
                    'method' => $method,
                    'mobile' => $mobile,
                ]
            );

            $request = Http::acceptJson()
                ->timeout(30);

            if ($this->token !== '') {
                $request = $request->withToken(
                    $this->token
                );
            }

            if ($method === 'GET') {

                $response = $request->get(
                    $url,
                    $payload
                );

            } else {

                $response = $request->post(
                    $url,
                    $payload
                );
            }

            $body = $response->json();

            Log::info(
                'OTP VERIFY RESPONSE',
                [
                    'status' => $response->status(),
                    'body' => $body,
                ]
            );

            if (!$response->successful()) {

                return [
                    'success' => false,
                    'verified' => false,

                    'message' =>
                        $body['message']
                        ?? $body['error']
                        ?? 'OTP verification failed.',

                    'status' =>
                        $response->status(),

                    'response' => $body,
                ];
            }

            /*
             * -------------------------------------------------
             * Different providers use different success keys.
             * -------------------------------------------------
             */

            $verified = $this->detectVerification(
                $body
            );

            return [
                'success' => true,
                'verified' => $verified,

                'message' =>
                    $body['message']
                    ?? (
                        $verified
                            ? 'OTP verified successfully.'
                            : 'Invalid OTP.'
                    ),

                'status' =>
                    $response->status(),

                'response' => $body,
            ];

        } catch (Throwable $e) {

            Log::error(
                'OTP VERIFY ERROR',
                [
                    'message' =>
                        $e->getMessage(),
                ]
            );

            return [
                'success' => false,
                'verified' => false,

                'message' =>
                    'Unable to verify OTP.',

                'error' =>
                    $e->getMessage(),
            ];
        }
    }


    /**
     * =====================================================
     * VARIABLE REPLACEMENT
     * =====================================================
     */
    protected function replaceVariables(
        mixed $value,
        array $variables
    ): mixed {

        if (is_array($value)) {

            foreach ($value as $key => $item) {

                $value[$key] =
                    $this->replaceVariables(
                        $item,
                        $variables
                    );
            }

            return $value;
        }

        if (!is_string($value)) {
            return $value;
        }

        foreach (
            $variables as $key => $replacement
        ) {

            $value = str_replace(
                [
                    '{{' . $key . '}}',
                    '{' . $key . '}',
                ],
                (string) $replacement,
                $value
            );
        }

        return $value;
    }


    /**
     * =====================================================
     * DETECT VERIFY SUCCESS
     * =====================================================
     */
    protected function detectVerification(
        mixed $body
    ): bool {

        if (!is_array($body)) {
            return false;
        }

        if (
            isset($body['verified'])
        ) {
            return (bool) $body['verified'];
        }

        if (
            isset($body['success'])
        ) {
            return (bool) $body['success'];
        }

        if (
            isset($body['valid'])
        ) {
            return (bool) $body['valid'];
        }

        if (
            isset($body['status'])
        ) {

            $status = strtolower(
                (string) $body['status']
            );

            if (
                in_array(
                    $status,
                    [
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

        return false;
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE MOBILE
    |--------------------------------------------------------------------------
    */

    private function normalizeMobile(string $mobile): string
    {
        $mobile = preg_replace('/\D+/', '', $mobile);

        if (strlen($mobile) === 10) {
            $mobile = '91' . $mobile;
        }

        return (string) $mobile;
    }

    /*
    |--------------------------------------------------------------------------
    | CONFIG CHECK
    |--------------------------------------------------------------------------
    */

    private function hasConfiguration(): bool
    {
        return !empty($this->apiUrl)
            && !empty($this->token);
    }

    /*
    |--------------------------------------------------------------------------
    | TEXT MESSAGE
    |--------------------------------------------------------------------------
    */

    public function sendText(
        string $to,
        string $text
    ): array {
        $originalTo = $to;

        $to = $this->normalizeMobile($to);

        if ($to === '') {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Invalid WhatsApp mobile number.',
            ];
        }

        if (!$this->hasConfiguration()) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'WhatsApp API configuration missing.',
            ];
        }

        $content = [
            'preview_url' => false,
            'shorten_url' => false,
            'type' => 'TEXT',
            'text' => $text,
        ];

        $payload = $this->buildPayload(
            $content,
            $to
        );

        return $this->sendRequest(
            $payload,
            'TEXT',
            $originalTo
        );
    }



    /*
    |--------------------------------------------------------------------------
    | INTERACTIVE BUTTON
    |--------------------------------------------------------------------------
    */

    public function sendInteractive(
        string $to,
        string $body,
        array $buttons
    ): array {
        $originalTo = $to;

        $to = $this->normalizeMobile($to);

        if ($to === '') {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Invalid WhatsApp mobile number.',
            ];
        }

        if (!$this->hasConfiguration()) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'WhatsApp API configuration missing.',
            ];
        }

        $interactiveButtons = [];

        foreach ($buttons as $index => $button) {
            if (!is_array($button)) {
                continue;
            }

            $id = (string) (
                $button['id']
                ?? $button['source_handle']
                ?? $button['sourceHandle']
                ?? 'source-option-' . $index
            );

            $title = trim((string) (
                $button['title']
                ?? $button['label']
                ?? $button['text']
                ?? 'Option ' . ($index + 1)
            ));

            if ($title === '') {
                continue;
            }

            $interactiveButtons[] = [
                'type' => 'reply',
                'reply' => [
                    'id' => $id,
                    'title' => $title,
                ],
            ];
        }

        $interactiveButtons = array_slice(
            $interactiveButtons,
            0,
            3
        );

        if (empty($interactiveButtons)) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'No valid WhatsApp buttons found.',
            ];
        }

        $content = [
            'preview_url' => false,
            'shorten_url' => false,
            'type' => 'INTERACTIVE',
            'interactive' => [
                'type' => 'button',
                'body' => [
                    'text' => $body,
                ],
                'action' => [
                    'buttons' => $interactiveButtons,
                ],
            ],
        ];

        $payload = $this->buildPayload(
            $content,
            $to
        );

        return $this->sendRequest(
            $payload,
            'INTERACTIVE_BUTTON',
            $originalTo
        );
    }


public function sendInteractiveWithMedia(
    string $to,
    string $mediaType,
    string $mediaUrl,
    string $body,
    array $buttons,
    string $footer = '',
    string $fileName = ''
): array {

    $originalTo = $to;

    // =====================================================
    // NORMALIZE MOBILE
    // =====================================================

    $to = $this->normalizeMobile($to);

    if ($to === '') {

        return [
            'success' => false,
            'error' => true,
            'message' => 'Invalid WhatsApp mobile number.',
        ];
    }

    // =====================================================
    // CHECK CONFIGURATION
    // =====================================================

    if (!$this->hasConfiguration()) {

        return [
            'success' => false,
            'error' => true,
            'message' => 'WhatsApp API configuration missing.',
        ];
    }

    // =====================================================
    // NORMALIZE MEDIA TYPE
    // =====================================================

    $mediaType = strtolower(
        trim($mediaType)
    );

    // PDF = DOCUMENT
    if ($mediaType === 'pdf') {
        $mediaType = 'document';
    }

    // =====================================================
    // SUPPORTED MEDIA TYPES
    // =====================================================

    if (!in_array(
        $mediaType,
        [
            'image',
            'video',
            'document',
        ],
        true
    )) {

        return [
            'success' => false,
            'error' => true,
            'message' =>
                'Unsupported interactive media type: '
                . $mediaType,
        ];
    }

    // =====================================================
    // MEDIA URL
    // =====================================================

    $mediaUrl = trim($mediaUrl);

    if ($mediaUrl === '') {

        return [
            'success' => false,
            'error' => true,
            'message' =>
                'Interactive media URL is empty.',
        ];
    }

    // =====================================================
    // BODY
    // =====================================================

    $body = trim($body);

    if ($body === '') {

        $body = 'Please select an option.';
    }

    // =====================================================
    // FOOTER
    // =====================================================

    $footer = trim($footer);

    // =====================================================
    // FILE NAME
    // =====================================================

    $fileName = trim($fileName);

    // =====================================================
    // NORMALIZE BUTTONS
    // =====================================================

    $interactiveButtons = [];

    foreach ($buttons as $index => $button) {

        // ---------------------------------------------
        // ONLY ARRAY BUTTONS
        // ---------------------------------------------

        if (!is_array($button)) {
            continue;
        }

        // ---------------------------------------------
        // BUTTON TYPE
        // ---------------------------------------------
        //
        // Currently provider-confirmed format is:
        //
        // "type": "reply"
        //
        // We keep reply as default.
        //

        $buttonType = strtolower(
            trim(
                (string) (
                    $button['type']
                    ?? $button['buttonType']
                    ?? 'reply'
                )
            )
        );

        // -------------------------------------------------
        // ONLY REPLY IS CURRENTLY SUPPORTED
        // -------------------------------------------------
        //
        // URL / LINK / DOWNLOAD buttons should NOT be
        // converted to an unconfirmed provider format.
        //

        if ($buttonType !== 'reply') {

            Log::warning(
                'UNSUPPORTED WHATSAPP MEDIA BUTTON TYPE',
                [
                    'button_index' => $index,
                    'button_type' => $buttonType,
                    'button' => $button,
                ]
            );

            continue;
        }

        // ---------------------------------------------
        // BUTTON ID
        // ---------------------------------------------

        $id = (string) (
            $button['id']
            ?? $button['source_handle']
            ?? $button['sourceHandle']
            ?? 'source-option-' . $index
        );

        $id = trim($id);

        // ---------------------------------------------
        // BUTTON TITLE
        // ---------------------------------------------

        $title = trim(
            (string) (
                $button['title']
                ?? $button['label']
                ?? $button['text']
                ?? 'Option ' . ($index + 1)
            )
        );

        // ---------------------------------------------
        // FALLBACK ID
        // ---------------------------------------------

        if ($id === '') {

            $id = 'source-option-' . $index;
        }

        // ---------------------------------------------
        // IGNORE EMPTY TITLE
        // ---------------------------------------------

        if ($title === '') {

            continue;
        }

        // ---------------------------------------------
        // PROVIDER CONFIRMED REPLY BUTTON FORMAT
        // ---------------------------------------------

        $interactiveButtons[] = [

            'type' => 'reply',

            'reply' => [

                'id' => $id,

                'title' => $title,
            ],
        ];

        // ---------------------------------------------
        // MAX 3
        // ---------------------------------------------

        if (count($interactiveButtons) >= 3) {
            break;
        }
    }

    // =====================================================
    // BUTTON VALIDATION
    // =====================================================

    if (empty($interactiveButtons)) {

        return [
            'success' => false,
            'error' => true,
            'message' =>
                'No valid WhatsApp reply buttons found.',
        ];
    }

    // =====================================================
    // BUILD MEDIA HEADER
    // =====================================================

    $header = [];

    // =====================================================
    // IMAGE
    // =====================================================

    if ($mediaType === 'image') {

        $header = [

            'type' => 'image',

            'image' => [

                'link' => $mediaUrl,
            ],
        ];
    }

    // =====================================================
    // VIDEO
    // =====================================================

    elseif ($mediaType === 'video') {

        $header = [

            'type' => 'video',

            'video' => [

                'link' => $mediaUrl,
            ],
        ];
    }

    // =====================================================
    // DOCUMENT / PDF
    // =====================================================

    elseif ($mediaType === 'document') {

        $document = [

            'link' => $mediaUrl,
        ];

        // ---------------------------------------------
        // DOCUMENT FILENAME
        // ---------------------------------------------

        if ($fileName !== '') {

            $document['filename'] = $fileName;
        }

        $header = [

            'type' => 'document',

            'document' => $document,
        ];
    }

    // =====================================================
    // HEADER VALIDATION
    // =====================================================

    if (empty($header)) {

        return [
            'success' => false,
            'error' => true,
            'message' =>
                'Unable to build interactive media header.',
        ];
    }

    // =====================================================
    // BUILD INTERACTIVE
    // =====================================================

    $interactive = [

        'type' => 'button',

        // ---------------------------------------------
        // MEDIA HEADER
        // ---------------------------------------------

        'header' => $header,

        // ---------------------------------------------
        // BODY
        // ---------------------------------------------

        'body' => [

            'text' => $body,
        ],

        // ---------------------------------------------
        // ACTION
        // ---------------------------------------------

        'action' => [

            'buttons' => $interactiveButtons,
        ],
    ];

    // =====================================================
    // FOOTER
    // =====================================================

    if ($footer !== '') {

        $interactive['footer'] = [

            'text' => $footer,
        ];
    }

    // =====================================================
    // CONTENT
    // =====================================================

    $content = [

        'preview_url' => false,

        'shorten_url' => false,

        'type' => 'INTERACTIVE',

        'interactive' => $interactive,
    ];

    // =====================================================
    // BUILD COMMON PAYLOAD
    // =====================================================

    $payload = $this->buildPayload(
        $content,
        $to
    );

    // =====================================================
    // DEBUG LOG
    // =====================================================

    Log::info(
        'WHATSAPP INTERACTIVE MEDIA PAYLOAD',
        [

            'type' => strtoupper(
                $mediaType
            ),

            'to' => $to,

            'media_url' => $mediaUrl,

            'file_name' => $fileName,

            'body' => $body,

            'footer' => $footer,

            'buttons_count' =>
                count($interactiveButtons),

            'buttons' =>
                $interactiveButtons,

            'payload' => $payload,
        ]
    );

    // =====================================================
    // SEND REQUEST
    // =====================================================

    return $this->sendRequest(

        $payload,

        'INTERACTIVE_' .
        strtoupper($mediaType) .
        '_BUTTON',

        $originalTo
    );
}

    /*
    |--------------------------------------------------------------------------
    | MENU BUTTONS
    |--------------------------------------------------------------------------
    */

    public function sendMenuButtons(
        string $to,
        string $body,
        array $options
    ): array {
        $originalTo = $to;

        $to = $this->normalizeMobile($to);

        if ($to === '') {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Invalid WhatsApp mobile number.',
            ];
        }

        if (!$this->hasConfiguration()) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'WhatsApp API configuration missing.',
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Normalize Options
        |--------------------------------------------------------------------------
        */

        $normalizedOptions = [];

        foreach ($options as $index => $option) {
            if (!is_array($option)) {
                continue;
            }

            $id = (string) (
                $option['id']
                ?? $option['source_handle']
                ?? $option['sourceHandle']
                ?? 'source-option-' . $index
            );

            $title = trim((string) (
                $option['title']
                ?? $option['label']
                ?? $option['text']
                ?? ''
            ));

            if ($title === '') {
                continue;
            }

            $normalizedOptions[] = [
                'id' => $id,
                'source_handle' => $id,
                'title' => $title,
                'label' => $title,
            ];
        }

        if (empty($normalizedOptions)) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'No valid Menu options found.',
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | More than 3 = LIST
        |--------------------------------------------------------------------------
        */

        if (count($normalizedOptions) > 3) {
            return $this->sendList(
                $originalTo,
                $body,
                $normalizedOptions,
                'View Options'
            );
        }

        /*
        |--------------------------------------------------------------------------
        | BUTTONS
        |--------------------------------------------------------------------------
        */

        $buttons = [];

        foreach ($normalizedOptions as $option) {
            $buttons[] = [
                'type' => 'reply',
                'reply' => [
                    'id' => (string) $option['id'],
                    'title' => (string) $option['title'],
                ],
            ];
        }

        $content = [
            'preview_url' => false,
            'shorten_url' => false,
            'type' => 'INTERACTIVE',
            'interactive' => [
                'type' => 'button',
                'body' => [
                    'text' => $body,
                ],
                'action' => [
                    'buttons' => $buttons,
                ],
            ],
        ];

        $payload = $this->buildPayload(
            $content,
            $to
        );

        return $this->sendRequest(
            $payload,
            'MENU_BUTTON',
            $originalTo
        );
    }

    /*
    |--------------------------------------------------------------------------
    | LIST MESSAGE
    |--------------------------------------------------------------------------
    */

    public function sendList(
        string $to,
        string $body,
        array $options,
        string $buttonText = 'View Options'
    ): array {
        $originalTo = $to;

        $to = $this->normalizeMobile($to);

        if ($to === '') {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Invalid WhatsApp mobile number.',
            ];
        }

        if (!$this->hasConfiguration()) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'WhatsApp API configuration missing.',
            ];
        }



        $rows = [];

        foreach ($options as $index => $option) {
            if (!is_array($option)) {
                continue;
            }

            $id = (string) (
                $option['id']
                ?? $option['source_handle']
                ?? $option['sourceHandle']
                ?? 'source-option-' . $index
            );

            $title = trim((string) (
                $option['title']
                ?? $option['label']
                ?? $option['text']
                ?? 'Option ' . ($index + 1)
            ));

            if ($title === '') {
                continue;
            }

            $row = [
                'id' => $id,
                'title' => $title,
            ];

            $description = trim((string) (
                $option['description'] ?? ''
            ));

            if ($description !== '') {
                $row['description'] = $description;
            }

            $rows[] = $row;
        }

        if (empty($rows)) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'No valid WhatsApp list options found.',
            ];
        }

        $content = [
            'preview_url' => false,
            'shorten_url' => false,
            'type' => 'INTERACTIVE',
            'interactive' => [
                'type' => 'list',
                'body' => [
                    'text' => $body,
                ],
                'action' => [
                    'button' => $buttonText,
                    'sections' => [
                        [
                            'title' => 'Options',
                            'rows' => $rows,
                        ],
                    ],
                ],
            ],
        ];

        $payload = $this->buildPayload(
            $content,
            $to
        );

        return $this->sendRequest(
            $payload,
            'INTERACTIVE_LIST',
            $originalTo
        );
    }


public function sendImage(
    string $to,
    string $mediaUrl,
    string $caption = ''
): array {

    $originalTo = $to;

    // =====================================================
    // NORMALIZE MOBILE
    // =====================================================

    $to = $this->normalizeMobile($to);

    if ($to === '') {
        return [
            'success' => false,
            'error' => true,
            'message' => 'Invalid WhatsApp mobile number.',
        ];
    }

    // =====================================================
    // CHECK CONFIGURATION
    // =====================================================

    if (!$this->hasConfiguration()) {
        return [
            'success' => false,
            'error' => true,
            'message' => 'WhatsApp API configuration missing.',
        ];
    }

    // =====================================================
    // MEDIA URL
    // =====================================================

    $mediaUrl = trim($mediaUrl);
    $caption = trim($caption);

    if ($mediaUrl === '') {
        return [
            'success' => false,
            'error' => true,
            'message' => 'Image URL is empty.',
        ];
    }

    // =====================================================
    // VALIDATE URL
    // =====================================================

    if (!filter_var($mediaUrl, FILTER_VALIDATE_URL)) {
        return [
            'success' => false,
            'error' => true,
            'message' => 'Invalid image URL.',
        ];
    }

    try {

        $imageResponse = Http::timeout(30)
            ->connectTimeout(10)
            ->get($mediaUrl);

        if (!$imageResponse->successful()) {

            Log::error(
                'WHATSAPP IMAGE DOWNLOAD FAILED',
                [
                    'url' => $mediaUrl,
                    'status' => $imageResponse->status(),
                    'body' => $imageResponse->body(),
                ]
            );

            return [
                'success' => false,
                'error' => true,
                'message' => 'Unable to download image.',
                'status' => $imageResponse->status(),
            ];
        }

        $imageBinary = $imageResponse->body();

        if ($imageBinary === '') {

            return [
                'success' => false,
                'error' => true,
                'message' => 'Downloaded image is empty.',
            ];
        }

        // =================================================
        // DETECT MIME TYPE
        // =================================================

        $mimeType = $imageResponse->header('Content-Type');

        if (is_string($mimeType)) {
            $mimeType = strtolower(
                trim(
                    explode(';', $mimeType)[0]
                )
            );
        }

        // =================================================
        // FALLBACK MIME TYPE
        // =================================================

        if (!in_array(
            $mimeType,
            [
                'image/jpeg',
                'image/png',
            ],
            true
        )) {

            $extension = strtolower(
                pathinfo(
                    parse_url(
                        $mediaUrl,
                        PHP_URL_PATH
                    ) ?? '',
                    PATHINFO_EXTENSION
                )
            );

            $mimeType = match ($extension) {

                'png' => 'image/png',

                default => 'image/jpeg',
            };
        }

        // =================================================
        // BASE64
        // =================================================

        $attachmentData = base64_encode(
            $imageBinary
        );

    } catch (\Throwable $e) {

        Log::error(
            'WHATSAPP IMAGE DOWNLOAD ERROR',
            [
                'url' => $mediaUrl,
                'message' => $e->getMessage(),
            ]
        );

        return [
            'success' => false,
            'error' => true,
            'message' => 'Unable to download image.',
        ];
    }

    // =====================================================
    // BUILD ATTACHMENT
    // =====================================================

    $attachment = [
        'type' => 'image',
        'mimeType' => $mimeType,
        'attachmentData' => $attachmentData,
    ];

    // =====================================================
    // CAPTION
    // =====================================================

    if ($caption !== '') {
        $attachment['caption'] = $caption;
    }

    // =====================================================
    // CONTENT
    // =====================================================

    $content = [
        'preview_url' => false,
        'shorten_url' => false,
        'type' => 'ATTACHMENT',
        'attachment' => $attachment,
    ];

    // =====================================================
    // BUILD COMMON PAYLOAD
    // =====================================================

    $payload = $this->buildPayload(
        $content,
        $to
    );

    // =====================================================
    // DEBUG
    // =====================================================

    Log::info(
        'WHATSAPP IMAGE ATTACHMENT PAYLOAD',
        [
            'type' => 'IMAGE',
            'to' => $to,
            'media_url' => $mediaUrl,
            'mime_type' => $mimeType,
            'caption' => $caption,
            'binary_size' => strlen($imageBinary),
            'base64_size' => strlen($attachmentData),

            // Don't log full Base64 payload
            'payload' => [
                'message' => [
                    'channel' => $payload['message']['channel'] ?? null,
                    'content' => [
                        'preview_url' =>
                            $payload['message']['content']['preview_url'] ?? null,

                        'shorten_url' =>
                            $payload['message']['content']['shorten_url'] ?? null,

                        'type' =>
                            $payload['message']['content']['type'] ?? null,

                        'attachment' => [
                            'type' =>
                                $payload['message']['content']['attachment']['type']
                                ?? null,

                            'mimeType' =>
                                $payload['message']['content']['attachment']['mimeType']
                                ?? null,

                            'has_attachmentData' =>
                                !empty(
                                    $payload['message']['content']['attachment']['attachmentData']
                                    ?? ''
                                ),

                            'caption' =>
                                $payload['message']['content']['attachment']['caption']
                                ?? null,
                        ],
                    ],
                ],
            ],
        ]
    );

    // =====================================================
    // SEND
    // =====================================================

    return $this->sendRequest(
        $payload,
        'IMAGE',
        $originalTo
    );
}

    /*
    |--------------------------------------------------------------------------
    | DOCUMENT
    |--------------------------------------------------------------------------
    */

    public function sendDocument(
        string $to,
        string $mediaUrl,
        string $filename = '',
        string $caption = ''
    ): array {
        $originalTo = $to;

        $to = $this->normalizeMobile($to);

        if ($to === '') {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Invalid WhatsApp mobile number.',
            ];
        }

        if (!$this->hasConfiguration()) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'WhatsApp API configuration missing.',
            ];
        }

        $mediaUrl = trim($mediaUrl);

        if ($mediaUrl === '') {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Document URL is empty.',
            ];
        }

        $content = [
            'preview_url' => false,
            'shorten_url' => false,
            'type' => 'DOCUMENT',
            'document' => [
                'url' => $mediaUrl,
            ],
        ];

        if ($filename !== '') {
            $content['document']['filename'] = $filename;
        }

        if ($caption !== '') {
            $content['document']['caption'] = $caption;
        }

        $payload = $this->buildPayload(
            $content,
            $to
        );

        return $this->sendRequest(
            $payload,
            'DOCUMENT',
            $originalTo
        );
    }

    /*
    |--------------------------------------------------------------------------
    | AUDIO
    |--------------------------------------------------------------------------
    */

    public function sendAudio(
        string $to,
        string $mediaUrl
    ): array {
        $originalTo = $to;

        $to = $this->normalizeMobile($to);

        if ($to === '') {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Invalid WhatsApp mobile number.',
            ];
        }

        if (!$this->hasConfiguration()) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'WhatsApp API configuration missing.',
            ];
        }

        $mediaUrl = trim($mediaUrl);

        if ($mediaUrl === '') {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Audio URL is empty.',
            ];
        }

        $content = [
            'preview_url' => false,
            'shorten_url' => false,
            'type' => 'AUDIO',
            'audio' => [
                'url' => $mediaUrl,
            ],
        ];

        $payload = $this->buildPayload(
            $content,
            $to
        );

        return $this->sendRequest(
            $payload,
            'AUDIO',
            $originalTo
        );
    }

    /*
    |--------------------------------------------------------------------------
    | VIDEO
    |--------------------------------------------------------------------------
    */

    public function sendVideo(
        string $to,
        string $mediaUrl,
        string $caption = ''
    ): array {
        $originalTo = $to;

        $to = $this->normalizeMobile($to);

        if ($to === '') {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Invalid WhatsApp mobile number.',
            ];
        }

        if (!$this->hasConfiguration()) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'WhatsApp API configuration missing.',
            ];
        }

        $mediaUrl = trim($mediaUrl);

        if ($mediaUrl === '') {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Video URL is empty.',
            ];
        }

        $content = [
            'preview_url' => false,
            'shorten_url' => false,
            'type' => 'VIDEO',
            'video' => [
                'url' => $mediaUrl,
            ],
        ];

        if ($caption !== '') {
            $content['video']['caption'] = $caption;
        }

        $payload = $this->buildPayload(
            $content,
            $to
        );

        return $this->sendRequest(
            $payload,
            'VIDEO',
            $originalTo
        );
    }


    /**
 * |--------------------------------------------------------------------------
 * | DETECT MEDIA TYPE
 * |--------------------------------------------------------------------------
 */
private function detectMediaType(string $url): string
{
    $path = parse_url($url, PHP_URL_PATH);

    $extension = strtolower(
        pathinfo((string) $path, PATHINFO_EXTENSION)
    );

    return match ($extension) {

        // IMAGE
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp' =>
            'image',

        // DOCUMENT
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'txt' =>
            'document',

        // VIDEO
        'mp4',
        '3gp',
        'mov' =>
            'video',

        // AUDIO
        'mp3',
        'wav',
        'ogg',
        'm4a' =>
            'audio',

        // DEFAULT
        default =>
            'document',
    };
}


/**
 * |--------------------------------------------------------------------------
 * | MEDIA TEMPLATE
 * |--------------------------------------------------------------------------
 */
public function sendMediaTemplate(
    string $to,
    string $templateName,
    string $templateId,
    string $language = 'en',
    string $body = '',
    string $mediaUrl = '',
    array $variables = []
): array {

    /*
    |--------------------------------------------------------------------------
    | RESOLVE VALUES
    |--------------------------------------------------------------------------
    */

    $to = trim($to);
    $templateName = trim($templateName);
    $templateId = trim($templateId);
    $language = trim($language);
    $body = trim($body);
    $mediaUrl = trim($mediaUrl);

    /*
    |--------------------------------------------------------------------------
    | DETECT MEDIA TYPE
    |--------------------------------------------------------------------------
    */

    $mediaType = $this->detectMediaType($mediaUrl);



    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if ($to === '') {
        return [
            'success' => false,
            'status' => 422,
            'response' => null,
            'body' => 'Recipient number is required.',
        ];
    }

    if ($templateId === '') {
        return [
            'success' => false,
            'status' => 422,
            'response' => null,
            'body' => 'Template ID is required.',
        ];
    }

    if ($mediaUrl === '') {
        return [
            'success' => false,
            'status' => 422,
            'response' => null,
            'body' => 'Media URL is required.',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | BODY PARAMETERS
    |--------------------------------------------------------------------------
    */

    $bodyParameterValues = !empty($variables)
        ? $variables
        : new \stdClass();

    /*
    |--------------------------------------------------------------------------
    | BUTTONS
    |--------------------------------------------------------------------------
    */

    $buttons = new \stdClass();

    /*
    |--------------------------------------------------------------------------
    | MEDIA TEMPLATE
    |--------------------------------------------------------------------------
    */

    $mediaTemplate = [

        'templateId' =>
            $templateId,

        'bodyParameterValues' =>
            $bodyParameterValues,

        'buttons' =>
            $buttons,

        'media' => [

            'type' =>
                $mediaType,

            'url' =>
                $mediaUrl,
        ],
    ];

    /*
    |--------------------------------------------------------------------------
    | CONTENT
    |--------------------------------------------------------------------------
    */

    $content = [

        'preview_url' =>
            false,

        'type' =>
            'MEDIA_TEMPLATE',

        'mediaTemplate' =>
            $mediaTemplate,

        'shorten_url' =>
            true,
    ];

    /*
    |--------------------------------------------------------------------------
    | MAIN PAYLOAD
    |--------------------------------------------------------------------------
    */

    $payload = [

        'message' => [

            'channel' =>
                'WABA',

            'content' =>
                $content,

            'recipient' => [

                'to' =>
                    $to,

                'recipient_type' =>
                    'individual',

                'reference' => [

                    'cust_ref' =>
                        'cust_ref123',

                    'messageTag1' =>
                        'Message Tag 001',

                    'conversationId' =>
                        'Conv_123',
                ],
            ],

            'sender' => [

                'from' =>
                    $this->senderNumber,
            ],

            'preferences' => [

                'webHookDNId' =>
                    $this->webhookDNId,
            ],
        ],

        'metaData' => [

            'version' =>
                'v1.0.9',
        ],
    ];

    /*
    |--------------------------------------------------------------------------
    | DEBUG PAYLOAD
    |--------------------------------------------------------------------------
    */

    Log::info(
        '========== NEW MEDIA TEMPLATE REQUEST =========='
    );

    Log::info(
        json_encode(
            $payload,
            JSON_UNESCAPED_SLASHES |
            JSON_UNESCAPED_UNICODE |
            JSON_PRETTY_PRINT
        )
    );

    /*
    |--------------------------------------------------------------------------
    | SEND REQUEST
    |--------------------------------------------------------------------------
    */

    try {

        $response = Http::withHeaders([

            'Authentication' =>
                'Bearer ' . $this->token,

            'Content-Type' =>
                'application/json',

            'Accept' =>
                'application/json',

        ])
        ->timeout(30)
        ->post(
            $this->apiUrl,
            $payload
        );

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        Log::info(
            '========== NEW MEDIA TEMPLATE RESPONSE =========='
        );

        Log::info(
            'STATUS: ' .
            $response->status()
        );

        Log::info(
            'BODY: ' .
            $response->body()
        );

        return [

            'success' =>
                $response->successful(),

            'status' =>
                $response->status(),

            'response' =>
                $response->json(),

            'body' =>
                $response->body(),

            'payload' =>
                $payload,
        ];

    } catch (\Throwable $e) {

        Log::error(
            'MEDIA TEMPLATE HTTP ERROR',
            [

                'message' =>
                    $e->getMessage(),

                'file' =>
                    $e->getFile(),

                'line' =>
                    $e->getLine(),
            ]
        );

        return [

            'success' =>
                false,

            'status' =>
                500,

            'response' =>
                null,

            'body' =>
                $e->getMessage(),

            'payload' =>
                $payload,
        ];
    }
}
    /*
    |--------------------------------------------------------------------------
    | COMMON HTTP REQUEST
    |--------------------------------------------------------------------------
    */

    private function sendRequest(
        array $payload,
        string $messageType,
        string $originalTo
    ): array {
        $url = trim($this->apiUrl);

        if ($url === '') {
            return [
                'success' => false,
                'error' => true,
                'message' => 'WhatsApp API URL is empty.',
            ];
        }

        $jsonPayload = json_encode(
            $payload,
            JSON_UNESCAPED_SLASHES |
            JSON_UNESCAPED_UNICODE
        );

        if ($jsonPayload === false) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Failed to encode WhatsApp request.',
            ];
        }

        Log::info(
            'WHATSAPP API REQUEST',
            [
                'type' => $messageType,
                'to' => $originalTo,
                'url' => $url,
                'payload' => $payload,
            ]
        );

        try {
            $response = Http::timeout(30)
                ->connectTimeout(10)
                ->withHeaders([
                    'Authentication' =>
                        'Bearer ' . trim($this->token),

                    'Content-Type' =>
                        'application/json',

                    'Accept' =>
                        'application/json',
                ])
                ->withBody(
                    $jsonPayload,
                    'application/json'
                )
                ->post($url);

            $responseBody = $response->json();

            Log::info(
                'WHATSAPP API RESPONSE',
                [
                    'type' => $messageType,
                    'to' => $originalTo,
                    'status' => $response->status(),
                    'successful' => $response->successful(),
                    'body' => $response->body(),
                    'json' => $responseBody,
                ]
            );

            return [
                'success' =>
                    $response->successful(),

                'error' =>
                    !$response->successful(),

                'status' =>
                    $response->status(),

                'data' =>
                    $responseBody,

                'body' =>
                    $response->body(),
            ];
        } catch (\Throwable $e) {
            Log::error(
                'WHATSAPP API EXCEPTION',
                [
                    'type' => $messageType,
                    'to' => $originalTo,
                    'message' =>
                        $e->getMessage(),
                    'trace' =>
                        $e->getTraceAsString(),
                ]
            );

            return [
                'success' => false,
                'error' => true,
                'message' =>
                    $e->getMessage(),
            ];
        }
    }

    /*
    |--------------------------------------------------------------------------
    | COMMON PAYLOAD
    |--------------------------------------------------------------------------
    */

    private function buildPayload(
        array $content,
        string $usermobile
    ): array {
        return [
            'message' => [
                'channel' => 'WABA',

                'single_send' => 'true',

                'content' => $content,

                'recipient' => [
                    'to' => $usermobile,

                    'recipient_type' =>
                        'individual',

                    'reference' => [
                        'cust_ref' =>
                            'cust_ref123',

                        'messageTag1' =>
                            'Message Tag 001',

                        'conversationId' =>
                            'Conv_123',
                    ],
                ],

                'sender' => [
                    'name' =>
                        $this->senderName,

                    'from' =>
                        $this->senderNumber,
                ],

                'preferences' => [
                    'webHookDNId' =>
                        $this->webhookDNId,
                ],
            ],

            'metaData' => [
                'version' =>
                    'v1.0.9',
            ],
        ];
    }
}
