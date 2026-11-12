<?php



namespace App\Services;

use App\Models\WhatsAppAccount;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Cache\LockTimeoutException;
use App\Models\User;
use RuntimeException;

use Throwable;



class WhatsAppService

{

    protected string $apiUrl = '';

    protected string $token = '';

    protected string $senderNumber = '';

    protected string $senderName = 'Whatsappdemo';

    protected string $webhookDNId = '1001';

    protected string $sendUrl = '';

    protected string $verifyUrl = '';



    protected ?WhatsAppAccount $account = null;



    public function __construct()

    {

        $this->useDefaultConfiguration();



        $this->sendUrl = (string) config('services.whatsapp.send_url', '');

        $this->verifyUrl = (string) config('services.whatsapp.verify_url', '');

    }



    /*

    |--------------------------------------------------------------------------

    | DEFAULT CONFIGURATION

    |--------------------------------------------------------------------------

    */



    public function useDefaultConfiguration(): self
    {
        $this->account = null;

        $this->apiUrl = trim((string) config('services.whatsapp.api_url', ''));
        $this->token = trim((string) config('services.whatsapp.token', ''));
        $this->senderNumber = $this->normalizeMobile(
            (string) config('services.whatsapp.sender_number', '')
        );
        $this->senderName = trim(
            (string) config('services.whatsapp.sender_name', 'Whatsappdemo')
        );
        $this->webhookDNId = trim(
            (string) config('services.whatsapp.webhook_dn_id', '1001')
        );

        if (!$this->hasConfiguration()) {
            Log::warning('WHATSAPP DEFAULT CONFIGURATION INCOMPLETE', [
                'api_url_configured' => $this->apiUrl !== '',
                'token_configured' => $this->token !== '',
                'sender_number_configured' => $this->senderNumber !== '',
            ]);
        }

        return $this;
    }

    public function getAccount(): ?WhatsAppAccount

    {

        return $this->account;

    }



    /*

    |--------------------------------------------------------------------------

    | SELECT ACCOUNT BY USER AND RECEIVING MOBILE NUMBER

    |--------------------------------------------------------------------------

    */



    public function useAccountForUser(

        int $userId,

        ?string $mobileNumber = null

    ): self {

        $query = WhatsAppAccount::query()

            ->where('user_id', $userId);



        if ($mobileNumber !== null && trim($mobileNumber) !== '') {

            $mobile = $this->normalizeMobile($mobileNumber);



            // waba_id stores the connected WhatsApp mobile number

            $query->where('waba_id', $mobile);

        }



        $account = $query->first();



        if (!$account) {

            throw new RuntimeException(

                'No WhatsApp account found for this user and number.'

            );

        }



        if (!in_array(

            strtolower((string) $account->status),

            ['connected', 'active'],

            true

        )) {

            throw new RuntimeException(

                'This WhatsApp account is not active.'

            );

        }



        $this->account = $account;

        // Shared provider API URL is loaded from .env through config/services.php.
        $this->apiUrl = trim(
            (string) config('services.whatsapp.api_url', '')
        );

        // Keep credentials and sender details specific to the selected account.
        $this->token = trim((string) ($account->access_token ?? ''));
        $this->senderNumber = $this->normalizeMobile(
            (string) ($account->waba_id ?? '')
        );
        $this->senderName = trim(
            (string) ($account->sender_name ?: config('services.whatsapp.sender_name', 'Whatsappdemo'))
        );
        $this->webhookDNId = trim(
            (string) ($account->webhook_dn_id ?: config('services.whatsapp.webhook_dn_id', '1001'))
        );

        if (!$this->hasConfiguration()) {
            Log::error('WHATSAPP ACCOUNT CONFIGURATION INCOMPLETE', [
                'account_id' => $account->id,
                'user_id' => $userId,
                'api_url_configured' => $this->apiUrl !== '',
                'token_configured' => $this->token !== '',
                'sender_number_configured' => $this->senderNumber !== '',
            ]);

            throw new RuntimeException(
                'WhatsApp account configuration is incomplete.'
            );
        }

        return $this;

    }



public function useAccountById(
    int $accountId,
    int $userId
): self {

    $account = WhatsAppAccount::query()
        ->where('id', $accountId)
        ->where('user_id', $userId)
        ->first();

    if (!$account) {
        throw new RuntimeException(
            'WhatsApp account not found for this user.'
        );
    }

    if (!in_array(
        strtolower((string) $account->status),
        ['connected', 'active'],
        true
    )) {
        throw new RuntimeException(
            'This WhatsApp account is not active.'
        );
    }

    $this->account = $account;

    $this->apiUrl = trim(
        (string) config('services.whatsapp.api_url', '')
    );

    $this->token = trim(
        (string) ($account->access_token ?? '')
    );

    $this->senderNumber = $this->normalizeMobile(
        (string) ($account->waba_id ?? '')
    );

    $this->senderName = trim(
        (string) (
            $account->sender_name
            ?: config('services.whatsapp.sender_name', 'Whatsappdemo')
        )
    );

    $this->webhookDNId = trim(
        (string) (
            $account->webhook_dn_id
            ?: config('services.whatsapp.webhook_dn_id', '1001')
        )
    );

    if (!$this->hasConfiguration()) {
        throw new RuntimeException(
            'WhatsApp account configuration is incomplete.'
        );
    }

    return $this;
}


