<?php

namespace App\Http\Controllers;

use App\Models\Workflow;
use App\Models\BotSession;
use App\Models\BotMessage;
use App\Models\WorkflowExecution;
use App\Services\WorkflowEngine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WhatsAppWebhookController extends Controller
{
    /**
     * ==========================================================================
     * JOURNEYS
     * ==========================================================================
     */
    public function journeys()
    {
        $journeys = Workflow::query()
            ->where('channel', 'whatsapp')
            ->where('status', 'published')
            ->with([
                'nodes' => function ($query) {
                    $query->where('node_type', 'start');
                },
            ])
            ->orderBy('name')
            ->get();

        $journeys->transform(function ($workflow) {

            $startNode = $workflow->nodes->first();

            $config = $startNode?->configuration ?? [];

            if (is_string($config)) {
                $decoded = json_decode($config, true);

                if (json_last_error() === JSON_ERROR_NONE) {
                    $config = $decoded;
                }
            }

            if (!is_array($config)) {
                $config = [];
            }

            $trigger = $this->getTriggerFromConfig($config);

            return [
                'id' => $workflow->id,
                'name' => $workflow->name,
                'description' => $workflow->description,
                'status' => $workflow->status,
                'version' => $workflow->version,
                'published_at' => $workflow->published_at,
                'trigger' => $trigger,
            ];
        });

        return response()->json($journeys);
    }

    /**
     * ==========================================================================
     * WHATSAPP WEBHOOK
     * ==========================================================================
     */
    public function handle(
        Request $request,
        WorkflowEngine $engine
    ) {
           Log::info('🔥 WEBHOOK HANDLE ENTERED');

                $payload = $request->all();

                Log::info('WHATSAPP WEBHOOK RECEIVED', [
                    'payload' => $payload,
                ]);

        /**
         * ----------------------------------------------------------------------
         * DELIVERY EVENTS
         * ----------------------------------------------------------------------
         */
        $eventType = strtolower(
            trim(
                (string) data_get(
                    $payload,
                    'events.eventType'
                )
            )
        );

        if ($eventType === 'delivery events') {
            Log::info('WHATSAPP DELIVERY EVENT IGNORED', [
                'status' => data_get(
                    $payload,
                    'events.status'
                ),
                'payload' => $payload,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Delivery event received.',
            ], 200);
        }

        /**
         * ----------------------------------------------------------------------
         * WEBHOOK SOURCE
         * ----------------------------------------------------------------------
         */
        $isProviderWebhook = isset(
            $payload['eventContent']['message']
        );

        $isMetaWebhook = isset(
            $payload['entry']
        );

        /**
         * ----------------------------------------------------------------------
         * WORKFLOW ID
         * ----------------------------------------------------------------------
         */
        $requestedWorkflowId =
            $request->input('workflow_id')
            ??
            $request->input('workflowId');

        /**
         * ----------------------------------------------------------------------
         * PHONE NUMBER ID
         * ----------------------------------------------------------------------
         */
        $phoneNumberId = data_get(
            $payload,
            'entry.0.changes.0.value.metadata.phone_number_id'
        );

        /**
         * ----------------------------------------------------------------------
         * WHATSAPP TO / BUSINESS NUMBER
         * ----------------------------------------------------------------------
         */
        $whatsappTo =
            $request->input('to')
            ??
            data_get(
                $payload,
                'eventContent.message.to'
            )
            ??
            data_get(
                $payload,
                'recipient.to'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.metadata.display_phone_number'
            );

        if ($whatsappTo) {
            $whatsappTo = preg_replace(
                '/\D+/',
                '',
                (string) $whatsappTo
            );
        }

        /**
         * ----------------------------------------------------------------------
         * FROM / CUSTOMER MOBILE
         * ----------------------------------------------------------------------
         */
        $from =
            $request->input('from')
            ??
            $request->input('mobile')
            ??
            $request->input('phone')
            ??
            data_get(
                $payload,
                'eventContent.message.from'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.sender'
            )
            ??
            data_get(
                $payload,
                'sender.from'
            )
            ??
            data_get(
                $payload,
                'sender.mobile'
            )
            ??
            data_get(
                $payload,
                'sender.wa_id'
            )
            ??
            data_get(
                $payload,
                'contacts.0.wa_id'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.from'
            );

        if (!$from) {
            Log::warning(
                'WHATSAPP MOBILE NOT FOUND',
                [
                    'payload' => $payload,
                ]
            );

            return response()->json([
                'success' => false,
                'error' => true,
                'error_code' => 'MOBILE_NOT_FOUND',
                'message' => 'WhatsApp mobile number not found.',
            ], 422);
        }

        $from = preg_replace(
            '/\D+/',
            '',
            (string) $from
        );

        if (!$from) {
            return response()->json([
                'success' => false,
                'error' => true,
                'error_code' => 'INVALID_MOBILE',
                'message' => 'Invalid WhatsApp mobile number.',
            ], 422);
        }

        /**
         * ----------------------------------------------------------------------
         * MESSAGE TYPE
         * ----------------------------------------------------------------------
         */
        $messageType =
            $request->input('type')
            ??
            data_get(
                $payload,
                'eventContent.message.messageType'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.type'
            )
            ??
            $request->input('contentType')
            ??
            data_get(
                $payload,
                'contentType'
            )
            ??
            data_get(
                $payload,
                'message.type'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.type'
            )
            ??
            'text';

        $messageType = strtolower(
            trim((string) $messageType)
        );

        /**
         * ----------------------------------------------------------------------
         * TEXT
         * ----------------------------------------------------------------------
         */
        $text =
            $request->input('text.body')
            ??
            $request->input('text')
            ??
            $request->input('body')
            ??
            $request->input('message')
            ??
            data_get(
                $payload,
                'eventContent.message.text.body'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.text'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.body'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.message'
            )
            ??
            data_get(
                $payload,
                'message.text.body'
            )
            ??
            data_get(
                $payload,
                'message.text'
            )
            ??
            data_get(
                $payload,
                'message.body'
            )
            ??
            data_get(
                $payload,
                'content.text'
            )
            ??
            data_get(
                $payload,
                'content.body'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.text.body'
            )
            ??
            '';

        if (is_array($text)) {
            $text =
                $text['body']
                ??
                $text['text']
                ??
                $text['message']
                ??
                '';
        }

        $text = trim((string) $text);

        /**
         * ----------------------------------------------------------------------
         * MEDIA INFORMATION
         * ----------------------------------------------------------------------
         *
         * Supports:
         * image
         * document
         * pdf
         * audio
         * video
         */
        $mediaId =
            $request->input('media_id')
            ??
            $request->input('mediaId')
            ??
            $request->input('media.id')
            ??
            data_get(
                $payload,
                'eventContent.message.media.id'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.image.id'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.document.id'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.audio.id'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.video.id'
            )
            ??
            data_get(
                $payload,
                'message.media.id'
            )
            ??
            data_get(
                $payload,
                'message.image.id'
            )
            ??
            data_get(
                $payload,
                'message.document.id'
            )
            ??
            data_get(
                $payload,
                'message.audio.id'
            )
            ??
            data_get(
                $payload,
                'message.video.id'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.image.id'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.document.id'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.audio.id'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.video.id'
            );

        /**
         * ----------------------------------------------------------------------
         * MEDIA URL
         * ----------------------------------------------------------------------
         */
        $mediaUrl =
            $request->input('media_url')
            ??
            $request->input('mediaUrl')
            ??
            $request->input('url')
            ??
            $request->input('file_url')
            ??
            $request->input('fileUrl')
            ??
            data_get(
                $payload,
                'eventContent.message.media.url'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.image.url'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.document.url'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.audio.url'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.video.url'
            )
            ??
            data_get(
                $payload,
                'message.media.url'
            )
            ??
            data_get(
                $payload,
                'message.image.url'
            )
            ??
            data_get(
                $payload,
                'message.document.url'
            )
            ??
            data_get(
                $payload,
                'message.audio.url'
            )
            ??
            data_get(
                $payload,
                'message.video.url'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.image.url'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.document.url'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.audio.url'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.video.url'
            )
            ??
            '';

        /**
         * ----------------------------------------------------------------------
         * MIME TYPE
         * ----------------------------------------------------------------------
         */
        $mimeType =
            $request->input('mime_type')
            ??
            $request->input('mimeType')
            ??
            $request->input('mimetype')
            ??
            data_get(
                $payload,
                'eventContent.message.mime_type'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.mimetype'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.image.mime_type'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.document.mime_type'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.audio.mime_type'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.video.mime_type'
            )
            ??
            data_get(
                $payload,
                'message.mime_type'
            )
            ??
            data_get(
                $payload,
                'message.mimetype'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.image.mime_type'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.document.mime_type'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.audio.mime_type'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.video.mime_type'
            );

        /**
         * ----------------------------------------------------------------------
         * MEDIA FILENAME
         * ----------------------------------------------------------------------
         */
        $mediaFilename =
            $request->input('filename')
            ??
            $request->input('file_name')
            ??
            $request->input('fileName')
            ??
            data_get(
                $payload,
                'eventContent.message.document.filename'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.filename'
            )
            ??
            data_get(
                $payload,
                'message.document.filename'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.document.filename'
            )
            ??
            '';

        /**
         * ----------------------------------------------------------------------
         * MEDIA CAPTION
         * ----------------------------------------------------------------------
         */
        $mediaCaption =
            $request->input('caption')
            ??
            data_get(
                $payload,
                'eventContent.message.image.caption'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.document.caption'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.video.caption'
            )
            ??
            data_get(
                $payload,
                'message.image.caption'
            )
            ??
            data_get(
                $payload,
                'message.document.caption'
            )
            ??
            data_get(
                $payload,
                'message.video.caption'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.image.caption'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.document.caption'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.video.caption'
            )
            ??
            '';

        $mediaId = $mediaId
            ? (string) $mediaId
            : null;

        $mediaUrl = $mediaUrl
            ? (string) $mediaUrl
            : null;

        $mimeType = $mimeType
            ? (string) $mimeType
            : null;

        $mediaFilename = $mediaFilename
            ? (string) $mediaFilename
            : null;

        $mediaCaption = $mediaCaption
            ? trim((string) $mediaCaption)
            : null;

        /**
         * ----------------------------------------------------------------------
         * NORMALIZE MEDIA TYPE
         * ----------------------------------------------------------------------
         */
        if (
            $messageType === 'document'
            &&
            $mimeType === 'application/pdf'
        ) {
            $messageType = 'pdf';
        }

        /**
         * ----------------------------------------------------------------------
         * INTERACTIVE SOURCE HANDLE
         * ----------------------------------------------------------------------
         */
        $sourceHandle =
            $request->input(
                'interactive.source_handle'
            )
            ??
            $request->input(
                'interactive.sourceHandle'
            )
            ??
            $request->input(
                'interactive.button_reply.id'
            )
            ??
            $request->input(
                'interactive.list_reply.id'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.interactive.button_reply.id'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.interactive.list_reply.id'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.interactive.button_reply.id'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.interactive.list_reply.id'
            );

        /**
         * ----------------------------------------------------------------------
         * INTERACTIVE TITLE
         * ----------------------------------------------------------------------
         */
        $interactiveTitle =
            $request->input(
                'interactive.title'
            )
            ??
            $request->input(
                'interactive.button_reply.title'
            )
            ??
            $request->input(
                'interactive.button_reply.text'
            )
            ??
            $request->input(
                'interactive.list_reply.title'
            )
            ??
            $request->input(
                'interactive.list_reply.text'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.interactive.button_reply.title'
            )
            ??
            data_get(
                $payload,
                'eventContent.message.interactive.list_reply.title'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.interactive.button_reply.title'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.interactive.list_reply.title'
            );

        /**
         * ----------------------------------------------------------------------
         * EXTERNAL MESSAGE ID
         * ----------------------------------------------------------------------
         */
        $externalMessageId =
            data_get(
                $payload,
                'eventContent.message.id'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.id'
            )
            ??
            $request->input('message_id')
            ??
            $request->input('external_message_id');

        /**
         * ----------------------------------------------------------------------
         * SOURCE
         * ----------------------------------------------------------------------
         */
        $source = $isProviderWebhook
            ? 'gtech_waba'
            : (
                $isMetaWebhook
                    ? 'meta'
                    : 'simulator'
            );

        $normalizedText = strtolower(
            trim((string) $text)
        );

        /**
         * ----------------------------------------------------------------------
         * NORMALIZED INPUT FOR WORKFLOW ENGINE
         * ----------------------------------------------------------------------
         */
        $input = [
            'text' => $text,

            'source_handle' => !empty($sourceHandle)
                ? (string) $sourceHandle
                : null,

            'title' => !empty($interactiveTitle)
                ? (string) $interactiveTitle
                : null,

            'message_type' => $messageType,

            /**
             * Media information
             */
            'media_id' => $mediaId,

            'media_url' => $mediaUrl,

            'mime_type' => $mimeType,

            'filename' => $mediaFilename,

            'caption' => $mediaCaption,

            'has_media' => !empty($mediaId)
                || !empty($mediaUrl),

            /**
             * Full original payload
             */
            'payload' => $payload,

            'external_message_id' => $externalMessageId,

            'phone_number_id' => $phoneNumberId,

            'whatsapp_to' => $whatsappTo,

            'source' => $source,

            /**
             * Optional workflow selected from simulator
             */
            'workflow_id' => $requestedWorkflowId,
        ];

        Log::info('WHATSAPP NORMALIZED INPUT', [
            'from' => $from,
            'type' => $messageType,
            'text' => $text,
            'media_id' => $mediaId,
            'media_url' => $mediaUrl,
            'mime_type' => $mimeType,
            'filename' => $mediaFilename,
            'caption' => $mediaCaption,
            'source' => $source,
        ]);

        /**
         * ----------------------------------------------------------------------
         * WORKFLOW ENGINE
         * ----------------------------------------------------------------------
         */
        $session = $engine->handleIncoming(
            $from,
            $text,
            $input
        );

        if (!$session) {

            return response()->json([
                'success' => false,
                'received' => true,
                'started' => false,
                'error' => true,
                'error_code' => 'WORKFLOW_NOT_FOUND',
                'message' =>
                    'No active journey found and no matching trigger was found.',
                'received_text' => $text,
                'normalized_text' => $normalizedText,
                'message_type' => $messageType,
                'media_id' => $mediaId,
                'media_url' => $mediaUrl,
                'phone_number_id' => $phoneNumberId,
                'whatsapp_to' => $whatsappTo,
            ], 422);
        }

        /**
         * ----------------------------------------------------------------------
         * REFRESH SESSION
         * ----------------------------------------------------------------------
         */
        $session->refresh();

        /**
         * ----------------------------------------------------------------------
         * WORKFLOW
         * ----------------------------------------------------------------------
         */
        $workflow = Workflow::query()
            ->where('id', $session->workflow_id)
            ->where('channel', 'whatsapp')
            ->first();

        /**
         * ----------------------------------------------------------------------
         * SAVE INBOUND BOT MESSAGE
         * ----------------------------------------------------------------------
         */
        $botMessage = new BotMessage();

        $botMessage->bot_session_id = $session->id;

        $botMessage->direction = 'inbound';

        $botMessage->message_type =
            $messageType
            ?:
            (
                $sourceHandle
                    ? 'interactive'
                    : 'text'
            );

        /**
         * For media message, save caption/text.
         * Original media data remains inside payload.
         */
        $botMessage->text =
            $text
            ?:
            $mediaCaption
            ?:
            $interactiveTitle
            ?:
            $sourceHandle
            ?:
            '';

        $botMessage->payload = $payload;

        if (!empty($externalMessageId)) {
            $botMessage->external_message_id =
                $externalMessageId;
        }

        $botMessage->save();

        /**
         * ----------------------------------------------------------------------
         * OUTBOUND MESSAGES
         * ----------------------------------------------------------------------
         */
        $messages = BotMessage::query()
            ->where(
                'bot_session_id',
                $session->id
            )
            ->where(
                'direction',
                'outbound'
            )
            ->latest('id')
            ->limit(20)
            ->get()
            ->reverse()
            ->values();

        /**
         * ----------------------------------------------------------------------
         * RESPONSE
         * ----------------------------------------------------------------------
         */
        return response()->json([
            'success' => true,

            'source' => $source,

            'workflow' => [
                'id' => $workflow?->id,
                'name' => $workflow?->name,
            ],

            'whatsapp_to' => $whatsappTo,

            'phone_number_id' => $phoneNumberId,

            'incoming' => [
                'type' => $messageType,
                'text' => $text,
                'media_id' => $mediaId,
                'media_url' => $mediaUrl,
                'mime_type' => $mimeType,
                'filename' => $mediaFilename,
                'caption' => $mediaCaption,
                'has_media' => !empty($mediaId)
                    || !empty($mediaUrl),
            ],

            'session' => [
                'id' => $session->id,

                'status' => $session->status,

                'current_node_id' =>
                    $session->current_node_id,

                'workflow_id' =>
                    $session->workflow_id,

                'user_identifier' =>
                    $session->user_identifier,
            ],

            'messages' => $messages,
        ]);
    }

    /**
     * ==========================================================================
     * GET TRIGGER
     * ==========================================================================
     */
    private function getTriggerFromConfig(
        array $config
    ): ?string {

        $possibleTriggers = [
            $config['triggerText'] ?? null,

            $config['trigger'] ?? null,

            $config['keyword'] ?? null,

            data_get(
                $config,
                'start.triggerText'
            ),

            data_get(
                $config,
                'start.trigger'
            ),

            data_get(
                $config,
                'start.keyword'
            ),

            data_get(
                $config,
                'settings.triggerText'
            ),

            data_get(
                $config,
                'settings.trigger'
            ),

            data_get(
                $config,
                'settings.keyword'
            ),
        ];

        foreach ($possibleTriggers as $value) {

            if (
                is_string($value)
                &&
                trim($value) !== ''
            ) {
                return trim($value);
            }
        }

        return null;
    }

    /**
     * ==========================================================================
     * RESET
     * ==========================================================================
     */
    public function reset(
        Request $request
    ) {

        $from =
            $request->input('from')
            ??
            $request->input('mobile')
            ??
            $request->input('phone');

        $workflowId =
            $request->input('workflow_id')
            ??
            $request->input('workflowId');

        if (!$from) {
            return response()->json([
                'success' => false,
                'error' => true,
                'error_code' => 'MOBILE_REQUIRED',
                'message' =>
                    'Mobile number is required.',
            ], 422);
        }

        /**
         * FIXED REGEX
         */
        $from = preg_replace(
            '/\D+/',
            '',
            (string) $from
        );

        if (!$from) {
            return response()->json([
                'success' => false,
                'error' => true,
                'error_code' => 'INVALID_MOBILE',
                'message' =>
                    'Invalid mobile number.',
            ], 422);
        }

        $query = BotSession::query()
            ->where(
                'channel',
                'whatsapp'
            )
            ->where(
                'user_identifier',
                $from
            );

        if (!empty($workflowId)) {
            $query->where(
                'workflow_id',
                $workflowId
            );
        }

        $sessions = $query->get();

        foreach ($sessions as $session) {

            $session->current_node_id = null;

            $session->status = 'completed';

            $session->variables = [];

            $session->last_message_at = now();

            $session->save();

            BotMessage::where(
                'bot_session_id',
                $session->id
            )->delete();

            WorkflowExecution::where(
                'bot_session_id',
                $session->id
            )->delete();
        }

        return response()->json([
            'success' => true,

            'message' =>
                'WhatsApp session reset successfully.',

            'mobile' =>
                $from,

            'workflow_id' =>
                $workflowId,

            'sessions_reset' =>
                $sessions->count(),
        ]);
    }
}
