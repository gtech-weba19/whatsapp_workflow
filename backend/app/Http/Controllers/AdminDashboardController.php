<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminDashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $isSuperAdmin = $user->isSuperAdmin();
        $userId = (int) $user->id;

        $now = now();
        $today = $now->copy()->startOfDay();
        $monthStart = $now->copy()->startOfMonth();

        $canViewContacts = $isSuperAdmin
            || $user->hasPermission('contacts.view');

        $canViewBots = $isSuperAdmin
            || $user->hasPermission('bots.view')
            || $user->hasPermission('whatsapp_accounts.view');

        $canViewWorkflows = $isSuperAdmin
            || $user->hasPermission('workflows.view');

        $canViewUsage = $isSuperAdmin
            || $user->hasPermission('usage.view');

        $canViewWhatsApp = $isSuperAdmin
            || $user->hasPermission('whatsapp_accounts.view');

        // Contacts: user sees only their own contacts.
        $totalContacts = $canViewContacts
            ? $this->countContacts($userId, $isSuperAdmin)
            : 0;

        // Sessions and messages: scoped to owned workflows.
        $activeConversations = $canViewBots
            ? $this->countActiveConversations($userId, $isSuperAdmin)
            : 0;

        $messagesToday = $canViewBots
            ? $this->countMessages($userId, $isSuperAdmin, $today)
            : 0;

        $monthlyMessages = ($canViewBots || $canViewUsage)
            ? $this->countMessages($userId, $isSuperAdmin, $monthStart)
            : 0;

        // Workflows and executions.
        $activeWorkflows = $canViewWorkflows
            ? $this->countActiveWorkflows($userId, $isSuperAdmin)
            : 0;

        $totalExecutions = $canViewWorkflows
            ? $this->countExecutions($userId, $isSuperAdmin, $monthStart)
            : 0;

        $successfulExecutions = $canViewWorkflows
            ? $this->countExecutions(
                $userId,
                $isSuperAdmin,
                $monthStart,
                ['success', 'completed', 'successful']
            )
            : 0;

        $failedExecutions = $canViewWorkflows
            ? $this->countExecutions(
                $userId,
                $isSuperAdmin,
                $monthStart,
                ['failed', 'failure', 'error']
            )
            : 0;

        $successRate = $totalExecutions > 0
            ? round(($successfulExecutions / $totalExecutions) * 100, 1)
            : 0;

        $failureRate = $totalExecutions > 0
            ? round(($failedExecutions / $totalExecutions) * 100, 1)
            : 0;

        // Subscription limit belongs to the logged-in user.
        $limit = $this->getMonthlyLimit($userId, $isSuperAdmin);
        $remaining = max(0, $limit - $monthlyMessages);

        $percentage = $limit > 0
            ? min(100, round(($monthlyMessages / $limit) * 100, 1))
            : 0;

        $whatsappData = $canViewWhatsApp
            ? $this->getWhatsAppStatus($userId, $isSuperAdmin)
            : [
                'status' => 'not_configured',
                'sender_number' => null,
                'active_numbers' => 0,
            ];

        $recentExecutions = $canViewWorkflows
            ? $this->getRecentExecutions($userId, $isSuperAdmin)
            : [];

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
                    'limit' => $limit,
                    'remaining' => $remaining,
                    'percentage' => $percentage,
                ],
                'execution_summary' => [
                    'success_rate' => $successRate,
                    'failure_rate' => $failureRate,
                    'total' => $totalExecutions,
                ],
                'whatsapp' => $whatsappData,
                'recent_executions' => $recentExecutions,
                'permissions' => $user->getAllPermissions(),
                'is_super_admin' => $isSuperAdmin,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role ?? null,
                ],
                'generated_at' => $now->toIso8601String(),
            ],
        ]);
    }

    /**
     * Return IDs of workflows owned by this user.
     * Super Admin can access all workflows.
     */
    private function workflowIds(int $userId, bool $isSuperAdmin)
    {
        if (!Schema::hasTable('workflows')) {
            return DB::table('workflows')->whereRaw('1 = 0')->select('id');
        }

        $query = DB::table('workflows')->select('id');

        if (!$isSuperAdmin) {
            if (!Schema::hasColumn('workflows', 'user_id')) {
                return $query->whereRaw('1 = 0');
            }

            $query->where('user_id', $userId);
        }

        return $query;
    }

    private function countContacts(int $userId, bool $isSuperAdmin): int
    {
        if (!Schema::hasTable('contacts')) {
            return 0;
        }

        $query = DB::table('contacts');

        if (!$isSuperAdmin) {
            $ownerColumn = $this->firstExistingColumn(
                'contacts',
                ['user_id', 'created_by']
            );

            if (!$ownerColumn) {
                return 0;
            }

            $query->where($ownerColumn, $userId);
        }

        return $query->count();
    }

    private function countActiveWorkflows(
        int $userId,
        bool $isSuperAdmin
    ): int {
        if (!Schema::hasTable('workflows')) {
            return 0;
        }

        $query = DB::table('workflows');

        if (!$isSuperAdmin) {
            $query->where('user_id', $userId);
        }

        if (Schema::hasColumn('workflows', 'status')) {
            $query->whereIn('status', ['published', 'active']);
        }

        return $query->count();
    }

    private function countActiveConversations(
        int $userId,
        bool $isSuperAdmin
    ): int {
        if (!Schema::hasTable('bot_sessions')) {
            return 0;
        }

        $query = DB::table('bot_sessions');

        if (!$isSuperAdmin) {
            if (
                !Schema::hasColumn('bot_sessions', 'workflow_id')
                || !Schema::hasTable('workflows')
                || !Schema::hasColumn('workflows', 'user_id')
            ) {
                return 0;
            }

            $query->whereIn(
                'bot_sessions.workflow_id',
                $this->workflowIds($userId, false)
            );
        }

        if (Schema::hasColumn('bot_sessions', 'status')) {
            $query->whereIn('bot_sessions.status', ['active', 'waiting']);
        } else {
            return 0;
        }

        return $query->count();
    }

    private function countMessages(
        int $userId,
        bool $isSuperAdmin,
        Carbon $from
    ): int {
        if (
            !Schema::hasTable('bot_messages')
            || !Schema::hasColumn('bot_messages', 'created_at')
        ) {
            return 0;
        }

        $query = DB::table('bot_messages');

        if (!$isSuperAdmin) {
            if (
                !Schema::hasColumn('bot_messages', 'bot_session_id')
                || !Schema::hasTable('bot_sessions')
                || !Schema::hasColumn('bot_sessions', 'workflow_id')
                || !Schema::hasTable('workflows')
                || !Schema::hasColumn('workflows', 'user_id')
            ) {
                return 0;
            }

            $ownedSessionIds = DB::table('bot_sessions')
                ->whereIn(
                    'workflow_id',
                    $this->workflowIds($userId, false)
                )
                ->select('id');

            $query->whereIn('bot_messages.bot_session_id', $ownedSessionIds);
        }

        return $query
            ->where('bot_messages.created_at', '>=', $from)
            ->where('bot_messages.created_at', '<=', now())
            ->count();
    }

    private function countExecutions(
        int $userId,
        bool $isSuperAdmin,
        Carbon $from,
        ?array $statuses = null
    ): int {
        if (
            !Schema::hasTable('workflow_executions')
            || !Schema::hasColumn('workflow_executions', 'created_at')
        ) {
            return 0;
        }

        $query = DB::table('workflow_executions');

        if (!$isSuperAdmin) {
            if (
                !Schema::hasColumn('workflow_executions', 'workflow_id')
                || !Schema::hasTable('workflows')
                || !Schema::hasColumn('workflows', 'user_id')
            ) {
                return 0;
            }

            $query->whereIn(
                'workflow_executions.workflow_id',
                $this->workflowIds($userId, false)
            );
        }

        if ($statuses !== null) {
            if (!Schema::hasColumn('workflow_executions', 'status')) {
                return 0;
            }

            $query->whereIn('workflow_executions.status', $statuses);
        }

        return $query
            ->where('workflow_executions.created_at', '>=', $from)
            ->where('workflow_executions.created_at', '<=', now())
            ->count();
    }

    private function getMonthlyLimit(
        int $userId,
        bool $isSuperAdmin
    ): int {
        if (!Schema::hasTable('user_subscriptions')) {
            return 100000;
        }

        $query = DB::table('user_subscriptions');

        if (!$isSuperAdmin) {
            if (!Schema::hasColumn('user_subscriptions', 'user_id')) {
                return 100000;
            }

            $query->where('user_id', $userId);
        }

        if (Schema::hasColumn('user_subscriptions', 'status')) {
            $query->where('status', 'active');
        }

        $subscription = Schema::hasColumn('user_subscriptions', 'id')
            ? $query->orderByDesc('id')->first()
            : $query->first();

        if (
            $subscription
            && isset($subscription->credits_granted)
            && (int) $subscription->credits_granted > 0
        ) {
            return (int) $subscription->credits_granted;
        }

        return 100000;
    }

    private function getWhatsAppStatus(
        int $userId,
        bool $isSuperAdmin
    ): array {
        $table = 'whatsapp_accounts';

        $empty = [
            'status' => 'not_configured',
            'sender_number' => null,
            'active_numbers' => 0,
        ];

        if (!Schema::hasTable($table)) {
            return $empty;
        }

        $query = DB::table($table);

        if (!$isSuperAdmin) {
            $ownerColumn = $this->firstExistingColumn(
                $table,
                ['user_id', 'created_by']
            );

            if (!$ownerColumn) {
                return $empty;
            }

            $query->where($ownerColumn, $userId);
        }

        if (!Schema::hasColumn($table, 'status')) {
            return $empty;
        }

        $activeQuery = (clone $query)
            ->whereIn('status', ['active', 'connected']);

        $activeNumbers = $activeQuery->count();

        $senderColumn = $this->firstExistingColumn(
            $table,
            ['sender_number', 'phone_number']
        );

        $configuredQuery = clone $query;

        if (Schema::hasColumn($table, 'phone_number_id')) {
            $configuredQuery->where(function ($q) use (
                $senderColumn,
                $table
            ) {
                $q->whereNotNull('phone_number_id')
                    ->where('phone_number_id', '!=', '');

                if ($senderColumn) {
                    $q->orWhere(function ($sq) use ($senderColumn) {
                        $sq->whereNotNull($senderColumn)
                            ->where($senderColumn, '!=', '');
                    });
                }
            });
        } elseif ($senderColumn) {
            $configuredQuery
                ->whereNotNull($senderColumn)
                ->where($senderColumn, '!=', '');
        } else {
            return $empty;
        }

        $sortColumn = Schema::hasColumn($table, 'updated_at')
            ? 'updated_at'
            : 'id';

        $configuredAccount = Schema::hasColumn($table, $sortColumn)
            ? (clone $configuredQuery)->orderByDesc($sortColumn)->first()
            : (clone $configuredQuery)->first();

        $activeAccount = Schema::hasColumn($table, $sortColumn)
            ? (clone $activeQuery)->orderByDesc($sortColumn)->first()
            : (clone $activeQuery)->first();

        $account = $activeAccount ?: $configuredAccount;

        $senderNumber = null;

        if ($account) {
            foreach (['sender_number', 'phone_number'] as $column) {
                if (
                    Schema::hasColumn($table, $column)
                    && !empty($account->{$column})
                ) {
                    $senderNumber = $account->{$column};
                    break;
                }
            }
        }

        return [
            'status' => $activeNumbers > 0
                ? 'connected'
                : ($configuredAccount ? 'configured' : 'not_configured'),
            'sender_number' => $senderNumber,
            'active_numbers' => $activeNumbers,
        ];
    }

    private function getRecentExecutions(
        int $userId,
        bool $isSuperAdmin
    ): array {
        $table = 'workflow_executions';

        if (
            !Schema::hasTable($table)
            || !Schema::hasColumn($table, 'created_at')
        ) {
            return [];
        }

        $columns = Schema::getColumnListing($table);
        $query = DB::table($table);

        if (!$isSuperAdmin) {
            if (
                !Schema::hasColumn($table, 'workflow_id')
                || !Schema::hasTable('workflows')
                || !Schema::hasColumn('workflows', 'user_id')
            ) {
                return [];
            }

            $query->whereIn(
                'workflow_executions.workflow_id',
                $this->workflowIds($userId, false)
            );
        }

        $sortColumn = 'workflow_executions.created_at';

        if (in_array('id', $columns, true)) {
            $query->orderByDesc('workflow_executions.id');
        } else {
            $query->orderByDesc($sortColumn);
        }

        $rows = $query->limit(5)->get();

        return $rows->map(function ($row) use ($columns) {
            $item = (array) $row;
            $workflowName = $item['workflow_name'] ?? null;

            if (
                empty($workflowName)
                && !empty($item['workflow_id'])
                && Schema::hasTable('workflows')
            ) {
                $workflowQuery = DB::table('workflows')
                    ->where('id', $item['workflow_id']);

                // Never resolve a workflow name from an unrelated owner.
                if (Schema::hasColumn('workflows', 'user_id')) {
                    $workflowQuery->where(function ($q) use ($item) {
                        $q->whereNotNull('user_id');
                    });
                }

                $workflow = $workflowQuery->first();
                $workflowName = $workflow->name ?? null;
            }

            $status = strtolower((string) ($item['status'] ?? 'unknown'));

            if (in_array($status, ['success', 'completed', 'successful'], true)) {
                $displayStatus = 'Success';
            } elseif (in_array($status, ['failed', 'failure', 'error'], true)) {
                $displayStatus = 'Failed';
            } else {
                $displayStatus = ucfirst($status);
            }

            $contact = null;

            foreach (['contact', 'mobile', 'user_identifier', 'phone'] as $column) {
                if (
                    in_array($column, $columns, true)
                    && !empty($item[$column])
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

    private function firstExistingColumn(
        string $table,
        array $candidates
    ): ?string {
        if (!Schema::hasTable($table)) {
            return null;
        }

        foreach ($candidates as $column) {
            if (Schema::hasColumn($table, $column)) {
                return $column;
            }
        }

        return null;
    }
}
