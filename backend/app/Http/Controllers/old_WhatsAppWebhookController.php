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

            /**
             * Configuration JSON support
             */
            if (is_string($config)) {

                $decoded = json_decode(
                    $config,
                    true
                );

                if (json_last_error() === JSON_ERROR_NONE) {
                    $config = $decoded;
                }
            }

            if (!is_array($config)) {
                $config = [];
            }

            /**
             * Dynamic trigger
             */
            $trigger = $this->getTriggerFromConfig(
                $config
            );

            Log::info(
                'WHATSAPP JOURNEY TRIGGER',
                [
                    'workflow_id' => $workflow->id,
                    'workflow_name' => $workflow->name,
                    'start_node_id' => $startNode?->id,
                    'configuration' => $config,
                    'triggerText' => $config['triggerText'] ?? null,
                    'trigger' => $trigger,
                ]
            );

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
        $payload = $request->all();

        /**
         * ----------------------------------------------------------------------
         * LOG COMPLETE PAYLOAD
         * ----------------------------------------------------------------------
         */
        Log::info(
            'WHATSAPP WEBHOOK PAYLOAD',
            [
                'payload' => $payload,
            ]
        );

        /**
         * ----------------------------------------------------------------------
         * DELIVERY EVENTS
         * ----------------------------------------------------------------------
         *
         * sent / delivered / read callbacks ko incoming message mat samjho.
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

            Log::info(
                'WHATSAPP DELIVERY EVENT IGNORED',
                [
                    'status' => data_get(
                        $payload,
                        'notificationAttributes.status'
                    ),
                    'reason' => data_get(
                        $payload,
                        'notificationAttributes.reason'
                    ),
                    'code' => data_get(
                        $payload,
                        'notificationAttributes.code'
                    ),
                    'mid' => data_get(
                        $payload,
                        'events.mid'
                    ),
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Delivery event received.',
            ], 200);
        }

        /**
         * ----------------------------------------------------------------------
         * PROVIDER / META DETECTION
         * ----------------------------------------------------------------------
         */
        $isProviderWebhook = isset(
            $payload['eventContent']['message']
        );

        $isMetaWebhook = isset(
            $payload['entry']
        );


        $requestedWorkflowId =
            $request->input('workflow_id')
            ??
            $request->input('workflowId');

        $workflowId = null;


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

        $text = trim(
            (string) $text
        );

        /**
         * ----------------------------------------------------------------------
         * INTERACTIVE HANDLE
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
         * NORMALIZED INPUT
         * ----------------------------------------------------------------------
         */
        $normalizedText = strtolower(
            trim((string) $text)
        );

        /**
         * ----------------------------------------------------------------------
         * DEBUG INCOMING MESSAGE
         * ----------------------------------------------------------------------
         */
        Log::info(
            'WHATSAPP INCOMING MESSAGE',
            [
                'event_type' => $eventType,
                'mobile' => $from,
                'type' => $messageType,
                'content_type' => data_get(
                    $payload,
                    'contentType'
                ),
                'text' => $text,
                'normalized_text' => $normalizedText,
                'source_handle' => $sourceHandle,
                'interactive_title' => $interactiveTitle,
                'message_id' => $externalMessageId,
            ]
        );


        $triggerWorkflowId = null;

        /**
         * ----------------------------------------------------------------------
         * 1. FIRST PRIORITY: TRIGGER
         * ----------------------------------------------------------------------
         */
        if ($normalizedText !== '') {

            $triggerWorkflowId =
                $this->findWorkflowByTrigger(
                    $normalizedText
                );
        }

        /**
         * ----------------------------------------------------------------------
         * TRIGGER MATCHED
         * ----------------------------------------------------------------------
         */
        if (!empty($triggerWorkflowId)) {

            $workflowId = $triggerWorkflowId;

            Log::info(
                'WHATSAPP WORKFLOW SELECTED BY TRIGGER',
                [
                    'incoming_text' => $text,
                    'normalized_text' => $normalizedText,
                    'workflow_id' => $workflowId,
                    'reason' => 'trigger_match',
                ]
            );
        }


        if (
            empty($workflowId)
            &&
            !empty($requestedWorkflowId)
            &&
            !$isProviderWebhook
            &&
            !$isMetaWebhook
        ) {

            $workflowId = (int) $requestedWorkflowId;

            Log::info(
                'WHATSAPP WORKFLOW SELECTED BY REQUEST',
                [
                    'requested_workflow_id' => $requestedWorkflowId,
                    'workflow_id' => $workflowId,
                    'reason' => 'simulator_request',
                ]
            );
        }


        if (
            empty($workflowId)
            &&
            !empty($phoneNumberId)
        ) {

            $workflowId =
                $this->resolveWorkflowFromPhoneNumber(
                    $phoneNumberId
                );

            if (!empty($workflowId)) {

                Log::info(
                    'WHATSAPP WORKFLOW SELECTED BY PHONE NUMBER ID',
                    [
                        'phone_number_id' => $phoneNumberId,
                        'workflow_id' => $workflowId,
                    ]
                );
            }
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

            if (!empty($workflowId)) {

                Log::info(
                    'WHATSAPP WORKFLOW SELECTED BY WHATSAPP NUMBER',
                    [
                        'whatsapp_to' => $whatsappTo,
                        'workflow_id' => $workflowId,
                    ]
                );
            }
        }


        if (empty($workflowId)) {

            Log::warning(
                'WHATSAPP WORKFLOW NOT FOUND',
                [
                    'mobile' => $from,
                    'incoming_text' => $text,
                    'normalized_text' => $normalizedText,
                    'phone_number_id' => $phoneNumberId,
                    'whatsapp_to' => $whatsappTo,
                ]
            );

            return response()->json([
                'success' => false,
                'received' => true,
                'error' => true,
                'error_code' => 'WORKFLOW_NOT_CONFIGURED',
                'message' =>
                    'No WhatsApp workflow configured for this message.',
                'received_text' => $text,
                'normalized_text' => $normalizedText,
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


        $startNode = $workflow->nodes()
            ->where(
                'node_type',
                'start'
            )
            ->first();

        $startConfig =
            $startNode?->configuration
            ??
            [];

        if (is_string($startConfig)) {

            $decoded = json_decode(
                $startConfig,
                true
            );

            if (json_last_error() === JSON_ERROR_NONE) {
                $startConfig = $decoded;
            }
        }

        if (!is_array($startConfig)) {
            $startConfig = [];
        }

        $workflowTrigger =
            $this->getTriggerFromConfig(
                $startConfig
            );


        $isStartCommand = false;

        if (
            $normalizedText !== ''
            &&
            $workflowTrigger !== null
        ) {

            $isStartCommand =
                $normalizedText === strtolower(
                    trim($workflowTrigger)
                );
        }

        Log::info(
            'WHATSAPP WORKFLOW TRIGGER CHECK',
            [
                'workflow_id' => $workflow->id,
                'workflow_name' => $workflow->name,
                'start_node_id' => $startNode?->id,
                'workflow_trigger' => $workflowTrigger,
                'incoming_text' => $text,
                'normalized_text' => $normalizedText,
                'is_start_command' => $isStartCommand,
                'trigger_workflow_id' => $triggerWorkflowId,
                'requested_workflow_id' => $requestedWorkflowId,
            ]
        );

        /**
         * ==========================================================================
         * SESSION
         * ==========================================================================
         */
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

        /**
         * ==========================================================================
         * NO SESSION
         * ==========================================================================
         */
        if (!$session) {

            if (!$isStartCommand) {

                return response()->json([
                    'success' => false,
                    'received' => true,
                    'started' => false,
                    'error' => true,
                    'error_code' => 'JOURNEY_NOT_STARTED',
                    'message' =>
                        $workflowTrigger
                            ? 'Please type "' .
                                $workflowTrigger .
                                '" to start the journey.'
                            : 'This journey has no trigger configured.',
                    'workflow' => [
                        'id' => $workflow->id,
                        'name' => $workflow->name,
                    ],
                    'trigger' => $workflowTrigger,
                    'user_identifier' => $from,
                    'received_input' => $text,
                ], 422);
            }

            /**
             * Create session
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

        /**
         * ==========================================================================
         * COMPLETED SESSION
         * ==========================================================================
         */
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
                    $workflowTrigger
                        ? 'Journey is completed. Please type "' .
                            $workflowTrigger .
                            '" to start again.'
                        : 'Journey is completed.',
                'workflow' => [
                    'id' => $workflow->id,
                    'name' => $workflow->name,
                ],
                'trigger' => $workflowTrigger,
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

        /**
         * ==========================================================================
         * SESSION EXISTS BUT JOURNEY NOT STARTED
         * ==========================================================================
         */
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
                    $workflowTrigger
                        ? 'Journey has not started. Please type "' .
                            $workflowTrigger .
                            '" to start the journey.'
                        : 'Journey has no trigger configured.',
                'workflow' => [
                    'id' => $workflow->id,
                    'name' => $workflow->name,
                ],
                'trigger' => $workflowTrigger,
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
         * ==========================================================================
         * UPDATE SESSION
         * ==========================================================================
         */
        $session->last_message_at = now();
        $session->save();

        /**
         * ==========================================================================
         * SAVE INBOUND MESSAGE
         * ==========================================================================
         */
        $botMessage = new BotMessage();

        $botMessage->bot_session_id =
            $session->id;

        $botMessage->direction =
            'inbound';

        $botMessage->message_type =
            $messageType
            ?:
            (
                $sourceHandle
                    ? 'interactive'
                    : 'text'
            );

        $botMessage->text =
            $text
            ?:
            $interactiveTitle
            ?:
            $sourceHandle
            ?:
            '';

        $botMessage->payload =
            $payload;

        if (!empty($externalMessageId)) {

            $botMessage->external_message_id =
                $externalMessageId;
        }

        $botMessage->save();

        /**
         * ==========================================================================
         * ENGINE INPUT
         * ==========================================================================
         */
        $input = [];

        if (!empty($sourceHandle)) {

            $input['source_handle'] =
                (string) $sourceHandle;

            $input['title'] =
                (string) (
                    $interactiveTitle ?? ''
                );

        } else {

            $input['text'] =
                (string) (
                    $text ?? ''
                );
        }

        if (!empty($interactiveTitle)) {

            $input['title'] =
                $interactiveTitle;
        }

        /**
         * ==========================================================================
         * REFRESH SESSION
         * ==========================================================================
         */
        $session->refresh();

        /**
         * ==========================================================================
         * START JOURNEY
         * ==========================================================================
         */
        if ($isStartCommand) {

            $session->current_node_id = null;
            $session->status = 'active';
            $session->variables = [];
            $session->last_message_at = now();

            $session->save();

            Log::info(
                'WHATSAPP JOURNEY STARTING',
                [
                    'workflow_id' => $workflow->id,
                    'workflow_name' => $workflow->name,
                    'mobile' => $from,
                    'trigger' => $workflowTrigger,
                    'input' => $input,
                ]
            );

            $engine->start(
                $workflow,
                $from,
                $input
            );

        } else {

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
                        $workflowTrigger
                            ? 'Journey cannot continue because the current node is missing. Please type "' .
                                $workflowTrigger .
                                '" to start the journey.'
                            : 'Journey cannot continue because the current node is missing.',
                    'workflow' => [
                        'id' => $workflow->id,
                        'name' => $workflow->name,
                    ],
                    'trigger' => $workflowTrigger,
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
             * Continue journey
             */
            Log::info(
                'WHATSAPP JOURNEY CONTINUING',
                [
                    'workflow_id' => $workflow->id,
                    'mobile' => $from,
                    'current_node_id' =>
                        $session->current_node_id,
                    'input' => $input,
                ]
            );

            $engine->execute(
                $workflow,
                $session,
                (string) $session->current_node_id,
                $input
            );
        }

        /**
         * ==========================================================================
         * REFRESH AFTER ENGINE
         * ==========================================================================
         */
        $session->refresh();

        /**
         * ==========================================================================
         * GET OUTBOUND MESSAGES
         * ==========================================================================
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

        /**
         * ==========================================================================
         * RESPONSE
         * ==========================================================================
         */
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
                'trigger' => $workflowTrigger,
            ],

            'whatsapp_to' =>
                $whatsappTo,

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

    /**
     * ==========================================================================
     * GET TRIGGER FROM START NODE CONFIGURATION
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
     * FIND WORKFLOW BY TRIGGER
     * ==========================================================================
     */
    private function findWorkflowByTrigger(
        string $normalizedText
    ): ?int {

        $workflows = Workflow::query()
            ->where(
                'channel',
                'whatsapp'
            )
            ->where(
                'status',
                'published'
            )
            ->with([
                'nodes' => function ($query) {
                    $query->where(
                        'node_type',
                        'start'
                    );
                },
            ])
            ->orderBy('id')
            ->get();

        foreach ($workflows as $workflow) {

            $startNode =
                $workflow->nodes->first();

            if (!$startNode) {
                continue;
            }

            $config =
                $startNode->configuration
                ??
                [];

            if (is_string($config)) {

                $decoded =
                    json_decode(
                        $config,
                        true
                    );

                if (
                    json_last_error()
                    ===
                    JSON_ERROR_NONE
                ) {

                    $config = $decoded;
                }
            }

            if (!is_array($config)) {
                $config = [];
            }

            $trigger =
                $this->getTriggerFromConfig(
                    $config
                );

            if (!$trigger) {
                continue;
            }

            $workflowTriggerNormalized =
                strtolower(
                    trim($trigger)
                );

            $incomingNormalized =
                strtolower(
                    trim($normalizedText)
                );

            Log::info(
                'WHATSAPP TRIGGER CHECK',
                [
                    'workflow_id' =>
                        $workflow->id,
                    'workflow_name' =>
                        $workflow->name,
                    'trigger' =>
                        $trigger,
                    'trigger_normalized' =>
                        $workflowTriggerNormalized,
                    'incoming_text' =>
                        $normalizedText,
                    'match' =>
                        $workflowTriggerNormalized
                        ===
                        $incomingNormalized,
                ]
            );

            if (
                $workflowTriggerNormalized
                ===
                $incomingNormalized
            ) {

                Log::info(
                    'WHATSAPP TRIGGER MATCHED',
                    [
                        'workflow_id' =>
                            $workflow->id,
                        'workflow_name' =>
                            $workflow->name,
                        'trigger' =>
                            $trigger,
                        'incoming_text' =>
                            $normalizedText,
                    ]
                );

                return (int) $workflow->id;
            }
        }

        return null;
    }

    /**
     * ==========================================================================
     * RESOLVE WORKFLOW FROM WHATSAPP NUMBER
     * ==========================================================================
     */
    private function resolveWorkflowFromWhatsAppNumber(
        ?string $number
    ): ?int {

        if (empty($number)) {
            return null;
        }

        $number = preg_replace(
            '/\D+/',
            '',
            (string) $number
        );

        if (empty($number)) {
            return null;
        }

        $map = config(
            'services.whatsapp.number_workflow_map',
            []
        );

        if (!is_array($map)) {
            return null;
        }

        foreach (
            $map as $mappedNumber => $workflowId
        ) {

            $mappedNumber =
                preg_replace(
                    '/\D+/',
                    '',
                    (string) $mappedNumber
                );

            if (
                $mappedNumber
                ===
                $number
            ) {

                return (int) $workflowId;
            }
        }

        return null;
    }

    /**
     * ==========================================================================
     * RESOLVE WORKFLOW FROM META PHONE NUMBER ID
     * ==========================================================================
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
            ??
            null;

        return $workflowId
            ? (int) $workflowId
            : null;
    }

    /**
     * ==========================================================================
     * RESET WHATSAPP JOURNEY
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

        $query = BotSession::where(
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

            $session->current_node_id =
                null;

            $session->status =
                'active';

            $session->variables =
                [];

            $session->last_message_at =
                null;

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
