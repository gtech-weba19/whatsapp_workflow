<?php

namespace App\Http\Controllers;

use App\Models\Workflow;
use App\Models\BotSession;
use App\Models\BotMessage;
use App\Models\WorkflowExecution;
use App\Services\WorkflowEngine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Models\WhatsAppAccount;
use App\Services\WhatsAppService;

use Illuminate\Contracts\Cache\LockTimeoutException;

class WhatsAppWebhookController extends Controller
{

public function journeys(Request $request)
{
    $user = $request->user();

    if (!$user) {
        return response()->json([
            'message' => 'Unauthenticated.',
        ], 401);
    }

    $journeys = Workflow::query()
        ->where('user_id', $user->id)
        ->where('channel', 'whatsapp')
        ->whereHas('bot', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
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

        return [
            'id' => $workflow->id,
            'bot_id' => $workflow->bot_id,
            'user_id' => $workflow->user_id,
            'name' => $workflow->name,
            'description' => $workflow->description,
            'status' => $workflow->status,
            'version' => $workflow->version,
            'published_at' => $workflow->published_at,
            'trigger' => $this->getTriggerFromConfig($config),
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

            $payload = $request->all();


                if (empty($payload)) {
                    $rawBody = $request->getContent();
                    $decodedPayload = json_decode($rawBody, true);

                    if (
                        json_last_error() === JSON_ERROR_NONE
                        && is_array($decodedPayload)
                    ) {
                        $payload = $decodedPayload;
                    }
                }


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

            Log::info('WHATSAPP DELIVERY EVENT FULL PAYLOAD', [
        'payload' => $payload,
    ]);

     if ($eventType === 'delivery events') {

    Log::info('WHATSAPP DELIVERY EVENT FULL PAYLOAD', [
        'payload' => $payload,
    ]);

    $engine->handleDeliveryWebhook($payload);

    return response()->json([
        'success' => true,
        'message' => 'Delivery event processed.',
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

            if (!empty($sourceHandle)) {

                $text = trim(
                    (string) $sourceHandle
                );

            } elseif (
                empty($text)
                &&
                !empty($interactiveTitle)
            ) {

                $text = trim(
                    (string) $interactiveTitle
                );
            }


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
        // $externalMessageId =
        //     data_get(
        //         $payload,
        //         'eventContent.message.id'
        //     )
        //     ??
        //     data_get(
        //         $payload,
        //         'entry.0.changes.0.value.messages.0.id'
        //     )
        //     ??
        //     $request->input('message_id')
        //     ??
        //     $request->input('external_message_id');



$externalMessageId =
    data_get($payload, 'eventContent.message.id')
    ?? data_get($payload, 'entry.0.changes.0.value.messages.0.id')
    ?? $request->input('message_id')
    ?? $request->input('external_message_id');



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


            /**
 * ----------------------------------------------------------------------
 * RESOLVE WHATSAPP ACCOUNT FROM WORKFLOW / BOT
 * ----------------------------------------------------------------------
 */


$whatsappAccountId = null;
$userId = null;

if ($source === 'simulator' && $requestedWorkflowId) {

    $workflowForAccount = Workflow::query()
        ->where('id', $requestedWorkflowId)
        ->where('channel', 'whatsapp')
        ->where('status', 'published')
        ->with('bot:id,user_id,whatsapp_account_id')
        ->first();

    if ($workflowForAccount) {
        $userId = (int) $workflowForAccount->user_id;

        $bot = $workflowForAccount->bot;

        // Workflow owner and bot owner must match.
        if ($bot && (int) $bot->user_id === $userId) {

            $whatsappAccountId =
                $workflowForAccount->whatsapp_account_id
                ?? $bot->whatsapp_account_id;

            if ($whatsappAccountId) {
                $account = WhatsAppAccount::query()
                    ->where('id', $whatsappAccountId)
                    ->where('user_id', $userId)
                    ->whereIn('status', ['active', 'connected'])
                    ->first();

                if (!$account) {
                    $whatsappAccountId = null;
                }
            }
        }
    }
}


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

          'whatsapp_account_id' => $whatsappAccountId,

            'source' => $source,


            'workflow_id' => $requestedWorkflowId,
        ];





// $lockKey = 'whatsapp_workflow_lock:'
//     . ($whatsappAccountId ?? 'provider')
//     . ':'
//     . $from;

// $lock = Cache::lock($lockKey, 60);

// try {
//     $lock->block(30);

// } catch (LockTimeoutException $e) {

//     Log::error('WHATSAPP REQUEST LOCK TIMEOUT', [
//         'mobile' => $from,
//         'account_id' => $whatsappAccountId,
//         'external_message_id' => $externalMessageId,
//     ]);

//     return response()->json([
//         'success' => false,
//         'received' => false,
//         'processing' => false,
//         'message' => 'Previous request is still processing.',
//     ], 503);
// }

// try {
//  if ($source !== 'simulator') {

//         if (empty($whatsappTo)) {


//             return response()->json([
//                 'success' => false,
//                 'error' => true,
//                 'error_code' => 'WHATSAPP_ACCOUNT_NUMBER_NOT_FOUND',
//                 'message' => 'Business WhatsApp number could not be identified.',
//             ], 422);
//         }

//       $whatsappTo = preg_replace('/\D+/', '', (string) $whatsappTo);

// if (empty($whatsappTo)) {
//     return response()->json([
//         'success' => false,
//         'error' => true,
//         'error_code' => 'WHATSAPP_NUMBER_MISSING',
//         'message' => 'WhatsApp number is missing.',
//     ], 422);
// }

// $account = WhatsAppAccount::query()
//     ->whereIn('status', ['active', 'connected'])
//     ->whereRaw(
//         "REGEXP_REPLACE(waba_id, '[^0-9]', '') = ?",
//         [$whatsappTo]
//     )
//     ->first();

// if (!$account) {
//     return response()->json([
//         'success' => false,
//         'error' => true,
//         'error_code' => 'WHATSAPP_ACCOUNT_NOT_FOUND',
//         'message' => 'No connected WhatsApp account found for this number.',
//     ], 404);
// }

// $engine->useWhatsAppAccount(
//     (int) $account->user_id,
//     (string) $account->waba_id
// );

// $input['whatsapp_account_id'] = (int) $account->id;

//         $engine->useWhatsAppAccount(
//             (int) $account->user_id,
//             $whatsappTo
//         );

//         $input['whatsapp_account_id'] = (int) $account->id;

//     }



// // Prevent duplicate invalid-input replies
// if (!empty($externalMessageId)) {
//     $dedupeKey = 'whatsapp_incoming_processed:'
//         . ($whatsappAccountId ?? 'provider')
//         . ':'
//         . $externalMessageId;

//     if (!Cache::add($dedupeKey, true, now()->addDay())) {
//         Log::warning('WHATSAPP DUPLICATE MESSAGE IGNORED', [
//             'external_message_id' => $externalMessageId,
//             'from' => $from,
//         ]);

//         return response()->json([
//             'success' => true,
//             'received' => true,
//             'duplicate' => true,
//         ], 200);
//     }
// }

// $session = $engine->handleIncoming($from, $text, $input);


//     if (!$session) {
//         return response()->json([
//             'success' => false,
//             'received' => true,
//             'started' => false,
//             'error' => true,
//             'error_code' => 'WORKFLOW_NOT_FOUND',
//             'message' =>
//                 'No active journey found and no matching trigger was found.',
//             'received_text' => $text,
//             'normalized_text' => $normalizedText,
//             'message_type' => $messageType,
//             'media_id' => $mediaId,
//             'media_url' => $mediaUrl,
//             'phone_number_id' => $phoneNumberId,
//             'whatsapp_to' => $whatsappTo,
//         ], 422);

//     }

//      /**
//          * ----------------------------------------------------------------------
//          * REFRESH SESSION
//          * ----------------------------------------------------------------------
//          */
//         $session->refresh();

//         /**
//          * ----------------------------------------------------------------------
//          * WORKFLOW
//          * ----------------------------------------------------------------------
//          */
//         $workflow = Workflow::query()
//             ->where('id', $session->workflow_id)
//             ->where('channel', 'whatsapp')
//             ->first();

//         /**
//          * ----------------------------------------------------------------------
//          * SAVE INBOUND BOT MESSAGE
//          * ----------------------------------------------------------------------
//          */
//         $botMessage = new BotMessage();

//         $botMessage->bot_session_id = $session->id;

//         $botMessage->direction = 'inbound';

//         $botMessage->message_type =
//             $messageType
//             ?:
//             (
//                 $sourceHandle
//                     ? 'interactive'
//                     : 'text'
//             );


//         $botMessage->text =
//             $text
//             ?:
//             $mediaCaption
//             ?:
//             $interactiveTitle
//             ?:
//             $sourceHandle
//             ?:
//             '';

//         $botMessage->payload = $payload;

//         if (!empty($externalMessageId)) {
//             $botMessage->external_message_id =
//                 $externalMessageId;
//         }

//         $botMessage->save();

//         /**
//          * ----------------------------------------------------------------------
//          * OUTBOUND MESSAGES
//          * ----------------------------------------------------------------------
//          */
//         $messages = BotMessage::query()
//             ->where(
//                 'bot_session_id',
//                 $session->id
//             )
//             ->where(
//                 'direction',
//                 'outbound'
//             )
//             ->latest('id')
//             ->limit(20)
//             ->get()
//             ->reverse()
//             ->values();

//         /**
//          * ----------------------------------------------------------------------
//          * RESPONSE
//          * ----------------------------------------------------------------------
//          */
//         return response()->json([
//             'success' => true,

//             'source' => $source,

//             'workflow' => [
//                 'id' => $workflow?->id,
//                 'name' => $workflow?->name,
//             ],

//             'whatsapp_to' => $whatsappTo,

//             'phone_number_id' => $phoneNumberId,

//             'incoming' => [
//                 'type' => $messageType,
//                 'text' => $text,
//                 'media_id' => $mediaId,
//                 'media_url' => $mediaUrl,
//                 'mime_type' => $mimeType,
//                 'filename' => $mediaFilename,
//                 'caption' => $mediaCaption,
//                 'has_media' => !empty($mediaId)
//                     || !empty($mediaUrl),
//             ],

//             'session' => [
//                 'id' => $session->id,

//                 'status' => $session->status,

//                 'current_node_id' =>
//                     $session->current_node_id,

//                 'workflow_id' =>
//                     $session->workflow_id,

//                 'user_identifier' =>
//                     $session->user_identifier,
//             ],

//             'messages' => $messages,
//         ]);




//   } finally {

//     $lock->release();
// }


/*
|--------------------------------------------------------------------------
| WHATSAPP ACCOUNT IDENTIFICATION
|--------------------------------------------------------------------------
*/

// if ($source !== 'simulator') {

//     if (empty($whatsappTo)) {

//         return response()->json([
//             'success' => false,
//             'error' => true,
//             'error_code' => 'WHATSAPP_ACCOUNT_NUMBER_NOT_FOUND',
//             'message' => 'Business WhatsApp number could not be identified.',
//         ], 422);
//     }

//     $whatsappTo = preg_replace('/\D+/', '', (string) $whatsappTo);

//     if (empty($whatsappTo)) {

//         return response()->json([
//             'success' => false,
//             'error' => true,
//             'error_code' => 'WHATSAPP_NUMBER_MISSING',
//             'message' => 'WhatsApp number is missing.',
//         ], 422);
//     }

//     $account = WhatsAppAccount::query()
//         ->whereIn('status', ['active', 'connected'])
//         ->whereRaw(
//             "REGEXP_REPLACE(waba_id, '[^0-9]', '') = ?",
//             [$whatsappTo]
//         )
//         ->first();

//     if (!$account) {

//         return response()->json([
//             'success' => false,
//             'error' => true,
//             'error_code' => 'WHATSAPP_ACCOUNT_NOT_FOUND',
//             'message' => 'No connected WhatsApp account found for this number.',
//         ], 404);
//     }

//     $engine->useWhatsAppAccount(
//         (int) $account->user_id,
//         (string) $account->waba_id
//     );

//     $input['whatsapp_account_id'] = (int) $account->id;

//     $whatsappAccountId = (int) $account->id;
// }


/*
|--------------------------------------------------------------------------
| WHATSAPP ACCOUNT IDENTIFICATION
|--------------------------------------------------------------------------
*/

if ($source !== 'simulator') {

    if (empty($whatsappTo)) {
        return response()->json([
            'success' => false,
            'error' => true,
            'error_code' => 'WHATSAPP_ACCOUNT_NUMBER_NOT_FOUND',
            'message' => 'Business WhatsApp number could not be identified.',
        ], 422);
    }

    $whatsappTo = preg_replace('/\D+/', '', (string) $whatsappTo);

    if (empty($whatsappTo)) {
        return response()->json([
            'success' => false,
            'error' => true,
            'error_code' => 'WHATSAPP_NUMBER_MISSING',
            'message' => 'WhatsApp number is missing.',
        ], 422);
    }

    $account = WhatsAppAccount::query()
        ->whereIn('status', ['active', 'connected'])
        ->whereRaw(
            "REGEXP_REPLACE(waba_id, '[^0-9]', '') = ?",
            [$whatsappTo]
        )
        ->first();

    if (!$account) {
        return response()->json([
            'success' => false,
            'error' => true,
            'error_code' => 'WHATSAPP_ACCOUNT_NOT_FOUND',
            'message' => 'No connected WhatsApp account found for this number.',
        ], 404);
    }

    $whatsappAccountId = (int) $account->id;
    $userId = (int) $account->user_id;

    if (!$userId) {
        Log::error('WHATSAPP ACCOUNT USER ID MISSING', [
            'account_id' => $account->id,
            'account_user_id' => $account->user_id,
        ]);

        return response()->json([
            'success' => false,
            'error' => true,
            'error_code' => 'WHATSAPP_ACCOUNT_USER_NOT_FOUND',
            'message' => 'WhatsApp account owner not found.',
        ], 422);
    }

    $engine->useWhatsAppAccount(
        $userId,
        (string) $account->waba_id
    );

    $input['whatsapp_account_id'] = $whatsappAccountId;
    $input['user_id'] = $userId;
}

/*
|--------------------------------------------------------------------------
| PREVENT DUPLICATE INCOMING MESSAGES
|--------------------------------------------------------------------------
*/

if (!empty($externalMessageId)) {

    $dedupeKey = 'whatsapp_incoming_processed:'
        . ($whatsappAccountId ?? 'provider')
        . ':'
        . $externalMessageId;

    if (!Cache::add($dedupeKey, true, now()->addDay())) {

        Log::warning('WHATSAPP DUPLICATE MESSAGE IGNORED', [
            'external_message_id' => $externalMessageId,
            'from' => $from,
            'account_id' => $whatsappAccountId ?? null,
        ]);

        return response()->json([
            'success' => true,
            'received' => true,
            'duplicate' => true,
        ], 200);
    }
}


/*
|--------------------------------------------------------------------------
| HANDLE INCOMING MESSAGE
|--------------------------------------------------------------------------
*/
// Incoming message ID ko WorkflowEngine tak pass karein
$input['reply_to_message_id'] = $externalMessageId;

$session = $engine->handleIncoming($from, $text, $input);

if (!$session) {

    Log::warning('INBOUND MESSAGE NOT SAVED - SESSION NOT FOUND', [
        'from' => $from,
        'message' => $text,
        'whatsapp_account_id' => $whatsappAccountId,
        'user_id' => $userId,
        'input_user_id' => $input['user_id'] ?? null,
        'input_whatsapp_account_id' => $input['whatsapp_account_id'] ?? null,
        'normalized_text' => $normalizedText,
    ]);

    try {

        $whatsapp = app(WhatsAppService::class)
            ->useAccountById(
                (int) $whatsappAccountId,
                (int) $userId
            );

        $result = $whatsapp->sendText(
            $from,
            'No active journey found'
        );

        if (empty($result['success'])) {
            Log::error('SESSION NOT FOUND REPLY FAILED', [
                'from' => $from,
                'whatsapp_account_id' => $whatsappAccountId,
                'user_id' => $userId,
                'result' => $result,
            ]);
        }

    } catch (\Throwable $e) {

        Log::error('SESSION NOT FOUND REPLY EXCEPTION', [
            'from' => $from,
            'whatsapp_account_id' => $whatsappAccountId,
            'user_id' => $userId,
            'error' => $e->getMessage(),
        ]);
    }

    return response()->json([
        'success' => false,
        'received' => true,
        'started' => false,
        'error' => true,
        'error_code' => 'WORKFLOW_NOT_FOUND',
        'message' => 'No active journey found and no matching trigger was found.',
        'received_text' => $text,
        'normalized_text' => $normalizedText,
        'message_type' => $messageType,
        'media_id' => $mediaId,
        'media_url' => $mediaUrl,
        'phone_number_id' => $phoneNumberId,
        'whatsapp_to' => $whatsappTo,
    ], 422);
}


/*
|--------------------------------------------------------------------------
| REFRESH SESSION
|--------------------------------------------------------------------------
*/

$session->refresh();


/*
|--------------------------------------------------------------------------
| GET WORKFLOW
|--------------------------------------------------------------------------
*/

$workflow = Workflow::query()
    ->where('id', $session->workflow_id)
    ->where('channel', 'whatsapp')
    ->first();

/*
|--------------------------------------------------------------------------
| SAVE INBOUND BOT MESSAGE
|--------------------------------------------------------------------------
*/

$botMessage = new BotMessage();

$botMessage->bot_session_id = $session->id;
$botMessage->direction = 'inbound';

// Sirf MID save hoga, WAMID nahi
$botMessage->external_message_id = $externalMessageId ?: null;

$botMessage->message_type = $messageType
    ?: ($sourceHandle ? 'interactive' : 'text');

$botMessage->text = $text
    ?: $mediaCaption
    ?: $interactiveTitle
    ?: $sourceHandle
    ?: '';

$botMessage->payload = $payload;

$botMessage->user_id = $session->user_id;
$botMessage->bot_id = $session->bot_id;
$botMessage->whatsapp_account_id = $session->whatsapp_account_id;

$botMessage->save();


/*
|--------------------------------------------------------------------------
| GET OUTBOUND MESSAGES
|--------------------------------------------------------------------------
*/

$messages = BotMessage::query()
    ->where('bot_session_id', $session->id)
    ->where('direction', 'outbound')
    ->latest('id')
    ->limit(20)
    ->get()
    ->reverse()
    ->values();


/*
|--------------------------------------------------------------------------
| RESPONSE
|--------------------------------------------------------------------------
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
        'current_node_id' => $session->current_node_id,
        'workflow_id' => $session->workflow_id,
        'user_identifier' => $session->user_identifier,
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
