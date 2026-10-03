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

        $to = preg_replace('/\D+/', '', $to);

        if (empty($to)) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Invalid WhatsApp mobile number.',
            ];
        }

        if (strlen($to) === 10) {
            $to = '91' . $to;
        }

        if (
            empty($this->apiUrl) ||
            empty($this->token)
        ) {
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


    public function sendInteractive(
        string $to,
        string $body,
        array $buttons
    ): array {

        $originalTo = $to;

        $to = preg_replace('/\D+/', '', $to);

        if (empty($to)) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Invalid WhatsApp mobile number.',
            ];
        }

        if (strlen($to) === 10) {
            $to = '91' . $to;
        }

        if (
            empty($this->apiUrl) ||
            empty($this->token)
        ) {
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



    public function sendMenuButtons(
        string $to,
        string $body,
        array $options
    ): array {

        $originalTo = $to;

        $to = preg_replace('/\D+/', '', $to);

        if (empty($to)) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Invalid WhatsApp mobile number.',
            ];
        }

        if (strlen($to) === 10) {
            $to = '91' . $to;
        }

        if (
            empty($this->apiUrl) ||
            empty($this->token)
        ) {
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



        if (count($normalizedOptions) > 3) {

            return $this->sendList(
                $originalTo,
                $body,
                $normalizedOptions,
                'View Options'
            );
        }



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



    public function sendList(
        string $to,
        string $body,
        array $options,
        string $buttonText = 'View Options'
    ): array {

        $originalTo = $to;

        $to = preg_replace('/\D+/', '', $to);

        if (empty($to)) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'Invalid WhatsApp mobile number.',
            ];
        }

        if (strlen($to) === 10) {
            $to = '91' . $to;
        }

        if (
            empty($this->apiUrl) ||
            empty($this->token)
        ) {
            return [
                'success' => false,
                'error' => true,
                'message' => 'WhatsApp API configuration missing.',
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Build List Rows
        |--------------------------------------------------------------------------
        */

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


    // ========================================
// MEDIA METHODS
// ========================================

public function sendImage(
    string $to,
    string $mediaUrl,
    string $caption = ''
): array {
    $originalTo = $to;

    $to = preg_replace('/\D+/', '', $to);

    if (empty($to)) {
        return [
            'success' => false,
            'error' => true,
            'message' => 'Invalid WhatsApp mobile number.',
        ];
    }

    if (strlen($to) === 10) {
        $to = '91' . $to;
    }

    $content = [
        'preview_url' => false,
        'shorten_url' => false,
        'type' => 'IMAGE',
        'image' => [
            'url' => $mediaUrl,
        ],
    ];

    if ($caption !== '') {
        $content['image']['caption'] = $caption;
    }

    $payload = $this->buildPayload(
        $content,
        $to
    );

    return $this->sendRequest(
        $payload,
        'IMAGE',
        $originalTo
    );
}


public function sendDocument(
    string $to,
    string $mediaUrl,
    string $filename = '',
    string $caption = ''
): array {
    $originalTo = $to;

    $to = preg_replace('/\D+/', '', $to);

    if (empty($to)) {
        return [
            'success' => false,
            'error' => true,
            'message' => 'Invalid WhatsApp mobile number.',
        ];
    }

    if (strlen($to) === 10) {
        $to = '91' . $to;
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


public function sendAudio(
    string $to,
    string $mediaUrl
): array {
    $originalTo = $to;

    $to = preg_replace('/\D+/', '', $to);

    if (empty($to)) {
        return [
            'success' => false,
            'error' => true,
            'message' => 'Invalid WhatsApp mobile number.',
        ];
    }

    if (strlen($to) === 10) {
        $to = '91' . $to;
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


public function sendVideo(
    string $to,
    string $mediaUrl,
    string $caption = ''
): array {
    $originalTo = $to;

    $to = preg_replace('/\D+/', '', $to);

    if (empty($to)) {
        return [
            'success' => false,
            'error' => true,
            'message' => 'Invalid WhatsApp mobile number.',
        ];
    }

    if (strlen($to) === 10) {
        $to = '91' . $to;
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
