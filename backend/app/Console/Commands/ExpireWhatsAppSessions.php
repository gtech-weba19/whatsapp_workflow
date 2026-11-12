<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BotSession;
use App\Models\Workflows;
use App\Services\WhatsAppService;
use Illuminate\Support\Facades\Log;

class ExpireWhatsAppSessions extends Command
{
    protected $signature = 'whatsapp:expire-sessions';

    protected $description = 'Expire WhatsApp sessions after 10 minutes of inactivity';

    public function handle()
    {
        $expiredSessions = BotSession::query()
            ->where('channel', 'whatsapp')
            ->whereIn('status', ['active', 'waiting'])
            ->whereNotNull('last_message_at')
            ->where('last_message_at', '<=', now()->subMinutes(10))
            ->orderBy('id')
            ->get();

        foreach ($expiredSessions as $session) {

            try {

                /*
                |--------------------------------------------------------------------------
                | COMPLETE SESSION SAFELY
                |--------------------------------------------------------------------------
                */

                $updated = BotSession::query()
                    ->where('id', $session->id)
                    ->where('user_id', $session->user_id)
                    ->where('whatsapp_account_id', $session->whatsapp_account_id)
                    ->whereIn('status', ['active', 'waiting'])
                    ->where('last_message_at', '<=', now()->subMinutes(10))
                    ->update([
                        'status' => 'completed',
                        'current_node_id' => null,
                    ]);

                // Skip if session was already updated or user replied.
                if (!$updated) {
                    continue;
                }

                Log::info('WHATSAPP SESSION AUTO EXPIRED', [
                    'session_id' => $session->id,
                    'user_id' => $session->user_id,
                    'whatsapp_account_id' => $session->whatsapp_account_id,
                    'workflow_id' => $session->workflow_id,
                    'user_identifier' => $session->user_identifier,
                    'last_message_at' => $session->last_message_at,
                ]);

                /*
                |--------------------------------------------------------------------------
                | FIND CORRECT WORKFLOW
                |--------------------------------------------------------------------------
                */

                $workflow = Workflows::query()
                    ->where('id', $session->workflow_id)
                    ->where('user_id', $session->user_id)
                    ->where('whatsapp_account_id', $session->whatsapp_account_id)
                    ->first();

                if (!$workflow) {

                    Log::warning('WHATSAPP EXPIRY WORKFLOW NOT FOUND', [
                        'session_id' => $session->id,
                        'workflow_id' => $session->workflow_id,
                        'user_id' => $session->user_id,
                        'whatsapp_account_id' => $session->whatsapp_account_id,
                    ]);

                    continue;
                }

                /*
                |--------------------------------------------------------------------------
                | SESSION EXPIRY NOTIFICATION
                |--------------------------------------------------------------------------
                */

                $expiryMessage = "⏳ *Conversation Session Expired*\n\n"
                    . "Your session has been closed due to 10 minutes of inactivity.\n\n"
                    . "No worries! 😊 You can start a new conversation anytime by sending us a message.\n\n"
                    . "Thank you for connecting with us!";

                try {

                    /*
                    |--------------------------------------------------------------------------
                    | CONFIGURE WHATSAPP SERVICE FOR THIS WORKFLOW
                    |--------------------------------------------------------------------------
                    */

                    $whatsappService = WhatsAppService::forWorkflow($workflow);

                    $response = $whatsappService->sendText(
                        $session->user_identifier,
                        $expiryMessage
                    );

                    Log::info('WHATSAPP SESSION EXPIRY MESSAGE SENT', [
                        'session_id' => $session->id,
                        'user_id' => $session->user_id,
                        'whatsapp_account_id' => $session->whatsapp_account_id,
                        'response' => $response,
                    ]);

                } catch (\Throwable $e) {

                    Log::error('WHATSAPP SESSION EXPIRY MESSAGE FAILED', [
                        'session_id' => $session->id,
                        'user_id' => $session->user_id,
                        'whatsapp_account_id' => $session->whatsapp_account_id,
                        'error' => $e->getMessage(),
                    ]);
                }

            } catch (\Throwable $e) {

                Log::error('WHATSAPP AUTO SESSION EXPIRY FAILED', [
                    'session_id' => $session->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return self::SUCCESS;
    }
}
