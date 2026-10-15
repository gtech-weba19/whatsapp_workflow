<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class AdminDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $now = now();
        $today = $now->copy()->startOfDay();
        $monthStart = $now->copy()->startOfMonth();

        // Total Contacts: count from the actual contacts table
        $totalContacts = $this->countRows('contacts');

        $activeConversations = $this->countByStatus(
            'bot_sessions',
            ['active', 'waiting']
        );

        $messagesToday = $this->countToday(
            'bot_messages',
            $today
        );

        $monthlyMessages = $this->countSince(
            'bot_messages',
            $monthStart
        );

        $totalExecutions = $this->countSince(
            'workflow_executions',
            $monthStart
        );

        $successfulExecutions = $this->countByStatusSince(
            'workflow_executions',
            ['success', 'completed', 'successful'],
            $monthStart
        );

        $failedExecutions = $this->countByStatusSince(
            'workflow_executions',
            ['failed', 'failure', 'error'],
            $monthStart
        );

        $activeWorkflows = $this->countByStatus(
            'workflows',
            ['published', 'active']
        );

        $successRate = $totalExecutions > 0
            ? round(
                ($successfulExecutions / $totalExecutions) * 100,
                1
            )
            : 0;

        $failureRate = $totalExecutions > 0
            ? round(
                ($failedExecutions / $totalExecutions) * 100,
                1
            )
            : 0;

        return response()->json([
            'success' => true,
            'message' => 'Dashboard data fetched successfully.',

            'data' => [
                'stats' => [
                    'total_contacts' => $totalContacts,
                    'active_conversations' => $activeConversations,
                    'messages_today' => $messagesToday,
                    'workflow_executions' => $totalExecutions,
                    'successful_executions' => $successfulExecutions,
                    'failed_executions' => $failedExecutions,
                    'active_workflows' => $activeWorkflows,
                ],

                'monthly_usage' => [
                    'used' => $monthlyMessages,
                    'limit' => 100000,
                    'remaining' => max(
                        0,
                        100000 - $monthlyMessages
                    ),
                    'percentage' => min(
                        100,
                        round(($monthlyMessages / 100000) * 100, 1)
                    ),
                ],

                'execution_summary' => [
                    'success_rate' => $successRate,
                    'failure_rate' => $failureRate,
                    'total' => $totalExecutions,
                ],

                'whatsapp' => $this->getWhatsAppStatus(),

                'recent_executions' => $this->getRecentExecutions(),

                'generated_at' => $now->toIso8601String(),
            ],
        ]);
    }

    private function countRows(string $table): int
    {
        if (!Schema::hasTable($table)) {
            return 0;
        }

        return DB::table($table)->count();
    }

    private function countByStatus(
        string $table,
        array $statuses
    ): int {
        if (
            !Schema::hasTable($table) ||
            !Schema::hasColumn($table, 'status')
        ) {
            return 0;
        }

        return DB::table($table)
            ->whereIn('status', $statuses)
            ->count();
    }

    private function countToday(
        string $table,
        Carbon $start
    ): int {
        if (
            !Schema::hasTable($table) ||
            !Schema::hasColumn($table, 'created_at')
        ) {
            return 0;
        }

        return DB::table($table)
            ->where('created_at', '>=', $start)
            ->where('created_at', '<=', now())
            ->count();
    }

    private function countSince(
        string $table,
        Carbon $start
    ): int {
        if (
            !Schema::hasTable($table) ||
            !Schema::hasColumn($table, 'created_at')
        ) {
            return 0;
        }

        return DB::table($table)
            ->where('created_at', '>=', $start)
            ->where('created_at', '<=', now())
            ->count();
    }

    private function countByStatusSince(
        string $table,
        array $statuses,
        Carbon $start
    ): int {
        if (
            !Schema::hasTable($table) ||
            !Schema::hasColumn($table, 'status') ||
            !Schema::hasColumn($table, 'created_at')
        ) {
            return 0;
        }

        return DB::table($table)
            ->whereIn('status', $statuses)
            ->where('created_at', '>=', $start)
            ->where('created_at', '<=', now())
            ->count();
    }

   private function getWhatsAppStatus(): array
{
    $table = 'whatsapp_accounts';

    if (!Schema::hasTable($table)) {
        return [
            'status' => 'not_configured',
            'sender_number' => null,
            'active_numbers' => 0,
        ];
    }

    // Count accounts that are actually marked active/connected.
    $activeNumbers = DB::table($table)
        ->whereIn('status', ['active', 'connected'])
        ->count();

    // Find accounts that have WhatsApp configuration saved.
    $configuredQuery = DB::table($table)
        ->where(function ($query) {
            $query->where(function ($q) {
                $q->whereNotNull('phone_number_id')
                    ->where('phone_number_id', '!=', '');
            })->orWhere(function ($q) {
                $q->whereNotNull('sender_number')
                    ->where('sender_number', '!=', '');
            })->orWhere(function ($q) {
                $q->whereNotNull('phone_number')
                    ->where('phone_number', '!=', '');
            });
        });

    $configuredAccount = (clone $configuredQuery)
        ->orderByDesc('updated_at')
        ->first();

    $senderNumber = null;

    if ($activeNumbers > 0) {
        $activeAccount = DB::table($table)
            ->whereIn('status', ['active', 'connected'])
            ->orderByDesc('updated_at')
            ->first();

        $senderNumber = $activeAccount->sender_number
            ?: $activeAccount->phone_number
            ?: null;
    } elseif ($configuredAccount) {
        $senderNumber = $configuredAccount->sender_number
            ?: $configuredAccount->phone_number
            ?: null;
    }

    if ($activeNumbers > 0) {
        $status = 'connected';
    } elseif ($configuredAccount) {
        $status = 'configured';
    } else {
        $status = 'not_configured';
    }

    return [
        'status' => $status,
        'sender_number' => $senderNumber,
        'active_numbers' => $activeNumbers,
    ];
}
    private function getRecentExecutions(): array
    {
        $table = 'workflow_executions';

        if (
            !Schema::hasTable($table) ||
            !Schema::hasColumn($table, 'created_at')
        ) {
            return [];
        }

        $columns = Schema::getColumnListing($table);

        $rows = DB::table($table)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return $rows->map(function ($row) use ($columns) {
            $item = (array) $row;

            $workflowName = $item['workflow_name'] ?? null;

            if (
                empty($workflowName) &&
                isset($item['workflow_id']) &&
                Schema::hasTable('workflows')
            ) {
                $workflow = DB::table('workflows')
                    ->where('id', $item['workflow_id'])
                    ->first();

                $workflowName = $workflow->name ?? null;
            }

            $status = strtolower(
                (string) ($item['status'] ?? 'unknown')
            );

            if (in_array(
                $status,
                ['success', 'completed', 'successful'],
                true
            )) {
                $displayStatus = 'Success';
            } elseif (in_array(
                $status,
                ['failed', 'failure', 'error'],
                true
            )) {
                $displayStatus = 'Failed';
            } else {
                $displayStatus = ucfirst($status);
            }

            $contact = null;

            foreach (
                ['contact', 'mobile', 'user_identifier', 'phone']
                as $column
            ) {
                if (
                    in_array($column, $columns, true) &&
                    !empty($item[$column])
                ) {
                    $contact = $item[$column];
                    break;
                }
            }

            return [
                'id' => $item['id'] ?? null,
                'workflow' => $workflowName ?? 'Workflow',
                'contact' => $contact,
                'status' => $displayStatus,
                'time' => !empty($item['created_at'])
                    ? Carbon::parse($item['created_at'])->diffForHumans()
                    : null,
            ];
        })->values()->all();
    }
}
