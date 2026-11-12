<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('bot_sessions')) {
            $existing = $this->getIndexNames('bot_sessions');

            Schema::table('bot_sessions', function (Blueprint $table) use ($existing) {
                if (!isset($existing['idx_bot_sessions_channel_last_msg_id'])) {
                    $table->index(['channel', 'last_message_at', 'id'], 'idx_bot_sessions_channel_last_msg_id');
                }
                if (!isset($existing['idx_bot_sessions_channel_user_last_msg'])) {
                    $table->index(['channel', 'user_id', 'last_message_at'], 'idx_bot_sessions_channel_user_last_msg');
                }
                if (!isset($existing['idx_bot_sessions_channel_workflow_last_msg'])) {
                    $table->index(['channel', 'workflow_id', 'last_message_at'], 'idx_bot_sessions_channel_workflow_last_msg');
                }
                if (!isset($existing['idx_bot_sessions_channel_status_last_msg'])) {
                    $table->index(['channel', 'status', 'last_message_at'], 'idx_bot_sessions_channel_status_last_msg');
                }
            });
        }

        if (Schema::hasTable('bot_messages')) {
            $existing = $this->getIndexNames('bot_messages');

            Schema::table('bot_messages', function (Blueprint $table) use ($existing) {
                if (!isset($existing['idx_bot_messages_session_dir_status'])) {
                    $table->index(['bot_session_id', 'direction', 'delivery_status'], 'idx_bot_messages_session_dir_status');
                }
                if (!isset($existing['idx_bot_messages_session_created_id'])) {
                    $table->index(['bot_session_id', 'created_at', 'id'], 'idx_bot_messages_session_created_id');
                }
                if (!isset($existing['idx_bot_messages_created_at'])) {
                    $table->index(['created_at'], 'idx_bot_messages_created_at');
                }
            });
        }

        if (Schema::hasTable('workflow_executions')) {
            $existing = $this->getIndexNames('workflow_executions');

            Schema::table('workflow_executions', function (Blueprint $table) use ($existing) {
                if (!isset($existing['idx_workflow_executions_session_id'])) {
                    $table->index(['bot_session_id', 'id'], 'idx_workflow_executions_session_id');
                }
                if (!isset($existing['idx_workflow_executions_created_status'])) {
                    $table->index(['created_at', 'status'], 'idx_workflow_executions_created_status');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('bot_sessions')) {
            $existing = $this->getIndexNames('bot_sessions');

            Schema::table('bot_sessions', function (Blueprint $table) use ($existing) {
                foreach ([
                    'idx_bot_sessions_channel_last_msg_id',
                    'idx_bot_sessions_channel_user_last_msg',
                    'idx_bot_sessions_channel_workflow_last_msg',
                    'idx_bot_sessions_channel_status_last_msg',
                ] as $index) {
                    if (isset($existing[$index])) {
                        $table->dropIndex($index);
                    }
                }
            });
        }

        if (Schema::hasTable('bot_messages')) {
            $existing = $this->getIndexNames('bot_messages');

            Schema::table('bot_messages', function (Blueprint $table) use ($existing) {
                foreach ([
                    'idx_bot_messages_session_dir_status',
                    'idx_bot_messages_session_created_id',
                    'idx_bot_messages_created_at',
                ] as $index) {
                    if (isset($existing[$index])) {
                        $table->dropIndex($index);
                    }
                }
            });
        }

        if (Schema::hasTable('workflow_executions')) {
            $existing = $this->getIndexNames('workflow_executions');

            Schema::table('workflow_executions', function (Blueprint $table) use ($existing) {
                foreach ([
                    'idx_workflow_executions_session_id',
                    'idx_workflow_executions_created_status',
                ] as $index) {
                    if (isset($existing[$index])) {
                        $table->dropIndex($index);
                    }
                }
            });
        }
    }

    private function getIndexNames(string $table): array
    {
        $rows = DB::select("SHOW INDEX FROM `{$table}`");
        $names = [];
        foreach ($rows as $row) {
            if (!empty($row->Key_name)) {
                $names[$row->Key_name] = true;
            }
        }
        return $names;
    }
};

