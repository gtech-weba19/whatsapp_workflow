<?php

namespace App\Jobs;

use App\Models\BotSession;
use App\Models\Workflow;
use App\Services\WorkflowEngine;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ExecuteDelayedWorkflow implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /*
    |--------------------------------------------------------------------------
    | JOB SETTINGS
    |--------------------------------------------------------------------------
    */

    public int $tries = 3;

    public int $timeout = 120;

    /*
    |--------------------------------------------------------------------------
    | CONSTRUCTOR
    |--------------------------------------------------------------------------
    */

    public function __construct(
        public int $workflowId,
        public int $sessionId,
        public string $delayNodeId,
        public string $nextNodeId
    ) {
    }

    /*
    |--------------------------------------------------------------------------
    | HANDLE
    |--------------------------------------------------------------------------
    */

    public function handle(
        WorkflowEngine $engine
    ): void {

        Log::info(
            'WHATSAPP DELAY JOB STARTED',
            [
                'workflow_id' => $this->workflowId,
                'session_id' => $this->sessionId,
                'delay_node_id' => $this->delayNodeId,
                'next_node_id' => $this->nextNodeId,
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | GET WORKFLOW
        |--------------------------------------------------------------------------
        */

        $workflow = Workflow::query()
            ->where('id', $this->workflowId)
            ->where('channel', 'whatsapp')
            ->where('status', 'published')
            ->first();

        /*
        |--------------------------------------------------------------------------
        | GET SESSION
        |--------------------------------------------------------------------------
        */

        $session = BotSession::find(
            $this->sessionId
        );

        /*
        |--------------------------------------------------------------------------
        | WORKFLOW / SESSION NOT FOUND
        |--------------------------------------------------------------------------
        */

        if (!$workflow || !$session) {

            Log::warning(
                'WHATSAPP DELAY JOB WORKFLOW OR SESSION NOT FOUND',
                [
                    'workflow_id' => $this->workflowId,
                    'session_id' => $this->sessionId,
                    'workflow_found' => (bool) $workflow,
                    'session_found' => (bool) $session,
                ]
            );

            return;
        }

        $session->refresh();

        /*
        |--------------------------------------------------------------------------
        | CHECK SESSION
        |--------------------------------------------------------------------------
        |
        | Agar customer ne delay ke time me:
        |
        | - naya trigger bhej diya
        | - journey switch kar di
        | - exit kar diya
        | - kisi aur node par pahunch gaya
        |
        | to purana delayed job execute nahi hoga.
        |
        */

        if (
            (string) $session->current_node_id !==
            (string) $this->delayNodeId
        ) {

            Log::warning(
                'WHATSAPP DELAY SKIPPED',
                [
                    'workflow_id' => $workflow->id,
                    'session_id' => $session->id,
                    'expected_delay_node' => $this->delayNodeId,
                    'actual_current_node' => $session->current_node_id,
                    'next_node_id' => $this->nextNodeId,
                    'session_status' => $session->status,
                ]
            );

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | ACTIVATE SESSION
        |--------------------------------------------------------------------------
        */

        $session->update([
            'status' => 'active',
            'current_node_id' => $this->nextNodeId,
            'last_message_at' => now(),
        ]);

        $session->refresh();

        Log::info(
            'WHATSAPP DELAY STARTING NEXT NODE',
            [
                'workflow_id' => $workflow->id,
                'session_id' => $session->id,
                'delay_node_id' => $this->delayNodeId,
                'next_node_id' => $this->nextNodeId,
                'current_node_id' => $session->current_node_id,
                'status' => $session->status,
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | EXECUTE NEXT NODE
        |--------------------------------------------------------------------------
        */

        try {

            $engine->execute(
                $workflow,
                $session,
                $this->nextNodeId,
                []
            );

            Log::info(
                'WHATSAPP DELAY NEXT NODE EXECUTED',
                [
                    'workflow_id' => $workflow->id,
                    'session_id' => $session->id,
                    'delay_node_id' => $this->delayNodeId,
                    'next_node_id' => $this->nextNodeId,
                ]
            );

        } catch (\Throwable $e) {

            Log::error(
                'WHATSAPP DELAY NEXT NODE FAILED',
                [
                    'workflow_id' => $workflow->id,
                    'session_id' => $session->id,
                    'delay_node_id' => $this->delayNodeId,
                    'next_node_id' => $this->nextNodeId,

                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString(),
                ]
            );

            throw $e;
        }

        /*
        |--------------------------------------------------------------------------
        | FINAL LOG
        |--------------------------------------------------------------------------
        */

        Log::info(
            'WHATSAPP DELAY EXECUTED',
            [
                'workflow_id' => $workflow->id,
                'session_id' => $session->id,
                'delay_node_id' => $this->delayNodeId,
                'next_node_id' => $this->nextNodeId,
            ]
        );
    }
}
