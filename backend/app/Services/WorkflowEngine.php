<?php

namespace App\Services;

use App\Models\BotMessage;
use App\Models\BotSession;
use App\Models\CustomerLead;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WorkflowEngine
{
    public function __construct(
        private WhatsAppService $whatsapp
    ) {
    }

    /*
    |--------------------------------------------------------------------------
    | FIND WORKFLOW BY TRIGGER
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | This method is ONLY for starting a NEW workflow.
    |
    | If user already has active/waiting session, this method must NOT
    | be used. handleIncoming() takes care of that.
    |
    */

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

        Log::info('WHATSAPP TRIGGER SEARCH', [
            'incoming_message' => $message,
            'workflow_count' => $workflows->count(),
        ]);

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

            /*
            |--------------------------------------------------------------------------
            | triggerText
            |--------------------------------------------------------------------------
            */

            if (
                isset($cfg['triggerText'])
                &&
                ! is_array($cfg['triggerText'])
            ) {
                $triggers[] = $cfg['triggerText'];
            }

            /*
            |--------------------------------------------------------------------------
            | trigger
            |--------------------------------------------------------------------------
            */

            if (
                isset($cfg['trigger'])
                &&
                ! is_array($cfg['trigger'])
            ) {
                $triggers[] = $cfg['trigger'];
            }

            /*
            |--------------------------------------------------------------------------
            | triggers
            |--------------------------------------------------------------------------
            */

            if (isset($cfg['triggers'])) {

                if (is_array($cfg['triggers'])) {

                    foreach ($cfg['triggers'] as $trigger) {
                        $triggers[] = $trigger;
                    }

                } else {

                    $triggers[] = $cfg['triggers'];
                }
            }

            /*
            |--------------------------------------------------------------------------
            | keyword
            |--------------------------------------------------------------------------
            */

            if (
                isset($cfg['keyword'])
                &&
                ! is_array($cfg['keyword'])
            ) {
                $triggers[] = $cfg['keyword'];
            }

            /*
            |--------------------------------------------------------------------------
            | keywords
            |--------------------------------------------------------------------------
            */

            if (isset($cfg['keywords'])) {

                if (is_array($cfg['keywords'])) {

                    foreach ($cfg['keywords'] as $trigger) {
                        $triggers[] = $trigger;
                    }

                } else {

                    $triggers[] = $cfg['keywords'];
                }
            }

            /*
            |--------------------------------------------------------------------------
            | NORMALIZE TRIGGERS
            |--------------------------------------------------------------------------
            */

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

            Log::info('WHATSAPP TRIGGER CHECK', [
                'workflow_id' => $workflow->id,
                'workflow_name' => $workflow->name,
                'start_node_id' => $startNode->node_id,
                'triggerText' => $cfg['triggerText'] ?? null,
                'triggers' => $normalizedTriggers,
                'incoming' => $message,
            ]);

            /*
            |--------------------------------------------------------------------------
            | EXACT MATCH
            |--------------------------------------------------------------------------
            */

            foreach ($normalizedTriggers as $trigger) {

                if ($message === $trigger) {

                    Log::info(
                        'WHATSAPP TRIGGER MATCHED',
                        [
                            'workflow_id' => $workflow->id,
                            'workflow_name' => $workflow->name,
                            'trigger' => $trigger,
                            'incoming' => $message,
                        ]
                    );

                    return $workflow;
                }
            }
        }

        Log::info(
            'WHATSAPP TRIGGER NOT FOUND',
            [
                'incoming' => $message,
            ]
        );

        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | FIND ACTIVE SESSION
    |--------------------------------------------------------------------------
    |
    | Only active/waiting sessions are considered active.
    |
    */

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

    /*
    |--------------------------------------------------------------------------
    | GET START NODE
    |--------------------------------------------------------------------------
    */

    private function getStartNode(Workflow $workflow)
    {
        return $workflow->nodes()
            ->where('node_type', 'start')
            ->first();
    }

    /*
    |--------------------------------------------------------------------------
    | HANDLE INCOMING MESSAGE
    |--------------------------------------------------------------------------
    |
    | FLOW:
    |
    | EXIT COMMAND?
    |      YES -> Current journey complete
    |
    | Existing active/waiting journey?
    |      YES -> Continue SAME workflow
    |
    | No active journey?
    |      YES -> Check trigger -> Start new workflow
    |
    */

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
        | EXIT / STOP CURRENT JOURNEY
        |--------------------------------------------------------------------------
        */

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

                Log::info('WHATSAPP JOURNEY EXIT', [
                    'user' => $user,
                    'session_id' => $session->id,
                    'workflow_id' => $session->workflow_id,
                    'current_node_id' => $session->current_node_id,
                    'status_before_exit' => $session->status,
                    'command' => $message,
                ]);

                /*
                |--------------------------------------------------------------------------
                | COMPLETE CURRENT SESSION
                |--------------------------------------------------------------------------
                */

                $session->update([
                    'status' => 'completed',
                    'current_node_id' => null,
                    'last_message_at' => now(),
                ]);

                $session->refresh();

                /*
                |--------------------------------------------------------------------------
                | SEND EXIT MESSAGE
                |--------------------------------------------------------------------------
                */

                $exitMessage =
                    'You have exited the current journey. You can start again anytime.';

                $output = $this->whatsapp->sendText(
                    $user,
                    $exitMessage
                );

                /*
                |--------------------------------------------------------------------------
                | SAVE OUTBOUND
                |--------------------------------------------------------------------------
                */

                $this->saveOutbound(
                    $session,
                    'text',
                    $exitMessage,
                    $output
                );

                Log::info('WHATSAPP JOURNEY EXIT COMPLETED', [
                    'user' => $user,
                    'session_id' => $session->id,
                    'workflow_id' => $session->workflow_id,
                    'status' => $session->status,
                ]);

                return $session;
            }

            Log::info('WHATSAPP EXIT WITHOUT ACTIVE SESSION', [
                'user' => $user,
                'command' => $message,
            ]);

            return null;
        }

        /*
        |--------------------------------------------------------------------------
        | 1. ALWAYS CHECK ACTIVE JOURNEY FIRST
        |--------------------------------------------------------------------------
        |
        | Agar user already Journey A mein hai aur Journey B ka
        | trigger bhejta hai, Journey B start nahi hogi.
        |
        | Journey A hi continue hogi.
        |
        */

        $existingSession = $this->findActiveSession($user);

        if ($existingSession) {

            Log::info('WHATSAPP ACTIVE JOURNEY LOCKED', [
                'user' => $user,
                'session_id' => $existingSession->id,
                'workflow_id' => $existingSession->workflow_id,
                'current_node_id' => $existingSession->current_node_id,
                'status' => $existingSession->status,
                'incoming_message' => $message,
            ]);

            /*
            |--------------------------------------------------------------------------
            | LOAD SAME WORKFLOW
            |--------------------------------------------------------------------------
            */

            $workflow = Workflow::query()
                ->where('id', $existingSession->workflow_id)
                ->where('channel', 'whatsapp')
                ->where('status', 'published')
                ->first();

            if (! $workflow) {

                Log::warning('ACTIVE JOURNEY WORKFLOW NOT FOUND', [
                    'user' => $user,
                    'session_id' => $existingSession->id,
                    'workflow_id' => $existingSession->workflow_id,
                ]);

                return $existingSession;
            }

            /*
            |--------------------------------------------------------------------------
            | CURRENT NODE
            |--------------------------------------------------------------------------
            */

            $currentNodeId = $existingSession->current_node_id;

            /*
            |--------------------------------------------------------------------------
            | CURRENT NODE EMPTY
            |--------------------------------------------------------------------------
            */

            if (! $currentNodeId) {

                Log::warning(
                    'ACTIVE JOURNEY CURRENT NODE EMPTY',
                    [
                        'user' => $user,
                        'session_id' => $existingSession->id,
                        'workflow_id' => $workflow->id,
                    ]
                );

                /*
                |--------------------------------------------------------------------------
                | RECOVER START NODE
                |--------------------------------------------------------------------------
                */

                $startNode = $this->getStartNode($workflow);

                if (! $startNode) {

                    Log::warning(
                        'ACTIVE JOURNEY START NODE NOT FOUND',
                        [
                            'user' => $user,
                            'session_id' => $existingSession->id,
                            'workflow_id' => $workflow->id,
                        ]
                    );

                    return $existingSession;
                }

                /*
                |--------------------------------------------------------------------------
                | RESTORE CURRENT NODE
                |--------------------------------------------------------------------------
                */

                $existingSession->update([
                    'current_node_id' => $startNode->node_id,
                    'status' => 'active',
                    'last_message_at' => now(),
                ]);

                $existingSession->refresh();

                /*
                |--------------------------------------------------------------------------
                | EXECUTE START NODE
                |--------------------------------------------------------------------------
                */

                $this->execute(
                    $workflow,
                    $existingSession,
                    (string) $startNode->node_id,
                    []
                );

                $existingSession->refresh();

                return $existingSession;
            }

            /*
            |--------------------------------------------------------------------------
            | CURRENT JOURNEY CONTINUES
            |--------------------------------------------------------------------------
            |
            | Incoming message ko new workflow trigger nahi banana.
            |
            */

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

        /*
        |--------------------------------------------------------------------------
        | 2. NO ACTIVE JOURNEY
        |--------------------------------------------------------------------------
        |
        | Ab trigger check hoga.
        |
        */

        $workflow = $this->findWorkflowByTrigger($message);

        if (! $workflow) {

            Log::info(
                'NO ACTIVE JOURNEY AND NO TRIGGER MATCH',
                [
                    'user' => $user,
                    'message' => $message,
                ]
            );

            return null;
        }

        /*
        |--------------------------------------------------------------------------
        | 3. START NEW JOURNEY
        |--------------------------------------------------------------------------
        */

        Log::info('STARTING NEW WHATSAPP JOURNEY', [
            'user' => $user,
            'workflow_id' => $workflow->id,
            'workflow_name' => $workflow->name,
            'trigger' => $message,
        ]);

        return $this->start(
            $workflow,
            $user,
            $incoming
        );
    }

    /*
    |--------------------------------------------------------------------------
    | START WORKFLOW
    |--------------------------------------------------------------------------
    */

    public function start(
        Workflow $workflow,
        string $user,
        array $incoming = []
    ): BotSession {

        /*
        |--------------------------------------------------------------------------
        | CHECK EXISTING ACTIVE JOURNEY
        |--------------------------------------------------------------------------
        */

        $existingSession = $this->findActiveSession($user);

        if ($existingSession) {

            Log::warning(
                'WHATSAPP START BLOCKED - ACTIVE JOURNEY EXISTS',
                [
                    'user' => $user,
                    'existing_session_id' => $existingSession->id,
                    'existing_workflow_id' => $existingSession->workflow_id,
                    'requested_workflow_id' => $workflow->id,
                    'current_node_id' => $existingSession->current_node_id,
                ]
            );

            return $existingSession;
        }

        /*
        |--------------------------------------------------------------------------
        | FIND OLD SESSION OF SAME WORKFLOW
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | FIND START NODE
        |--------------------------------------------------------------------------
        */

        $startNode = $this->getStartNode($workflow);

        if (! $startNode) {

            Log::warning(
                'WHATSAPP WORKFLOW HAS NO START NODE',
                [
                    'workflow_id' => $workflow->id,
                    'workflow_name' => $workflow->name,
                ]
            );

            return $session;
        }

        /*
        |--------------------------------------------------------------------------
        | EXECUTE START
        |--------------------------------------------------------------------------
        */

        $this->execute(
            $workflow,
            $session,
            (string) $startNode->node_id,
            []
        );

        $session->refresh();

        return $session;
    }

    /*
    |--------------------------------------------------------------------------
    | EXECUTE NODE
    |--------------------------------------------------------------------------
    */

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

            Log::warning('WORKFLOW NODE NOT FOUND', [
                'workflow_id' => $workflow->id,
                'session_id' => $session->id,
                'node_id' => $nodeId,
            ]);

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

            /*
            |--------------------------------------------------------------------------
            | START
            |--------------------------------------------------------------------------
            */

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
            }

            /*
            |--------------------------------------------------------------------------
            | MESSAGE
            |--------------------------------------------------------------------------
            */

            elseif ($type === 'message') {

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
            }

            /*
            |--------------------------------------------------------------------------
            | MENU
            |--------------------------------------------------------------------------
            */

            elseif ($type === 'menu') {

                /*
                |--------------------------------------------------------------------------
                | WHATSAPP BUTTON / LIST CLICK
                |--------------------------------------------------------------------------
                */

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

                /*
                |--------------------------------------------------------------------------
                | MANUAL TEXT INPUT
                |--------------------------------------------------------------------------
                */

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

                    /*
                    |--------------------------------------------------------------------------
                    | INVALID TEXT
                    |--------------------------------------------------------------------------
                    */

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

                /*
                |--------------------------------------------------------------------------
                | FIRST VISIT
                |--------------------------------------------------------------------------
                */

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
            | BUTTON
            |--------------------------------------------------------------------------
            */

            elseif ($type === 'button') {

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
                    'contact_number'
                        => 'mobile',

                    'email address'
                        => 'email',

                    'numeric'
                        => 'number',

                    'alphabets',
                    'alphabets only',
                    'alphabets_only',
                    'alphabetsonly'
                        => 'alpha',

                    'alpha numeric',
                    'alpha_numeric',
                    'alpha-numeric'
                        => 'alphanumeric',

                    'custom regex',
                    'custom_regex'
                        => 'regex',

                    default
                        => $validationType,
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

                    Log::info('USER INPUT DEBUG', [
                        'node_id' => $nodeId,
                        'variable' => $variable,
                        'allow_skip' => $allowSkip,
                        'skip_text' => $skipText,
                        'received_value' => $value,
                        'is_skip_text' => $isSkipText,
                        'required' => $required,
                    ]);

                    /*
                    |--------------------------------------------------------------------------
                    | ALLOW SKIP
                    |--------------------------------------------------------------------------
                    */

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

                        Log::info(
                            'USER INPUT SKIPPED',
                            [
                                'node_id' => $nodeId,
                                'variable' => $variable,
                                'skip_text' => $skipText,
                            ]
                        );

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

                $apiResult =
                    $this->executeApi(
                        $cfg,
                        $session
                    );

                $variables =
                    $session->variables ?? [];

                $variables['api_response'] =
                    $apiResult;

                if (isset($apiResult['order_status'])) {

                    $variables['order_status'] =
                        $apiResult['order_status'];
                }

                if (isset($apiResult['status'])) {

                    $variables['status'] =
                        $apiResult['status'];
                }

                $session->update([
                    'variables' => $variables,
                    'status' => 'active',
                    'last_message_at' => now(),
                ]);

                $output = $apiResult;

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
            | CONDITION
            |--------------------------------------------------------------------------
            */

            elseif ($type === 'condition') {

                $condition =
                    trim(
                        (string) (
                            $cfg['condition']
                            ??
                            ''
                        )
                    );

                $result =
                    $this->evaluateCondition(
                        $condition,
                        $session->variables ?? []
                    );

                $handle =
                    $result
                        ? 'source-yes'
                        : 'source-no';

                $next =
                    $this->nextNode(
                        $workflow,
                        $nodeId,
                        $handle
                    );

                $output = [
                    'condition' =>
                        $condition,
                    'result' =>
                        $result,
                    'source_handle' =>
                        $handle,
                ];

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
                    'status' =>
                        'completed',
                    'customer_lead_saved' =>
                        true,
                ];
            }

            /*
            |--------------------------------------------------------------------------
            | UNKNOWN NODE
            |--------------------------------------------------------------------------
            */

            else {

                Log::warning('UNKNOWN WORKFLOW NODE TYPE', [
                    'workflow_id' => $workflow->id,
                    'session_id' => $session->id,
                    'node_id' => $nodeId,
                    'node_type' => $type,
                ]);

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

            Log::error('WORKFLOW NODE EXECUTION FAILED', [
                'workflow_id' => $workflow->id,
                'session_id' => $session->id,
                'node_id' => $nodeId,
                'node_type' => $node->node_type ?? null,
                'error' => $e->getMessage(),
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
                'source_handle' =>
                    $sourceHandle,
                'label' =>
                    $label,
                'index' =>
                    $index,
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
            'bot_session_id' =>
                $session->id,

            'direction' =>
                'outbound',

            'message_type' =>
                $type,

            'text' =>
                $text,

            'payload' =>
                $payload,
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
                'Option ' . ($index + 1);

            $label =
                trim(
                    (string) $label
                );

            if ($label === '') {
                continue;
            }

            $normalizedOptions[] = [
                'id' =>
                    $sourceHandle,

                'label' =>
                    $label,

                'title' =>
                    $label,

                'source_handle' =>
                    $sourceHandle,
            ];
        }

        $whatsappResponse =
            $this->whatsapp->sendMenuButtons(
                $session->user_identifier,
                $message,
                $normalizedOptions
            );

        $payload = [
            'type' =>
                'menu',

            'message' =>
                $message,

            'options' =>
                $normalizedOptions,

            'whatsapp_response' =>
                $whatsappResponse,
        ];

        BotMessage::create([
            'bot_session_id' =>
                $session->id,

            'direction' =>
                'outbound',

            'message_type' =>
                'menu',

            'text' =>
                $message,

            'payload' =>
                $payload,
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
                        'id' =>
                            (string) $sourceHandle,

                        'title' =>
                            (string) $buttonText,
                    ],
                ]
            );

        $payload = [
            'type' =>
                'button',

            'message' =>
                $message,

            'button' => [
                'id' =>
                    (string) $sourceHandle,

                'title' =>
                    (string) $buttonText,

                'source_handle' =>
                    (string) $sourceHandle,
            ],

            'whatsapp_response' =>
                $whatsappResponse,
        ];

        BotMessage::create([
            'bot_session_id' =>
                $session->id,

            'direction' =>
                'outbound',

            'message_type' =>
                'button',

            'text' =>
                $message,

            'payload' =>
                $payload,
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
                'message' =>
                    'API URL is empty.',
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
                'status_code' =>
                    $response->status(),
                'message' =>
                    $response->body(),
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

            '==' =>
                $leftValue == $rightValue,

            '!=' =>
                $leftValue != $rightValue,

            '>' =>
                $leftValue > $rightValue,

            '<' =>
                $leftValue < $rightValue,

            '>=' =>
                $leftValue >= $rightValue,

            '<=' =>
                $leftValue <= $rightValue,

            default =>
                false,
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
                'session_id' =>
                    $session->id,
            ],
            [
                'workflow_id' =>
                    $workflow->id,

                'mobile' =>
                    $mobile,

                'status' =>
                    'new',

                'details' =>
                    $variables,
            ]
        );
    }
}