    /*

    |--------------------------------------------------------------------------

    | NORMALIZE MOBILE

    |--------------------------------------------------------------------------

    */



    private function normalizeMobile(string $mobile): string

    {

        $mobile = preg_replace('/\D+/', '', $mobile) ?? '';



        if (strlen($mobile) === 10) {

            $mobile = '91' . $mobile;

        }



        return $mobile;

    }



    /*

    |--------------------------------------------------------------------------

    | CONFIGURATION CHECK

    |--------------------------------------------------------------------------

    */



    private function hasConfiguration(): bool

    {

        return $this->apiUrl !== ''

            && $this->token !== ''

            && $this->senderNumber !== '';

    }



    /*

    |--------------------------------------------------------------------------

    | COMMON HTTP REQUEST

    |--------------------------------------------------------------------------

    */



    // private function sendRequest(

    //     array $payload,

    //     string $messageType,

    //     string $originalTo

    // ): array {

    //     if (!$this->hasConfiguration()) {

    //         return [

    //             'success' => false,

    //             'error' => true,

    //             'message' => 'WhatsApp API configuration missing.',

    //         ];

    //     }



    //     try {

    //         $response = Http::timeout(30)

    //             ->connectTimeout(10)

    //             ->withHeaders([

    //                 'Authentication' => 'Bearer ' . trim($this->token),

    //                 'Content-Type' => 'application/json',

    //                 'Accept' => 'application/json',

    //             ])

    //             ->post($this->apiUrl, $payload);



    //         $body = $response->json();




    //         // Some providers return HTTP 200 but an error in JSON.

    //         $providerStatus = data_get($body, 'statusCode');



    //         $providerFailed = is_numeric($providerStatus)

    //             && (int) $providerStatus >= 400;



    //         $success = $response->successful() && !$providerFailed;



    //         return [

    //             'success' => $success,

    //             'error' => !$success,

    //             'status' => $response->status(),

    //             'data' => $body,

    //             'body' => $response->body(),

    //             'message' => $success

    //                 ? 'WhatsApp request processed.'

    //                 : (

    //                     data_get($body, 'message')

    //                     ?? data_get($body, 'error')

    //                     ?? 'WhatsApp provider request failed.'

    //                 ),

    //         ];

    //     } catch (Throwable $e) {

    //         Log::error('WHATSAPP API EXCEPTION', [

    //             'type' => $messageType,

    //             'to' => $originalTo,

    //             'account_id' => $this->account?->id,

    //             'message' => $e->getMessage(),

    //         ]);



    //         return [

    //             'success' => false,

    //             'error' => true,

    //             'message' => $e->getMessage(),

    //         ];

    //     }

    // }



