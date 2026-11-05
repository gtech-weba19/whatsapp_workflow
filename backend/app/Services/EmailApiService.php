<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;
use RuntimeException;
use Throwable;

class EmailApiService
{
    /**
     * Send an email using HTML content.
     */
    public function send(
        string $to,
        string $subject,
        string $html,
        ?string $toName = null
    ): array {
        $emailUrl = (string) config('services.email.email_url', '');
        $apiKey = (string) config('services.email.api_key', '');
        $fromEmail = (string) config('services.email.from_email', '');
        $fromName = (string) config(
            'services.email.from_name',
            config('app.name')
        );

        if ($emailUrl === '' || $apiKey === '') {
            throw new RuntimeException(
                'Email API URL or API key is not configured.'
            );
        }

        if ($fromEmail === '') {
            throw new RuntimeException(
                'Email sender address is not configured.'
            );
        }

        $payload = [
            'from' => [
                'email' => $fromEmail,
                'name' => $fromName,
            ],
            'subject' => $subject,
            'content' => [
                [
                    'type' => 'html',
                    'value' => $html,
                ],
            ],
            'personalizations' => [
                [
                    'to' => [
                        [
                            'email' => $to,
                            'name' => $toName ?? $to,
                        ],
                    ],
                ],
            ],
        ];

        try {
            $response = Http::withHeaders([
                'api_key' => $apiKey,
            ])
                ->acceptJson()
                ->asJson()
                ->timeout(30)
                ->post($emailUrl, $payload);

            if (!$response->successful()) {
                Log::error('Email API request failed', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                    'recipient' => $to,
                ]);

                return [
                    'success' => false,
                    'message' => 'Email API request failed.',
                    'status_code' => $response->status(),
                    'error' => $response->json() ?? $response->body(),
                ];
            }

            return [
                'success' => true,
                'message' => 'Email request accepted successfully.',
                'status_code' => $response->status(),
                'data' => $response->json(),
            ];

        } catch (Throwable $e) {
            Log::error('Email API connection exception', [
                'error' => $e->getMessage(),
                'recipient' => $to,
            ]);

            return [
                'success' => false,
                'message' => 'Unable to connect to the Email API.',
                'error' => $e->getMessage(),
            ];
        }
    }


    public function sendTemplate(
        string $to,
        string $subject,
        string $template,
        array $data = [],
        ?string $toName = null
    ): array {
        if (!View::exists($template)) {
            throw new RuntimeException(
                "Email Blade template not found: {$template}"
            );
        }

        $html = View::make($template, $data)->render();

        return $this->send(
            $to,
            $subject,
            $html,
            $toName
        );
    }
}
