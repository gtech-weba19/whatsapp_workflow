<?php

namespace App\Http\Controllers;

use App\Models\BotMessage;
use App\Models\BotSession;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use App\Services\WorkflowEngine;
use Illuminate\Http\Request;

class WhatsAppWebhookController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | GET PUBLISHED JOURNEYS
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | HANDLE WHATSAPP MESSAGE
    |--------------------------------------------------------------------------
    */

    public function handle(
        Request $request,
        WorkflowEngine $engine
    ) {
        $payload = $request->all();

        /*
        |--------------------------------------------------------------------------
        | WORKFLOW ID
        |--------------------------------------------------------------------------
        */

        $workflowId = $request->input('workflow_id');

        if (! $workflowId) {
            return response()->json([
                'received' => false,
                'message' => 'workflow_id is required.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | FROM / MOBILE NUMBER
        |--------------------------------------------------------------------------
        */

        $from =
            data_get($payload, 'from')
            ?? data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.from'
            );

        if (! $from) {
            return response()->json([
                'received' => false,
                'message' => 'No sender/mobile number found.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | NORMALIZE MOBILE
        |--------------------------------------------------------------------------
        */

        $from = preg_replace('/\D/', '', (string) $from);

        if (! $from) {
            return response()->json([
                'received' => false,
                'message' => 'Invalid sender/mobile number.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | TEXT
        |--------------------------------------------------------------------------
        */

        $text =
            data_get($payload, 'text.body')
            ?? data_get(
                $payload,
                'entry.0.changes.0.value.messages.0.text.body'
            )
            ?? '';

        /*
        |--------------------------------------------------------------------------
        | INTERACTIVE SOURCE HANDLE
        |--------------------------------------------------------------------------
        |
        | Supports:
        |
        | interactive.source_handle
        | interactive.sourceHandle
        | interactive.button_reply.id
        | interactive.list_reply.id
        |
        */

        $sourceHandle =
            data_get(
                $payload,
                'interactive.source_handle'
            )
            ?? data_get(
                $payload,
                'interactive.sourceHandle'
            )
            ?? data_get(
                $payload,
                'interactive.button_reply.id'
            )
            ?? data_get(
                $payload,
                'interactive.list_reply.id'
            );

        /*
        |--------------------------------------------------------------------------
        | INTERACTIVE TITLE
        |--------------------------------------------------------------------------
        */

        $interactiveTitle =
            data_get(
                $payload,
                'interactive.title'
            )
            ?? data_get(
                $payload,
                'interactive.button_reply.title'
            )
            ?? data_get(
                $payload,
                'interactive.button_reply.text'
            )
            ?? data_get(
                $payload,
                'interactive.list_reply.title'
            )
            ?? data_get(
                $payload,
                'interactive.list_reply.text'
            );

        /*
        |--------------------------------------------------------------------------
        | FIND SELECTED PUBLISHED WORKFLOW
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | WORKFLOW NOT FOUND
        |--------------------------------------------------------------------------
        */

        if (! $workflow) {
            return response()->json([
                'received' => false,
                'message' => 'Selected Journey was not found or is not published.',
                'workflow_id' => $workflowId,
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | FIND SESSION FOR THIS EXACT JOURNEY
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        |
        | Same mobile number can have multiple journey sessions.
        |
        | Example:
        |
        | 919876543210 + Workflow 1 = Session A
        | 919876543210 + Workflow 2 = Session B
        |
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

        /*
        |--------------------------------------------------------------------------
        | CREATE SESSION
        |--------------------------------------------------------------------------
        */

        if (! $session) {

            $session = BotSession::create([
                'channel' => 'whatsapp',
                'user_identifier' => $from,
                'workflow_id' => $workflow->id,
                'variables' => [],
                'status' => 'active',
                'current_node_id' => null,
                'last_message_at' => now(),
            ]);

        } else {

            /*
            |--------------------------------------------------------------------------
            | EXISTING SESSION
            |--------------------------------------------------------------------------
            */

            $session->update([
                'last_message_at' => now(),
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | SAVE INBOUND MESSAGE
        |--------------------------------------------------------------------------
        */

        BotMessage::create([
            'bot_session_id' => $session->id,

            'direction' => 'inbound',

            'message_type' => $sourceHandle
                ? 'interactive'
                : 'text',

            'text' => $interactiveTitle ?: $text,

            'payload' => $payload,
        ]);

        /*
        |--------------------------------------------------------------------------
        | ENGINE INPUT
        |--------------------------------------------------------------------------
        */

        $input = [
            'text' => $text,
        ];

        if ($sourceHandle) {
            $input['source_handle'] = $sourceHandle;
        }

        if ($interactiveTitle) {
            $input['title'] = $interactiveTitle;
        }

        /*
        |--------------------------------------------------------------------------
        | REFRESH SESSION BEFORE DECISION
        |--------------------------------------------------------------------------
        */

        $session->refresh();

        /*
        |--------------------------------------------------------------------------
        | START / CONTINUE WORKFLOW
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        |
        | 1. New session
        | 2. current_node_id is null
        | 3. Previous journey is completed
        |
        | In all these cases START se workflow chalega.
        |
        */

/*
|--------------------------------------------------------------------------
| START COMMAND
|--------------------------------------------------------------------------
|
| Simulator me Hi / Hello / Start bhejne par
| selected journey ko fresh START se chalao.
|
*/

$startCommands = [
    'hi',
    'hello',
    'hey',
    'start',
    'restart',
];

$normalizedText = strtolower(trim((string) $text));

$isStartCommand = in_array(
    $normalizedText,
    $startCommands,
    true
);


/*
|--------------------------------------------------------------------------
| START / CONTINUE WORKFLOW
|--------------------------------------------------------------------------
*/

if (
    $isStartCommand ||
    ! $session->current_node_id ||
    $session->status === 'completed'
) {

    /*
    |--------------------------------------------------------------------------
    | RESET CURRENT JOURNEY SESSION
    |--------------------------------------------------------------------------
    */

    $session->update([
        'current_node_id' => null,
        'status' => 'active',
        'variables' => [],
        'last_message_at' => now(),
    ]);

    /*
    |--------------------------------------------------------------------------
    | START SELECTED JOURNEY
    |--------------------------------------------------------------------------
    */

    $engine->start(
        $workflow,
        $from,
        $input
    );

} else {

    /*
    |--------------------------------------------------------------------------
    | CONTINUE CURRENT JOURNEY
    |--------------------------------------------------------------------------
    */

    $engine->execute(
        $workflow,
        $session,
        $session->current_node_id,
        $input
    );
}

        /*
        |--------------------------------------------------------------------------
        | REFRESH SESSION AFTER ENGINE
        |--------------------------------------------------------------------------
        */

        $session->refresh();

        /*
        |--------------------------------------------------------------------------
        | GET OUTBOUND MESSAGES
        |--------------------------------------------------------------------------
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
            ->take(20)
            ->get()
            ->reverse()
            ->values();

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'received' => true,

            'workflow' => [
                'id' => $workflow->id,
                'name' => $workflow->name,
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

    /*
    |--------------------------------------------------------------------------
    | RESET WHATSAPP SESSION
    |--------------------------------------------------------------------------
    */

    public function reset(Request $request)
    {
        $from = $request->input('from');

        $workflowId = $request->input('workflow_id');

        /*
        |--------------------------------------------------------------------------
        | VALIDATE MOBILE
        |--------------------------------------------------------------------------
        */

        if (! $from) {
            return response()->json([
                'success' => false,
                'message' => 'Mobile number is required.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | NORMALIZE MOBILE
        |--------------------------------------------------------------------------
        */

        $from = preg_replace('/\D/', '', (string) $from);

        if (! $from) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid mobile number.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | FIND SESSIONS
        |--------------------------------------------------------------------------
        */

        $query = BotSession::where(
            'channel',
            'whatsapp'
        )
            ->where(
                'user_identifier',
                $from
            );

        /*
        |--------------------------------------------------------------------------
        | ONLY SELECTED JOURNEY
        |--------------------------------------------------------------------------
        */

        if ($workflowId) {
            $query->where(
                'workflow_id',
                $workflowId
            );
        }

        $sessions = $query->get();

        /*
        |--------------------------------------------------------------------------
        | RESET SESSIONS
        |--------------------------------------------------------------------------
        */

        foreach ($sessions as $session) {

            /*
            |--------------------------------------------------------------------------
            | RESET SESSION STATE
            |--------------------------------------------------------------------------
            */

            $session->update([
                'current_node_id' => null,
                'status' => 'active',
                'variables' => [],
                'last_message_at' => now(),
            ]);

            /*
            |--------------------------------------------------------------------------
            | DELETE BOT MESSAGES
            |--------------------------------------------------------------------------
            */

            BotMessage::where(
                'bot_session_id',
                $session->id
            )->delete();

            /*
            |--------------------------------------------------------------------------
            | DELETE WORKFLOW EXECUTIONS
            |--------------------------------------------------------------------------
            */

            WorkflowExecution::where(
                'bot_session_id',
                $session->id
            )->delete();
        }

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'success' => true,

            'message' => $workflowId
                ? 'Selected Journey session reset successfully.'
                : 'WhatsApp sessions reset successfully.',

            'mobile' => $from,

            'workflow_id' => $workflowId,
        ]);
    }
}