    private function sendRequest(

        array $payload,

        string $messageType,

        string $originalTo

    ): array {

        if (!$this->hasConfiguration()) {

            return [

                'success' => false,

                'error' => true,

                'message' => 'WhatsApp API configuration missing.',

            ];

        }


        // WALLET BALANCE VALIDATION

            if (!$this->account) {
                return $this->failure(
                    'WhatsApp account not selected for wallet validation.'
                );
            }

            $user = User::find($this->account->user_id);

            if (!$user) {
                return $this->failure('Wallet user not found.');
            }

            try {

                app(WalletService::class)->validateMessageBalance($user);

            } catch (RuntimeException $e) {

                Log::warning('WHATSAPP MESSAGE BLOCKED - WALLET', [
                    'user_id' => $user->id,
                    'account_id' => $this->account->id,
                    'message' => $e->getMessage(),
                ]);

                return $this->failure($e->getMessage());
            }



        try {

            $response = Http::timeout(30)

                ->connectTimeout(10)

                ->withHeaders([

                    'Authentication' => 'Bearer ' . trim($this->token),

                    'Content-Type' => 'application/json',

                    'Accept' => 'application/json',

                ])

                ->post($this->apiUrl, $payload);



            $body = $response->json();




            // Some providers return HTTP 200 but an error in JSON.

            $providerStatus = data_get($body, 'statusCode');



            $providerFailed = is_numeric($providerStatus)

                && (int) $providerStatus >= 400;



            $success = $response->successful() && !$providerFailed;



            return [

                'success' => $success,

                'error' => !$success,

                'status' => $response->status(),

                'data' => $body,

                'body' => $response->body(),

                'message' => $success

                    ? 'WhatsApp request processed.'

                    : (

                        data_get($body, 'message')

                        ?? data_get($body, 'error')

                        ?? 'WhatsApp provider request failed.'

                    ),

            ];

        } catch (Throwable $e) {

            Log::error('WHATSAPP API EXCEPTION', [

                'type' => $messageType,

                'to' => $originalTo,

                'account_id' => $this->account?->id,

                'message' => $e->getMessage(),

            ]);



            return [

                'success' => false,

                'error' => true,

                'message' => $e->getMessage(),

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

        string $recipientMobile

    ): array {

        return [

            'message' => [

                'channel' => 'WABA',

                // 'single_send' => 'true',

                'content' => $content,

                'recipient' => [

                    'to' => $recipientMobile,

                    'recipient_type' => 'individual',

                    'reference' => [

                        'cust_ref' => 'cust_ref123',

                        'messageTag1' => 'Message Tag 001',

                        'conversationId' => 'Conv_123',

                    ],

                ],

                'sender' => [

                    'name' => $this->senderName,

                    'from' => $this->senderNumber,

                ],

                'preferences' => [

                    'webHookDNId' => $this->webhookDNId,

                ],

            ],

            'metaData' => [

                'version' => 'v1.0.9',

            ],

        ];

    }



    /*

    |--------------------------------------------------------------------------

    | SEND TEXT

    |--------------------------------------------------------------------------

    */


//     public function sendText(
//     string $to,
//     string $text,
//     ?string $replyToMessageId = null
// ): array {

//     $originalTo = $to;

//     $to = $this->normalizeMobile($to);

//     if ($to === '') {
//         return $this->failure('Invalid WhatsApp mobile number.');
//     }

//     if (!$this->hasConfiguration()) {
//         return $this->failure('WhatsApp API configuration missing.');
//     }

//     $messageData = [
//         'preview_url' => false,
//         'shorten_url' => false,
//         'type' => 'TEXT',
//         'text' => $text,
//     ];

//     if (!empty($replyToMessageId)) {
//         $messageData['reply_to_message_id'] = $replyToMessageId;
//     }

//     $payload = $this->buildPayload($messageData, $to);

//     return $this->sendRequest($payload, 'TEXT', $originalTo);
// }



public function sendText(
    string $to,
    string $text,
    ?string $replyToMessageId = null,
    bool $skipWalletCheck = false
): array {

    $originalTo = $to;

    $to = $this->normalizeMobile($to);

    if ($to === '') {
        return $this->failure('Invalid WhatsApp mobile number.');
    }

    if (!$this->hasConfiguration()) {
        return $this->failure('WhatsApp API configuration missing.');
    }

    $messageData = [
        'preview_url' => false,
        'shorten_url' => false,
        'type' => 'TEXT',
        'text' => $text,
    ];

    if (!empty($replyToMessageId)) {
        $messageData['reply_to_message_id'] = $replyToMessageId;
    }

    $payload = $this->buildPayload($messageData, $to);

    return $this->sendRequest(
        $payload,
        'TEXT',
        $originalTo,
        $skipWalletCheck
    );
}



public function sendInteractive(
    string $to,
    string $body,
    array $buttons
): array {
    $originalTo = $to;
    $to = $this->normalizeMobile($to);

    if ($to === '') {
        return $this->failure('Invalid WhatsApp mobile number.');
    }

    if (!$this->hasConfiguration()) {
        return $this->failure('WhatsApp API configuration missing.');
    }

    $normalized = [];
    $urlButton = null;

    foreach ($buttons as $button) {
        if (!is_array($button)) {
            continue;
        }

        $title = trim((string) (
            $button['title']
            ?? $button['label']
            ?? $button['text']
            ?? ''
        ));

        if ($title === '') {
            continue;
        }

        $buttonType = strtolower(trim((string) (
            $button['type']
            ?? $button['buttonType']
            ?? $button['button_type']
            ?? 'reply'
        )));

        if ($buttonType === 'url') {
            $url = trim((string) (
                $button['url']
                ?? $button['buttonUrl']
                ?? $button['button_url']
                ?? ''
            ));

            if (
                $url === ''
                || !filter_var($url, FILTER_VALIDATE_URL)
                || strtolower((string) parse_url(
                    $url,
                    PHP_URL_SCHEME
                )) !== 'https'
            ) {
                return $this->failure(
                    "Button '{$title}' requires a valid HTTPS URL."
                );
            }

            if ($urlButton !== null) {
                return $this->failure(
                    'Only one URL button is supported.'
                );
            }

            $urlButton = [
                'display_text' => $title,
                'url' => $url,
            ];

            continue;
        }

        if ($buttonType !== 'reply') {
            return $this->failure(
                "Unsupported button type: {$buttonType}"
            );
        }

        $replyId = trim((string) (
            $button['source_handle']
            ?? $button['sourceHandle']
            ?? $button['id']
            ?? ''
        ));

        if ($replyId === '') {
            return $this->failure(
                "Button '{$title}' is missing its reply ID."
            );
        }

        $normalized[] = [
            'type' => 'reply',
            'reply' => [
                'id' => $replyId,
                'title' => $title,
            ],
        ];

        if (count($normalized) > 3) {
            return $this->failure(
                'A maximum of 3 reply buttons is supported.'
            );
        }
    }

    if ($urlButton === null && empty($normalized)) {
        return $this->failure('No valid WhatsApp buttons found.');
    }



    $action = [
        'buttons' => $normalized,
    ];

    if ($urlButton !== null) {
        $action['name'] = 'cta_url';
        $action['parameters'] = [
            'display_text' => $urlButton['display_text'],
            'url' => $urlButton['url'],
        ];
    }

    $content = [
        'preview_url' => false,
        'shorten_url' => $urlButton !== null,
        'type' => 'INTERACTIVE',
        'interactive' => [
            'type' => $urlButton !== null && empty($normalized)
                ? 'cta_url'
                : 'button',
            'body' => [
                'text' => $body,
            ],
            'action' => $action,
        ],
    ];

    $payload = $this->buildPayload($content, $to);



    return $this->sendRequest(
        $payload,
        $urlButton !== null && !empty($normalized)
            ? 'INTERACTIVE_MIXED'
            : ($urlButton !== null
                ? 'INTERACTIVE_CTA_URL'
                : 'INTERACTIVE_BUTTON'),
        $originalTo
    );
}


    /*

    |--------------------------------------------------------------------------

    | SEND MENU BUTTONS OR LIST

    |--------------------------------------------------------------------------

    */



    // public function sendMenuButtons(

    //     string $to,

    //     string $body,

    //     array $options
    //      ?string $replyToMessageId = null

    // ): array {

    //     $normalized = [];



    //     foreach ($options as $index => $option) {

    //         if (!is_array($option)) {

    //             continue;

    //         }



    //         $title = trim((string) (

    //             $option['title']

    //             ?? $option['label']

    //             ?? $option['text']

    //             ?? ''

    //         ));



    //         if ($title === '') {

    //             continue;

    //         }



    //         $normalized[] = [

    //             'id' => (string) (

    //                 $option['id']

    //                 ?? $option['source_handle']

    //                 ?? $option['sourceHandle']

    //                 ?? 'source-option-' . $index

    //             ),

    //             'title' => $title,

    //             'description' => (string) ($option['description'] ?? ''),

    //         ];

    //     }



    //     if (!$normalized) {

    //         return $this->failure('No valid menu options found.');

    //     }



    //   return $this->sendList($to, $body, $normalized);

    // }


    public function sendMenuButtons(
    string $to,
    string $body,
    array $options,
    ?string $replyToMessageId = null
): array {

    $normalized = [];

    foreach ($options as $index => $option) {

        if (!is_array($option)) {
            continue;
        }

        $title = trim((string) (
            $option['title']
            ?? $option['label']
            ?? $option['text']
            ?? ''
        ));

        if ($title === '') {
            continue;
        }

        $normalized[] = [
            'id' => (string) (
                $option['id']
                ?? $option['source_handle']
                ?? $option['sourceHandle']
                ?? 'source-option-' . $index
            ),
            'title' => $title,
            'description' => (string) ($option['description'] ?? ''),
        ];
    }

    if (!$normalized) {
        return $this->failure('No valid menu options found.');
    }

    return $this->sendList(
        $to,
        $body,
        $normalized,
        'View Options',
        $replyToMessageId
    );
}



    /*

    |--------------------------------------------------------------------------

    | SEND LIST

    |--------------------------------------------------------------------------

    */



    public function sendList(

        string $to,

        string $body,

        array $options,

        string $buttonText = 'View Options',
         ?string $replyToMessageId = null

    ): array {

        $originalTo = $to;

        $to = $this->normalizeMobile($to);



        if ($to === '') {

            return $this->failure('Invalid WhatsApp mobile number.');

        }



        if (!$this->hasConfiguration()) {

            return $this->failure('WhatsApp API configuration missing.');

        }



        $rows = [];



        foreach ($options as $index => $option) {

            if (!is_array($option)) {

                continue;

            }



            $title = trim((string) (

                $option['title']

                ?? $option['label']

                ?? $option['text']

                ?? ''

            ));



            if ($title === '') {

                continue;

            }



            if (mb_strlen($title) > 24) {

                return $this->failure(

                    "Menu row title '{$title}' exceeds 24 characters."

                );

            }



            $row = [

                'id' => (string) (

                    $option['id']

                    ?? $option['source_handle']

                    ?? $option['sourceHandle']

                    ?? 'source-option-' . $index

                ),

                'title' => $title,

            ];



            $description = trim((string) ($option['description'] ?? ''));



            if ($description !== '') {

                $row['description'] = $description;

            }



            $rows[] = $row;

        }



        if (!$rows) {

            return $this->failure('No valid WhatsApp list options found.');

        }



      $content = [
    'preview_url' => false,
    'shorten_url' => false,
    'type' => 'INTERACTIVE',
    'interactive' => [
        'type' => 'list',
        'body' => ['text' => $body],
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

// Incoming message MID, if provided
if (!empty($replyToMessageId)) {
    $content['reply_to_message_id'] = $replyToMessageId;
}

$payload = $this->buildPayload($content, $to);

return $this->sendRequest($payload, 'INTERACTIVE_LIST', $originalTo);

    }



    /*

    |--------------------------------------------------------------------------

    | SEND IMAGE

    |--------------------------------------------------------------------------

    */



    public function sendImage(

        string $to,

        string $mediaUrl,

        string $caption = ''

    ): array {

        $originalTo = $to;

        $to = $this->normalizeMobile($to);



        if ($to === '' || !filter_var($mediaUrl, FILTER_VALIDATE_URL)) {

            return $this->failure('Invalid recipient number or image URL.');

        }



        if (!$this->hasConfiguration()) {

            return $this->failure('WhatsApp API configuration missing.');

        }



        try {

            $response = Http::timeout(30)

                ->connectTimeout(10)

                ->get($mediaUrl);



            if (!$response->successful() || $response->body() === '') {

                return $this->failure('Unable to download image.');

            }



            $mime = strtolower(trim(explode(

                ';',

                (string) $response->header('Content-Type')

            )[0]));



            if (!in_array($mime, ['image/jpeg', 'image/png'], true)) {

                $extension = strtolower(pathinfo(

                    (string) parse_url($mediaUrl, PHP_URL_PATH),

                    PATHINFO_EXTENSION

                ));



                $mime = $extension === 'png' ? 'image/png' : 'image/jpeg';



            }


               $base64 = base64_encode($response->body());



            $attachment = [

                'type' => 'image',

                'mimeType' => $mime,

                'attachmentData' => $base64,

            ];



            if (trim($caption) !== '') {

                $attachment['caption'] = trim($caption);

            }





            $payload = $this->buildPayload([

            'type' => 'ATTACHMENT',
            'attachment' => $attachment,
        ], $to);


            return $this->sendRequest($payload, 'IMAGE', $originalTo);

        } catch (Throwable $e) {

            Log::error('WHATSAPP IMAGE ERROR', [

                'message' => $e->getMessage(),

            ]);



            return $this->failure('Unable to process image.');

        }

    }



    /*

    |--------------------------------------------------------------------------

    | SEND DOCUMENT

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



        if ($to === '' || trim($mediaUrl) === '') {

            return $this->failure('Recipient number and document URL are required.');

        }



        $document = ['url' => trim($mediaUrl)];



        if ($filename !== '') {

            $document['filename'] = $filename;

        }



        if ($caption !== '') {

            $document['caption'] = $caption;

        }



        $payload = $this->buildPayload([

            'preview_url' => false,

            'shorten_url' => false,

            'type' => 'DOCUMENT',

            'document' => $document,

        ], $to);



        return $this->sendRequest($payload, 'DOCUMENT', $originalTo);

    }



    /*

    |--------------------------------------------------------------------------

    | SEND AUDIO

    |--------------------------------------------------------------------------

    */



    public function sendAudio(string $to, string $mediaUrl): array

    {

        $originalTo = $to;

        $to = $this->normalizeMobile($to);



        if ($to === '' || trim($mediaUrl) === '') {

            return $this->failure('Recipient number and audio URL are required.');

        }



        $payload = $this->buildPayload([

            'preview_url' => false,

            'shorten_url' => false,

            'type' => 'AUDIO',

            'audio' => ['url' => trim($mediaUrl)],

        ], $to);



        return $this->sendRequest($payload, 'AUDIO', $originalTo);

    }



    /*

    |--------------------------------------------------------------------------

    | SEND VIDEO

    |--------------------------------------------------------------------------

    */



    public function sendVideo(

        string $to,

        string $mediaUrl,

        string $caption = ''

    ): array {

        $originalTo = $to;

        $to = $this->normalizeMobile($to);



        if ($to === '' || trim($mediaUrl) === '') {

            return $this->failure('Recipient number and video URL are required.');

        }



        $video = ['url' => trim($mediaUrl)];



        if (trim($caption) !== '') {

            $video['caption'] = trim($caption);

        }



        $payload = $this->buildPayload([

            'preview_url' => false,

            'shorten_url' => false,

            'type' => 'VIDEO',

            'video' => $video,

        ], $to);



        return $this->sendRequest($payload, 'VIDEO', $originalTo);

    }



    /*

    |--------------------------------------------------------------------------

    | SEND INTERACTIVE MEDIA

    |--------------------------------------------------------------------------

    */



    public function sendInteractiveWithMedia(

        string $to,

        string $mediaType,

        string $mediaUrl,

        string $body,

        array $buttons,

        string $footer = '',

        string $fileName = ''

    ): array {

        $mediaType = strtolower(trim($mediaType));



        if ($mediaType === 'pdf') {

            $mediaType = 'document';

        }



        if (!in_array($mediaType, ['image', 'video', 'document'], true)) {

            return $this->failure('Unsupported interactive media type.');

        }



        $header = match ($mediaType) {

            'image' => [

                'type' => 'image',

                'image' => ['link' => trim($mediaUrl)],

            ],

            'video' => [

                'type' => 'video',

                'video' => ['link' => trim($mediaUrl)],

            ],

            'document' => [

                'type' => 'document',

                'document' => array_filter([

                    'link' => trim($mediaUrl),

                    'filename' => trim($fileName) ?: null,

                ]),

            ],

        };



        $normalizedButtons = [];



        foreach ($buttons as $index => $button) {

            if (!is_array($button)) {

                continue;

            }



            $title = trim((string) (

                $button['title']

                ?? $button['label']

                ?? $button['text']

                ?? ''

            ));



            if ($title === '') {

                continue;

            }



            $normalizedButtons[] = [

                'type' => 'reply',

                'reply' => [

                    'id' => (string) (

                        $button['id']

                        ?? $button['source_handle']

                        ?? $button['sourceHandle']

                        ?? 'source-option-' . $index

                    ),

                    'title' => $title,

                ],

            ];



            if (count($normalizedButtons) >= 3) {

                break;

            }

        }



        if (!$normalizedButtons) {

            return $this->failure('No valid interactive reply buttons found.');

        }



        $interactive = [

            'type' => 'button',

            'header' => $header,

            'body' => ['text' => trim($body) ?: 'Please select an option.'],

            'action' => ['buttons' => $normalizedButtons],

        ];



        if (trim($footer) !== '') {

            $interactive['footer'] = ['text' => trim($footer)];

        }



        $originalTo = $to;

        $to = $this->normalizeMobile($to);



        if ($to === '') {

            return $this->failure('Invalid WhatsApp mobile number.');

        }



        $payload = $this->buildPayload([

            'preview_url' => false,

            'shorten_url' => false,

            'type' => 'INTERACTIVE',

            'interactive' => $interactive,

        ], $to);



        return $this->sendRequest(

            $payload,

            'INTERACTIVE_' . strtoupper($mediaType) . '_BUTTON',

            $originalTo

        );

    }



    /*

    |--------------------------------------------------------------------------

    | MEDIA TEMPLATE

    |--------------------------------------------------------------------------

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

        $originalTo = $to;

        $to = $this->normalizeMobile($to);



        if ($to === '' || trim($templateId) === '' || trim($mediaUrl) === '') {

            return $this->failure('Recipient, template ID and media URL are required.');

        }



        $mediaType = $this->detectMediaType($mediaUrl);



        $payload = [

            'message' => [

                'channel' => 'WABA',

                'content' => [

                    'preview_url' => false,

                    'type' => 'MEDIA_TEMPLATE',

                    'mediaTemplate' => [

                        'templateId' => $templateId,

                        'bodyParameterValues' => $variables ?: new \stdClass(),

                        'buttons' => new \stdClass(),

                        'media' => [

                            'type' => $mediaType,

                            'url' => trim($mediaUrl),

                        ],

                    ],

                    'shorten_url' => true,

                ],

                'recipient' => [

                    'to' => $to,

                    'recipient_type' => 'individual',

                    'reference' => [

                        'cust_ref' => 'cust_ref123',

                        'messageTag1' => 'Message Tag 001',

                        'conversationId' => 'Conv_123',

                    ],

                ],

                'sender' => [

                    'from' => $this->senderNumber,

                    'name' => $this->senderName,

                ],

                'preferences' => [

                    'webHookDNId' => $this->webhookDNId,

                ],

            ],

            'metaData' => ['version' => 'v1.0.9'],

        ];



        return $this->sendRequest($payload, 'MEDIA_TEMPLATE', $originalTo);

    }



    private function detectMediaType(string $url): string

    {

        $extension = strtolower(pathinfo(

            (string) parse_url($url, PHP_URL_PATH),

            PATHINFO_EXTENSION

        ));



        return match ($extension) {

            'jpg', 'jpeg', 'png', 'gif', 'webp' => 'image',

            'mp4', '3gp', 'mov' => 'video',

            'mp3', 'wav', 'ogg', 'm4a' => 'audio',

            default => 'document',

        };

    }



    /*

    |--------------------------------------------------------------------------

    | OTP HELPERS

    |--------------------------------------------------------------------------

    */



    protected function replaceVariables(

        mixed $value,

        array $variables

    ): mixed {

        if (is_array($value)) {

            foreach ($value as $key => $item) {

                $value[$key] = $this->replaceVariables($item, $variables);

            }



            return $value;

        }



        if (!is_string($value)) {

            return $value;

        }



        foreach ($variables as $key => $replacement) {

            $value = str_replace(

                ['{{' . $key . '}}', '{' . $key . '}'],

                (string) $replacement,

                $value

            );

        }



        return $value;

    }



    public function sendOtp(string $mobile, array $config = []): array

    {

        $url = trim((string) (

            $config['sendOtpUrl'] ?? $this->sendUrl

        ));



        if ($url === '') {

            return $this->failure('OTP send URL is not configured.');

        }



        $method = strtoupper((string) ($config['sendOtpMethod'] ?? 'POST'));

        $payload = $config['sendOtpPayload'] ?? [];



        if (!is_array($payload)) {

            $payload = [];

        }



        $payload = $this->replaceVariables($payload, [

            'phone' => $mobile,

            'mobile' => $mobile,

            'phone_number' => $mobile,

        ]);



        if (

            empty($payload['mobile']) &&

            empty($payload['phone']) &&

            empty($payload['phone_number'])

        ) {

            $payload['mobile'] = $mobile;

        }



        return $this->sendOtpRequest($url, $method, $payload, 'OTP SEND');

    }



    public function verifyOtp(

        string $mobile,

        string $otp,

        array $config = [],

        ?string $reference = null

    ): array {

        $url = trim((string) (

            $config['verifyOtpUrl'] ?? $this->verifyUrl

        ));



        if ($url === '') {

            return [

                'success' => false,

                'verified' => false,

                'message' => 'OTP verify URL is not configured.',

            ];

        }



        $method = strtoupper((string) ($config['verifyOtpMethod'] ?? 'POST'));

        $payload = $config['verifyOtpPayload'] ?? [];



        if (!is_array($payload)) {

            $payload = [];

        }



        $payload = $this->replaceVariables($payload, [

            'phone' => $mobile,

            'mobile' => $mobile,

            'phone_number' => $mobile,

            'otp' => $otp,

            'code' => $otp,

            'reference' => $reference ?? '',

            'reference_id' => $reference ?? '',

            'transaction_id' => $reference ?? '',

        ]);



        if (

            empty($payload['mobile']) &&

            empty($payload['phone']) &&

            empty($payload['phone_number'])

        ) {

            $payload['mobile'] = $mobile;

        }



        if (empty($payload['otp']) && empty($payload['code'])) {

            $payload['otp'] = $otp;

        }



        $result = $this->sendOtpRequest(

            $url,

            $method,

            $payload,

            'OTP VERIFY'

        );



        if (empty($result['success'])) {

            $result['verified'] = false;

            return $result;

        }



        $body = $result['response'] ?? [];



        $verified = false;



        if (is_array($body)) {

            foreach (['verified', 'success', 'valid'] as $key) {

                if (array_key_exists($key, $body)) {

                    $verified = filter_var(

                        $body[$key],

                        FILTER_VALIDATE_BOOLEAN

                    );

                    break;

                }

            }



            if (!$verified && isset($body['status'])) {

                $verified = in_array(

                    strtolower((string) $body['status']),

                    ['success', 'verified', 'valid', 'approved'],

                    true

                );

            }

        }



        $result['verified'] = $verified;

        $result['message'] = $body['message'] ?? (

            $verified ? 'OTP verified successfully.' : 'Invalid OTP.'

        );



        return $result;

    }



    private function sendOtpRequest(

        string $url,

        string $method,

        array $payload,

        string $label

    ): array {

        try {

            $request = Http::acceptJson()->timeout(30);



            if ($this->token !== '') {

                $request = $request->withToken($this->token);

            }



            $response = strtoupper($method) === 'GET'

                ? $request->get($url, $payload)

                : $request->post($url, $payload);



            $body = $response->json();


            if (!$response->successful()) {

                return [

                    'success' => false,

                    'message' => data_get($body, 'message')

                        ?? data_get($body, 'error')

                        ?? 'OTP request failed.',

                    'status' => $response->status(),

                    'response' => $body,

                ];

            }



            return [

                'success' => true,

                'message' => data_get($body, 'message') ?? 'Request successful.',

                'status' => $response->status(),

                'response' => $body,

                'reference' => data_get($body, 'reference')

                    ?? data_get($body, 'reference_id')

                    ?? data_get($body, 'transaction_id')

                    ?? data_get($body, 'request_id'),

            ];

        } catch (Throwable $e) {

            Log::error($label . ' ERROR', [

                'message' => $e->getMessage(),

            ]);



            return [

                'success' => false,

                'message' => 'Unable to process OTP request.',

                'error' => $e->getMessage(),

            ];

        }

    }



    /*

    |--------------------------------------------------------------------------

    | COMMON FAILURE RESPONSE

    |--------------------------------------------------------------------------

    */



    private function failure(string $message): array

    {

        return [

            'success' => false,

            'error' => true,

            'message' => $message,

        ];

    }

}
