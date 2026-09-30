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

    public function journeys()
    {
        $journeys = Workflow::where('channel', 'whatsapp')
            ->where('status', 'published')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'description',
                'status',
                'version',
                'published_at',
            ]);

        return response()->json($journeys);
    }


    public function handle(
        Request $request,
        WorkflowEngine $engine
    ) {

        $payload = $request->all();

        $isProviderWebhook = isset(
            $payload['eventContent']['message']
        );

        $isMetaWebhook = isset(
            $payload['entry']
        );


        $workflowId =
            $request->input('workflow_id')
            ??
            $request->input('workflowId');


        $phoneNumberId = data_get(
            $payload,
            'entry.0.changes.0.value.metadata.phone_number_id'
        );


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
                'entry.0.changes.0.value.metadata.display_phone_number'
            );


        if ($whatsappTo) {
            $whatsappTo = preg_replace(
                '/\D+/',
                '',
                (string) $whatsappTo
            );
        }


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
                'entry.0.changes.0.value.messages.0.from'
            );


        if (!$from) {

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


        $text =
            $request->input('text.body')
            ??
            $request->input('text')
            ??
            data_get(
                $payload,
                'eventContent.message.text.body'
            )
            ??
            data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.text.body'
            )
            ??
            '';

        $text = is_string($text)
            ? trim($text)
            : '';

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
                'entry.0.changes.0.value.messages.0.type'
            )
            ??
            'text';


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


        $normalizedText = strtolower(
            trim((string) $text)
        );

        $isStartCommand =
            $normalizedText === 'hi';


        if (empty($workflowId)) {


            if (!empty($phoneNumberId)) {

                $workflowId =
                    $this->resolveWorkflowFromPhoneNumber(
                        $phoneNumberId
                    );
            }


            if (
                empty($workflowId)
                &&
                !empty($whatsappTo)
            ) {
                $workflowId =
                    $this->resolveWorkflowFromWhatsAppNumber(
                        $whatsappTo
                    );
            }
        }


        if (empty($workflowId)) {

            return response()->json([
                'success' => false,
                'error' => true,
                'error_code' => 'WORKFLOW_NOT_CONFIGURED',
                'message' =>
                    'No WhatsApp workflow configured for this number.',
                'phone_number_id' => $phoneNumberId,
                'whatsapp_to' => $whatsappTo,
            ], 422);
        }

        $workflow = Workflow::where(
                'channel',
                'whatsapp'
            )
            ->where(
                'status',
                'published'
            )
            ->where(
                'id',
                $workflowId
            )
            ->first();

        if (!$workflow) {
            return response()->json([
                'success' => false,
                'error' => true,
                'error_code' => 'WORKFLOW_NOT_FOUND',
                'message' =>
                    'Published WhatsApp workflow not found.',
                'workflow_id' => $workflowId,
            ], 404);
        }

        $session = BotSession::where(
                'channel',
                'whatsapp'
            )
            ->where(
                'user_identifier',
                $from
            )
            ->where(
                'workflow_id',
                $workflow->id
            )
            ->first();


        if (!$session) {
            if (!$isStartCommand) {

                return response()->json([
                    'success' => false,
                    'received' => true,
                    'started' => false,
                    'error' => true,
                    'error_code' => 'JOURNEY_NOT_STARTED',
                    'message' =>
                        'Please type "Hi" to start the journey.',
                    'workflow' => [
                        'id' => $workflow->id,
                        'name' => $workflow->name,
                    ],
                    'user_identifier' => $from,
                    'received_input' => $text,
                ], 422);
            }

            /**
             * Create session.
             */
            $session = new BotSession();

            $session->channel = 'whatsapp';
            $session->user_identifier = $from;
            $session->workflow_id = $workflow->id;
            $session->status = 'active';
            $session->current_node_id = null;
            $session->variables = [];
            $session->last_message_at = now();

            $session->save();

        }

        if (
            $session->status === 'completed'
            &&
            !$isStartCommand
        ) {

            return response()->json([
                'success' => false,
                'received' => true,
                'started' => false,
                'error' => true,
                'error_code' => 'JOURNEY_COMPLETED',
                'message' =>
                    'Journey is completed. Please type "Hi" to start again.',
                'workflow' => [
                    'id' => $workflow->id,
                    'name' => $workflow->name,
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
            ], 422);
        }


        if (
            !$isStartCommand
            &&
            $session->status === 'active'
            &&
            empty($session->current_node_id)
        ) {

            return response()->json([
                'success' => false,
                'received' => true,
                'started' => false,
                'error' => true,
                'error_code' => 'JOURNEY_NOT_STARTED',
                'message' =>
                    'Journey has not started. Please type "Hi" to start the journey.',
                'workflow' => [
                    'id' => $workflow->id,
                    'name' => $workflow->name,
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
                'received_input' => $text,
            ], 422);
        }

        /**
         * =====================================================
         * UPDATE SESSION LAST MESSAGE
         * =====================================================
         */
        $session->last_message_at = now();
        $session->save();

        /**
         * =====================================================
         * SAVE INBOUND BOT MESSAGE
         * =====================================================
         */
        $botMessage = new BotMessage();

        $botMessage->bot_session_id =
            $session->id;

        $botMessage->direction = 'inbound';

        $botMessage->message_type =
            $messageType
            ?:
            ($sourceHandle
                ? 'interactive'
                : 'text');

        $botMessage->text =
            $text
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




$input = [];

if (!empty($sourceHandle)) {

    $input['source_handle'] = (string) $sourceHandle;

    $input['title'] = (string) (
        $interactiveTitle ?? ''
    );

} else {

    $input['text'] = (string) ($text ?? '');
}

        /**
         * Button/list title.
         */
        if (!empty($interactiveTitle)) {
            $input['title'] =
                $interactiveTitle;
        }

        /**
         * =====================================================
         * REFRESH SESSION
         * =====================================================
         */
        $session->refresh();

        if ($isStartCommand) {

            $session->current_node_id = null;
            $session->status = 'active';
            $session->variables = [];
            $session->last_message_at = now();

            $session->save();

            $engine->start(
                $workflow,
                $from,
                $input
            );
        }

        else {

            $session->refresh();

            if (empty($session->current_node_id)) {

                return response()->json([
                    'success' => false,
                    'received' => true,
                    'started' => false,
                    'error' => true,
                    'error_code' =>
                        'CURRENT_NODE_NOT_FOUND',
                    'message' =>
                        'Journey cannot continue because the current node is missing. Please type "Hi" to start the journey.',
                    'workflow' => [
                        'id' => $workflow->id,
                        'name' => $workflow->name,
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
                    'received_input' => $text,
                ], 422);
            }

            /**
             * Continue from current node.
             */
            $engine->execute(
                $workflow,
                $session,
                (string) $session->current_node_id,
                $input
            );
        }

        /**
         * =====================================================
         * REFRESH SESSION AFTER ENGINE
         * =====================================================
         */
        $session->refresh();

        /**
         * =====================================================
         * GET RECENT OUTBOUND MESSAGES
         * =====================================================
         */
        $messages = BotMessage::where(
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


        return response()->json([
            'success' => true,

            'source' => $isProviderWebhook
                ? 'gtech_waba'
                : (
                    $isMetaWebhook
                        ? 'meta'
                        : 'simulator'
                ),

            'workflow' => [
                'id' => $workflow->id,
                'name' => $workflow->name,
            ],

            'whatsapp_to' => $whatsappTo,

            'phone_number_id' =>
                $phoneNumberId,

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


    private function resolveWorkflowFromWhatsAppNumber(
        ?string $number
    ): ?int {
        if (empty($number)) {
            return null;
        }

        /**
         * Normalize number.
         */
        $number = preg_replace(
            '/\D+/',
            '',
            (string) $number
        );

        if (empty($number)) {
            return null;
        }

        /**
         * Read config mapping.
         */
        $map = config(
            'services.whatsapp.number_workflow_map',
            []
        );

        if (!is_array($map)) {
            return null;
        }

        /**
         * Compare normalized numbers.
         */
        foreach ($map as $mappedNumber => $workflowId) {

            $mappedNumber = preg_replace(
                '/\D+/',
                '',
                (string) $mappedNumber
            );

            if ($mappedNumber === $number) {
                return (int) $workflowId;
            }
        }

        return null;
    }

    /**
     * =========================================================
     * RESOLVE WORKFLOW FROM META PHONE NUMBER ID
     * =========================================================
     */
    private function resolveWorkflowFromPhoneNumber(
        ?string $phoneNumberId
    ): ?int {
        if (empty($phoneNumberId)) {
            return null;
        }

        $map = config(
            'services.whatsapp.phone_workflow_map',
            []
        );

        if (!is_array($map)) {
            return null;
        }

        $workflowId =
            $map[(string) $phoneNumberId]
            ?? null;

        return $workflowId
            ? (int) $workflowId
            : null;
    }

    /**
     * =========================================================
     * RESET WHATSAPP JOURNEY
     * =========================================================
     */
    public function reset(Request $request)
    {
        /**
         * =====================================================
         * MOBILE
         * =====================================================
         */
        $from =
            $request->input('from')
            ??
            $request->input('mobile')
            ??
            $request->input('phone');

        /**
         * =====================================================
         * WORKFLOW ID
         * =====================================================
         */
        $workflowId =
            $request->input('workflow_id')
            ??
            $request->input('workflowId');

        /**
         * =====================================================
         * MOBILE REQUIRED
         * =====================================================
         */
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
         * =====================================================
         * NORMALIZE MOBILE
         * =====================================================
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

        /**
         * =====================================================
         * FIND SESSIONS
         * =====================================================
         */
        $query = BotSession::where(
                'channel',
                'whatsapp'
            )
            ->where(
                'user_identifier',
                $from
            );

        /**
         * Optional workflow filter.
         */
        if (!empty($workflowId)) {

            $query->where(
                'workflow_id',
                $workflowId
            );
        }

        $sessions = $query->get();


        foreach ($sessions as $session) {

            $session->current_node_id = null;
            $session->status = 'active';
            $session->variables = [];
            $session->last_message_at = null;

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
            'mobile' => $from,
            'workflow_id' => $workflowId,
            'sessions_reset' =>
                $sessions->count(),
        ]);
    }
}
