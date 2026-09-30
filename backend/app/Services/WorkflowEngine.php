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


    public function start(
        Workflow $workflow,
        string $user,
        array $incoming = []
    ): void {

        $session = BotSession::firstOrCreate(
            [
                'channel' => 'whatsapp',
                'user_identifier' => $user,
                'workflow_id' => $workflow->id,
            ],
            [
                'variables' => [],
                'status' => 'active',
                'last_message_at' => now(),
            ]
        );

        $session->update([
            'workflow_id' => $workflow->id,
            'status' => 'active',
            'last_message_at' => now(),
        ]);

        $startNode = $workflow->nodes()
            ->where('node_type', 'start')
            ->first();

        if (! $startNode) {

            return;
        }

        $this->execute(
            $workflow,
            $session,
            $startNode->node_id,
            $incoming
        );
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
            | MESSAGE
            |--------------------------------------------------------------------------
            */
            elseif ($type === 'message') {

                $text = $this->resolve(
                    (string) (
                        $cfg['message']
                        ?? $cfg['text']
                        ?? ''
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

                    $sourceHandle = (string) $input['source_handle'];

                    $next = $this->nextNode(
                        $workflow,
                        $nodeId,
                        $sourceHandle
                    );


                    $variable = $cfg['variable'] ?? null;

                    if ($variable) {

                        $selectedLabel = $this->getMenuOptionLabel(
                            $cfg,
                            $sourceHandle,
                            $input
                        );

                        if (
                            $selectedLabel !== null
                            && trim((string) $selectedLabel) !== ''
                        ) {

                            $variables = $session->variables ?? [];

                            $variables[$variable] =
                                trim((string) $selectedLabel);

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
                        ?? $cfg['validationMessage']
                        ?? '⚠️ This option is not available right now. Please select another option.';

                    $validationMessage = $this->resolve(
                        (string) $validationMessage,
                        $session->variables ?? []
                    );

                    $output = $this->whatsapp->sendText(
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

                    $typedText = trim(
                        (string) ($input['text'] ?? '')
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
                        }

                        $next = $this->nextNode(
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
                        ?? $cfg['validationMessage']
                        ?? '⚠️ Please select one of the options above.';

                    $validationMessage = $this->resolve(
                        (string) $validationMessage,
                        $session->variables ?? []
                    );

                    $output = $this->whatsapp->sendText(
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



                    $next = $this->nextNode(
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
                        ?? $cfg['validationMessage']
                        ?? '⚠️ This button is not available right now.';

                    $validationMessage = $this->resolve(
                        (string) $validationMessage,
                        $session->variables ?? []
                    );

                    $output = $this->whatsapp->sendText(
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

                /*
                |--------------------------------------------------------------------------
                | FIRST VISIT
                |--------------------------------------------------------------------------
                */

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
                    ?? $cfg['name']
                    ?? 'last_input';

                /*
                |--------------------------------------------------------------------------
                | VALIDATION TYPE
                |--------------------------------------------------------------------------
                */

                $validationType = strtolower(
                    trim(
                        (string) (
                            $cfg['validation_type']
                            ?? $cfg['validationType']
                            ?? $cfg['validation']
                            ?? $cfg['input_type']
                            ?? $cfg['inputType']
                            ?? ''
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
                    ?? $cfg['allowSkip']
                    ?? $cfg['skip']
                    ?? $cfg['is_optional']
                    ?? $cfg['optional']
                    ?? false;

                if (is_bool($rawAllowSkip)) {

                    $allowSkip = $rawAllowSkip;

                } elseif (is_numeric($rawAllowSkip)) {

                    $allowSkip =
                        ((int) $rawAllowSkip) === 1;

                } else {

                    $allowSkip = in_array(
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



                $rawRequired =
                    $cfg['required']
                    ?? true;

                if (is_bool($rawRequired)) {

                    $required = $rawRequired;

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
                    ?? $cfg['validationMessage']
                    ?? '⚠️ Please enter a valid response.';

                $requiredMessage =
                    $cfg['required_validation_message']
                    ?? $cfg['requiredValidationMessage']
                    ?? $cfg['requiredMessage']
                    ?? '⚠️ This field is required. Please enter a valid response.';

                $mobileValidationMessage =
                    $cfg['mobile_validation_message']
                    ?? $cfg['mobileValidationMessage']
                    ?? '⚠️ Please enter a valid 10-digit mobile number.';

                /*
                |--------------------------------------------------------------------------
                | MIN / MAX
                |--------------------------------------------------------------------------
                */

                $minLength =
                    $cfg['minLength']
                    ?? $cfg['min_length']
                    ?? null;

                $maxLength =
                    $cfg['maxLength']
                    ?? $cfg['max_length']
                    ?? null;

                $minValue =
                    $cfg['minValue']
                    ?? $cfg['min_value']
                    ?? null;

                $maxValue =
                    $cfg['maxValue']
                    ?? $cfg['max_value']
                    ?? null;

                $regex = trim(
                    (string) (
                        $cfg['regex']
                        ?? ''
                    )
                );

                /*
                |--------------------------------------------------------------------------
                | INPUT RECEIVED
                |--------------------------------------------------------------------------
                */

                if (array_key_exists('text', $input)) {

                    $value = trim(
                        (string) (
                            $input['text']
                            ?? ''
                        )
                    );

                    $isSkipText =
                        $value !== ''
                        &&
                        strcasecmp(
                            trim($value),
                            trim($skipText)
                        ) === 0;

                    $isEmpty = $value === '';

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

                        $variables =
                            $session->variables ?? [];

                        $variables[$variable] = null;

                        $session->update([
                            'variables' => $variables,
                            'status' => 'active',
                            'last_message_at' => now(),
                        ]);

                        $session->refresh();

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

                        $message = $this->resolve(
                            (string) $requiredMessage,
                            $session->variables ?? []
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

                        $message = $this->resolve(
                            (string) $message,
                            $session->variables ?? []
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
                    | TEXT
                    */

                    if (
                        $validationType === ''
                        ||
                        $validationType === 'text'
                        ||
                        $validationType === 'string'
                    ) {

                        $isValid = $value !== '';
                    }

                    /*
                    | ALPHA
                    */

                    elseif ($validationType === 'alpha') {

                        $isValid =
                            preg_match(
                                '/^[\pL\s]+$/u',
                                $value
                            ) === 1;
                    }

                    /*
                    | ALPHANUMERIC
                    */

                    elseif ($validationType === 'alphanumeric') {

                        $isValid =
                            preg_match(
                                '/^[\pL\pN\s]+$/u',
                                $value
                            ) === 1;
                    }

                    /*
                    | MOBILE
                    */

                    elseif ($validationType === 'mobile') {

                        $digits = preg_replace(
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

                            $digits = substr(
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
                    | EMAIL
                    */

                    elseif ($validationType === 'email') {

                        $isValid =
                            filter_var(
                                $value,
                                FILTER_VALIDATE_EMAIL
                            ) !== false;
                    }

                    /*
                    | NUMBER
                    */

                    elseif ($validationType === 'number') {

                        $isValid = is_numeric($value);
                    }

                    /*
                    | INTEGER
                    */

                    elseif ($validationType === 'integer') {

                        $isValid =
                            filter_var(
                                $value,
                                FILTER_VALIDATE_INT
                            ) !== false;
                    }

                    /*
                    | DATE
                    */

                    elseif ($validationType === 'date') {

                        $timestamp = strtotime($value);

                        $isValid =
                            $timestamp !== false;
                    }

                    /*
                    | URL
                    */

                    elseif ($validationType === 'url') {

                        $isValid =
                            filter_var(
                                $value,
                                FILTER_VALIDATE_URL
                            ) !== false;
                    }

                    /*
                    | REGEX
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
                    | UNKNOWN
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

                        $message = $this->resolve(
                            (string) $validationMessage,
                            $session->variables ?? []
                        );

                        if (
                            $validationType === 'mobile'
                            &&
                            trim(
                                (string) $mobileValidationMessage
                            ) !== ''
                        ) {

                            $message = $this->resolve(
                                (string) $mobileValidationMessage,
                                $session->variables ?? []
                            );
                        }

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
                    | SAVE INPUT
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
                            'status' => 'waiting',
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

                $apiResult = $this->executeApi(
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
            | CONDITION
            |--------------------------------------------------------------------------
            */
            elseif ($type === 'condition') {

                $condition = trim(
                    (string) (
                        $cfg['condition']
                        ?? ''
                    )
                );

                $result = $this->evaluateCondition(
                    $condition,
                    $session->variables ?? []
                );

                $handle =
                    $result
                        ? 'source-yes'
                        : 'source-no';

                $next = $this->nextNode(
                    $workflow,
                    $nodeId,
                    $handle
                );

                $output = [
                    'condition' => $condition,
                    'result' => $result,
                    'source_handle' => $handle,
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
                    'status' => 'completed',
                    'customer_lead_saved' => true,
                ];
            }

            /*
            |--------------------------------------------------------------------------
            | UNKNOWN NODE
            |--------------------------------------------------------------------------
            */
            else {

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
        ->where('source', $source);


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


  private function findMenuOptionByText(
    array $cfg,
    string $typedText
): ?array {

    $typedText = trim($typedText);

    if ($typedText === '') {
        return null;
    }

    $options =
        $cfg['menuOptions']
        ?? $cfg['options']
        ?? $cfg['menu_options']
        ?? [];

    if (!is_array($options)) {
        return null;
    }

    foreach ($options as $index => $option) {

        if (!is_array($option)) {
            continue;
        }

        $label = trim(
            (string) (
                $option['label']
                ?? $option['title']
                ?? $option['text']
                ?? ''
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


        $sourceHandle = "source-option-{$index}";

        return [
            'source_handle' => $sourceHandle,
            'label' => $label,
            'index' => $index,
        ];
    }

    return null;
}


    private function getMenuOptionLabel(
        array $cfg,
        string $sourceHandle,
        array $input = []
    ): ?string {

        $options =
            $cfg['menuOptions']
            ?? $cfg['options']
            ?? $cfg['menu_options']
            ?? [];

        if (! is_array($options)) {
            return $input['title'] ?? null;
        }

        foreach ($options as $index => $option) {

            if (! is_array($option)) {
                continue;
            }

            $optionSourceHandle =
                $option['source_handle']
                ?? $option['sourceHandle']
                ?? null;

            $optionId =
                $option['id']
                ?? null;

            if (
                (string) $optionSourceHandle ===
                (string) $sourceHandle
            ) {

                return $option['label']
                    ?? $option['title']
                    ?? $option['text']
                    ?? null;
            }

            if (
                (string) $optionId ===
                (string) $sourceHandle
            ) {

                return $option['label']
                    ?? $option['title']
                    ?? $option['text']
                    ?? null;
            }
        }

        if (
            preg_match(
                '/^source-option-(\d+)$/',
                $sourceHandle,
                $matches
            )
        ) {

            $index = (int) $matches[1];

            if (
                isset($options[$index])
                &&
                is_array($options[$index])
            ) {

                return $options[$index]['label']
                    ?? $options[$index]['title']
                    ?? $options[$index]['text']
                    ?? null;
            }
        }

        return $input['title'] ?? null;
    }


    private function sendInputPrompt(
        BotSession $session,
        array $cfg
    ): void {

        $prompt =
            $cfg['prompt']
            ?? $cfg['message']
            ?? '';

        if (trim((string) $prompt) === '') {
            return;
        }

        $prompt = $this->resolve(
            (string) $prompt,
            $session->variables ?? []
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
    }


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


 private function sendMenu(
    BotSession $session,
    array $cfg
): void {

    $message =
        $cfg['message']
        ?? $cfg['text']
        ?? 'Please select an option.';

    $message = $this->resolve(
        (string) $message,
        $session->variables ?? []
    );

    $options =
        $cfg['menuOptions']
        ?? $cfg['options']
        ?? $cfg['menu_options']
        ?? [];

    if (!is_array($options)) {
        $options = [];
    }

    $normalizedOptions = [];

    foreach ($options as $index => $option) {

        if (!is_array($option)) {
            continue;
        }


        $sourceHandle = "source-option-{$index}";

        $label =
            $option['label']
            ?? $option['title']
            ?? $option['text']
            ?? 'Option ' . ($index + 1);

        $label = trim((string) $label);

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
            ?? $cfg['text']
            ?? '';

        $message = $this->resolve(
            (string) $message,
            $session->variables ?? []
        );

        $buttonText =
            $cfg['buttonText']
            ?? $cfg['button_text']
            ?? $cfg['label']
            ?? $cfg['title']
            ?? 'Continue';

        $sourceHandle =
            $cfg['source_handle']
            ?? $cfg['sourceHandle']
            ?? 'source-bottom';

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
            'type' => 'button',

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

        $method = strtoupper(
            $cfg['method'] ?? 'GET'
        );

        $url =
            $cfg['api_url']
            ?? $cfg['apiUrl']
            ?? $cfg['url']
            ?? '';

        $url = $this->resolve(
            (string) $url,
            $session->variables ?? []
        );

        if ($url === '') {

            return [
                'success' => false,
                'message' => 'API URL is empty.',
            ];
        }

        if (str_starts_with($url, '/')) {
            $url = url($url);
        }

        $response = Http::timeout(15)
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

        $json = $response->json();

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

        $condition = $this->resolve(
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

        $leftKey = $matches[1];
        $operator = $matches[2];

        $right = trim(
            $matches[3]
        );

        $left = data_get(
            $variables,
            $leftKey
        );

        $right = trim(
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
            ?? $variables['phone']
            ?? $variables['phone_number']
            ?? $variables['contact']
            ?? $session->user_identifier
            ?? null;

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
