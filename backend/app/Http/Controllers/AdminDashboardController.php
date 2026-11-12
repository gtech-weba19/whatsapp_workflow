<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\WalletService;
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

        $selectedWorkflowId = $request->filled('workflow_id')
            && strtolower((string) $request->input('workflow_id')) !== 'all'
            && ctype_digit((string) $request->input('workflow_id'))
                ? (int) $request->input('workflow_id')
                : null;

        if ($selectedWorkflowId !== null && !$isSuperAdmin) {
            $ownsSelected = Schema::hasTable('workflows')
                && DB::table('workflows')
                    ->where('id', $selectedWorkflowId)
                    ->where('user_id', $userId)
                    ->exists();
            if (!$ownsSelected) {
                $selectedWorkflowId = null;
            }
        }

        // Contacts & unique engaged WhatsApp customers.
        $totalContacts = $canViewContacts
            ? $this->countContacts($userId, $isSuperAdmin)
            : 0;

        $canSeeConversations = $canViewBots || $canViewUsage || $canViewWorkflows;

        // Consolidated single-pass SQL aggregates (zero redundant table scans).
        $convMetrics = $canSeeConversations
            ? $this->getConversationMetrics($userId, $isSuperAdmin)
            : [
                'total_conversations' => 0,
                'active_conversations' => 0,
                'completed_conversations' => 0,
                'unique_customers' => 0,
            ];

        $activeConversations = $convMetrics['active_conversations'];
        $totalConversations = $convMetrics['total_conversations'];
        $completedConversations = $convMetrics['completed_conversations'];
        $uniqueCustomers = $convMetrics['unique_customers'];

        $thirtyDaysStart = $now->copy()->subDays(29)->startOfDay();
        $msgMetrics = ($canSeeConversations || $canViewBots || $canViewUsage)
            ? $this->getMessageWindowMetrics($userId, $isSuperAdmin, $today, $thirtyDaysStart, $monthStart, $now)
            : ['today' => 0, 'days_30' => 0, 'month' => 0];

        $messagesToday = $canSeeConversations ? $msgMetrics['today'] : 0;
        $totalMessages30d = $canSeeConversations ? $msgMetrics['days_30'] : 0;
        $monthlyMessages = ($canViewBots || $canViewUsage) ? $msgMetrics['month'] : 0;

        // Consolidated workflows & executions metrics.
        $wfMetrics = ($canViewWorkflows || $canViewBots)
            ? $this->getWorkflowCountMetrics($userId, $isSuperAdmin)
            : ['active' => 0, 'total' => 0];

        $activeWorkflows = $wfMetrics['active'];
        $totalWorkflows = $wfMetrics['total'];

        $totalBots = $canViewBots
            ? $this->countTotalBots($userId, $isSuperAdmin)
            : 0;

        $execMetrics = $canViewWorkflows
            ? $this->getExecutionCountMetrics($userId, $isSuperAdmin, $monthStart, $now)
            : ['total' => 0, 'success' => 0, 'failed' => 0];

        $totalExecutions = $execMetrics['total'];
        $successfulExecutions = $execMetrics['success'];
        $failedExecutions = $execMetrics['failed'];

        $successRate = $totalExecutions > 0
            ? round(($successfulExecutions / $totalExecutions) * 100, 1)
            : 0;

        $failureRate = $totalExecutions > 0
            ? round(($failedExecutions / $totalExecutions) * 100, 1)
            : 0;

        // Monthly quota calculated strictly from live wallet balance & message rate (no fake limit fallback).
        $monthlyUsage = $this->getMonthlyQuotaMetrics(
            $user,
            $isSuperAdmin,
            $monthlyMessages
        );

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

        $dailyHits = $canSeeConversations
            ? $this->getDailyHits30d($userId, $isSuperAdmin, $selectedWorkflowId)
            : [];

        $workflowBreakdown = $canSeeConversations
            ? $this->getWorkflowBreakdown30d($userId, $isSuperAdmin)
            : ['total' => 0, 'by_workflow' => [], 'by_status' => []];

        $keywordsSummary = $canSeeConversations
            ? $this->getWorkflowTriggersSummary30d($userId, $isSuperAdmin)
            : [];

        $canSeeAccounts = $canViewWhatsApp || $canViewBots || $canViewWorkflows;
        $accountsOverview = $canSeeAccounts
            ? $this->getAccountsOverview($userId, $isSuperAdmin)
            : [];

        return response()->json([
            'success' => true,
            'message' => 'Dashboard data fetched successfully.',
            'data' => [
                'stats' => [
                    'total_contacts' => $totalContacts,
                    'unique_customers' => $uniqueCustomers,
                    'total_conversations' => $totalConversations,
                    'active_conversations' => $activeConversations,
                    'completed_conversations' => $completedConversations,
                    'messages_today' => $messagesToday,
                    'total_messages_30d' => $totalMessages30d,
                    'workflow_executions' => $totalExecutions,
                    'successful_executions' => $successfulExecutions,
                    'failed_executions' => $failedExecutions,
                    'active_workflows' => $activeWorkflows,
                    'total_workflows' => $totalWorkflows,
                    'total_bots' => $totalBots,
                    'total_accounts' => count($accountsOverview),
                ],
                'monthly_usage' => $monthlyUsage,
                'execution_summary' => [
                    'success_rate' => $successRate,
                    'failure_rate' => $failureRate,
                    'total' => $totalExecutions,
                ],
                'daily_hits' => $dailyHits,
                'workflow_breakdown' => $workflowBreakdown,
                'keywords_summary' => $keywordsSummary,
                'accounts_overview' => $accountsOverview,
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

    private function getWorkflowCountMetrics(
        int $userId,
        bool $isSuperAdmin
    ): array {
        if (!Schema::hasTable('workflows')) {
            return ['active' => 0, 'total' => 0];
        }

        $query = DB::table('workflows');

        if (!$isSuperAdmin) {
            if (!Schema::hasColumn('workflows', 'user_id')) {
                return ['active' => 0, 'total' => 0];
            }
            $query->where('user_id', $userId);
        }

        $hasStatus = Schema::hasColumn('workflows', 'status');
        $activeExpr = $hasStatus
            ? "SUM(CASE WHEN status IN ('published', 'active') THEN 1 ELSE 0 END)"
            : 'COUNT(*)';

        $row = $query
            ->selectRaw("COUNT(*) as total_count, {$activeExpr} as active_count")
            ->first();

        return [
            'active' => (int) ($row->active_count ?? 0),
            'total' => (int) ($row->total_count ?? 0),
        ];
    }

    private function getConversationMetrics(
        int $userId,
        bool $isSuperAdmin
    ): array {
        $empty = [
            'total_conversations' => 0,
            'active_conversations' => 0,
            'completed_conversations' => 0,
            'unique_customers' => 0,
        ];

        if (!Schema::hasTable('bot_sessions')) {
            return $empty;
        }

        $query = DB::table('bot_sessions as s');

        if (!$isSuperAdmin) {
            if (
                !Schema::hasColumn('bot_sessions', 'workflow_id')
                || !Schema::hasTable('workflows')
                || !Schema::hasColumn('workflows', 'user_id')
            ) {
                return $empty;
            }

            $query->join('workflows as w', 'w.id', '=', 's.workflow_id')
                ->where('w.user_id', $userId);
        }

        $hasStatus = Schema::hasColumn('bot_sessions', 'status');
        $hasIdentifier = Schema::hasColumn('bot_sessions', 'user_identifier');

        $activeExpr = $hasStatus
            ? "SUM(CASE WHEN s.status IN ('active', 'waiting') THEN 1 ELSE 0 END)"
            : '0';
        $completedExpr = $hasStatus
            ? "SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END)"
            : '0';
        $uniqueExpr = $hasIdentifier
            ? 'COUNT(DISTINCT s.user_identifier)'
            : '0';

        $row = $query
            ->selectRaw("COUNT(*) as total_conversations, {$activeExpr} as active_conversations, {$completedExpr} as completed_conversations, {$uniqueExpr} as unique_customers")
            ->first();

        return [
            'total_conversations' => (int) ($row->total_conversations ?? 0),
            'active_conversations' => (int) ($row->active_conversations ?? 0),
            'completed_conversations' => (int) ($row->completed_conversations ?? 0),
            'unique_customers' => (int) ($row->unique_customers ?? 0),
        ];
    }

    private function getMessageWindowMetrics(
        int $userId,
        bool $isSuperAdmin,
        Carbon $today,
        Carbon $thirtyDaysStart,
        Carbon $monthStart,
        Carbon $now
    ): array {
        $empty = ['today' => 0, 'days_30' => 0, 'month' => 0];

        if (
            !Schema::hasTable('bot_messages')
            || !Schema::hasColumn('bot_messages', 'created_at')
        ) {
            return $empty;
        }

        $query = DB::table('bot_messages as m');

        if (!$isSuperAdmin) {
            if (
                !Schema::hasColumn('bot_messages', 'bot_session_id')
                || !Schema::hasTable('bot_sessions')
                || !Schema::hasColumn('bot_sessions', 'workflow_id')
                || !Schema::hasTable('workflows')
                || !Schema::hasColumn('workflows', 'user_id')
            ) {
                return $empty;
            }

            $query->join('bot_sessions as s', 's.id', '=', 'm.bot_session_id')
                ->join('workflows as w', 'w.id', '=', 's.workflow_id')
                ->where('w.user_id', $userId);
        }

        $earliest = $monthStart->lt($thirtyDaysStart) ? $monthStart : $thirtyDaysStart;
        if ($today->lt($earliest)) {
            $earliest = $today;
        }

        $row = $query
            ->where('m.created_at', '>=', $earliest)
            ->where('m.created_at', '<=', $now)
            ->selectRaw(
                'SUM(CASE WHEN m.created_at >= ? THEN 1 ELSE 0 END) as today_count, '
                . 'SUM(CASE WHEN m.created_at >= ? THEN 1 ELSE 0 END) as days30_count, '
                . 'SUM(CASE WHEN m.created_at >= ? THEN 1 ELSE 0 END) as month_count',
                [$today, $thirtyDaysStart, $monthStart]
            )
            ->first();

        return [
            'today' => (int) ($row->today_count ?? 0),
            'days_30' => (int) ($row->days30_count ?? 0),
            'month' => (int) ($row->month_count ?? 0),
        ];
    }

    private function getExecutionCountMetrics(
        int $userId,
        bool $isSuperAdmin,
        Carbon $from,
        Carbon $now
    ): array {
        $empty = ['total' => 0, 'success' => 0, 'failed' => 0];

        if (
            !Schema::hasTable('workflow_executions')
            || !Schema::hasColumn('workflow_executions', 'created_at')
        ) {
            return $empty;
        }

        $query = DB::table('workflow_executions as we');

        if (!$isSuperAdmin) {
            if (
                !Schema::hasColumn('workflow_executions', 'workflow_id')
                || !Schema::hasTable('workflows')
                || !Schema::hasColumn('workflows', 'user_id')
            ) {
                return $empty;
            }

            $query->join('workflows as w', 'w.id', '=', 'we.workflow_id')
                ->where('w.user_id', $userId);
        }

        $hasStatus = Schema::hasColumn('workflow_executions', 'status');
        $successExpr = $hasStatus
            ? "SUM(CASE WHEN we.status IN ('success', 'completed', 'successful') THEN 1 ELSE 0 END)"
            : '0';
        $failedExpr = $hasStatus
            ? "SUM(CASE WHEN we.status IN ('failed', 'failure', 'error') THEN 1 ELSE 0 END)"
            : '0';

        $row = $query
            ->where('we.created_at', '>=', $from)
            ->where('we.created_at', '<=', $now)
            ->selectRaw("COUNT(*) as total_count, {$successExpr} as success_count, {$failedExpr} as failed_count")
            ->first();

        return [
            'total' => (int) ($row->total_count ?? 0),
            'success' => (int) ($row->success_count ?? 0),
            'failed' => (int) ($row->failed_count ?? 0),
        ];
    }

    private function getMonthlyQuotaMetrics(
        User $user,
        bool $isSuperAdmin,
        int $monthlyMessages
    ): array {
        if (!$isSuperAdmin) {
            $summary = app(WalletService::class)->getWalletSummary($user);
            $walletBalance = (float) ($summary['balance'] ?? 0);
            $rate = (float) ($summary['message_rate'] ?? 0.50);
            $remaining = (int) ($summary['estimated_messages'] ?? 0);
            $hasQuota = $remaining > 0 || $walletBalance > 0;
            $limit = $hasQuota ? ($monthlyMessages + $remaining) : 0;
            $percentage = $limit > 0
                ? min(100, round(($monthlyMessages / $limit) * 100, 1))
                : 0.0;

            return [
                'used' => $monthlyMessages,
                'limit' => $limit,
                'remaining' => $remaining,
                'percentage' => $percentage,
                'has_quota' => $hasQuota,
                'has_active_plan' => (bool) ($summary['has_active_plan'] ?? false),
                'active_plan_name' => $summary['active_plan_name'] ?? null,
                'wallet_balance' => round($walletBalance, 2),
                'message_rate' => $rate,
            ];
        }

        if (!Schema::hasTable('wallets')) {
            return [
                'used' => $monthlyMessages,
                'limit' => 0,
                'remaining' => 0,
                'percentage' => 0.0,
                'has_quota' => false,
                'has_active_plan' => false,
                'active_plan_name' => null,
                'wallet_balance' => 0.0,
                'message_rate' => 0.50,
            ];
        }

        $query = DB::table('wallets')
            ->join('users', 'users.id', '=', 'wallets.user_id')
            ->where(function ($q) {
                $q->whereNull('users.role')
                    ->orWhereRaw('LOWER(users.role) != ?', ['super_admin']);
            });

        $hasRatesTable = Schema::hasTable('user_message_rates');
        if ($hasRatesTable) {
            $query->leftJoin('user_message_rates', 'user_message_rates.user_id', '=', 'wallets.user_id');
        }

        $rows = $query->get([
            'wallets.balance',
            $hasRatesTable
                ? 'user_message_rates.rate_per_message'
                : DB::raw('0.50 as rate_per_message'),
        ]);

        $totalWalletBalance = 0.0;
        $totalRemainingMessages = 0;

        foreach ($rows as $row) {
            $bal = max(0.0, (float) ($row->balance ?? 0));
            $rate = (float) ($row->rate_per_message ?? 0.50);
            if ($rate <= 0) {
                $rate = 0.50;
            }
            $totalWalletBalance += $bal;
            if ($bal > 0) {
                $totalRemainingMessages += (int) floor($bal / $rate);
            }
        }

        $totalWalletBalance = round($totalWalletBalance, 2);
        $hasQuota = $totalRemainingMessages > 0 || $totalWalletBalance > 0;
        $limit = $hasQuota ? ($monthlyMessages + $totalRemainingMessages) : 0;
        $percentage = $limit > 0
            ? min(100, round(($monthlyMessages / $limit) * 100, 1))
            : 0.0;

        return [
            'used' => $monthlyMessages,
            'limit' => $limit,
            'remaining' => $totalRemainingMessages,
            'percentage' => $percentage,
            'has_quota' => $hasQuota,
            'has_active_plan' => $hasQuota,
            'active_plan_name' => null,
            'wallet_balance' => $totalWalletBalance,
            'message_rate' => 0.50,
        ];
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

    private function countTotalBots(int $userId, bool $isSuperAdmin): int
    {
        if (!Schema::hasTable('bots')) {
            return 0;
        }

        $query = DB::table('bots');
        if (!$isSuperAdmin && Schema::hasColumn('bots', 'user_id')) {
            $query->where('user_id', $userId);
        }

        return $query->count();
    }

    private function scopedSessionQuery(int $userId, bool $isSuperAdmin, ?int $workflowId = null)
    {
        $query = DB::table('bot_sessions');

        if (!$isSuperAdmin) {
            $query->whereIn(
                'bot_sessions.workflow_id',
                $this->workflowIds($userId, false)
            );
        }

        if ($workflowId !== null) {
            $query->where('bot_sessions.workflow_id', $workflowId);
        }

        return $query;
    }

    /**
     * Build 30-day daily message and conversation hits series.
     */
    private function getDailyHits30d(int $userId, bool $isSuperAdmin, ?int $workflowId = null): array
    {
        if (
            !Schema::hasTable('bot_messages')
            || !Schema::hasTable('bot_sessions')
            || !Schema::hasColumn('bot_messages', 'created_at')
        ) {
            return [];
        }

        $start = now()->subDays(29)->startOfDay();
        $end = now()->endOfDay();

        $sessionSubquery = $this->scopedSessionQuery($userId, $isSuperAdmin, $workflowId)
            ->select('id');

        $messageCounts = DB::table('bot_messages')
            ->whereIn('bot_session_id', $sessionSubquery)
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('DATE(created_at) as day_key, COUNT(*) as messages_count, COUNT(DISTINCT bot_session_id) as sessions_count')
            ->groupByRaw('DATE(created_at)')
            ->get()
            ->keyBy('day_key');

        $series = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $key = $date->toDateString();
            $row = $messageCounts->get($key);
            $messages = (int) ($row->messages_count ?? 0);
            $sessions = (int) ($row->sessions_count ?? 0);

            $series[] = [
                'date' => $key,
                'label' => $date->format('d M'),
                'short_label' => $date->format('d/m'),
                'hits' => $messages,
                'messages' => $messages,
                'sessions' => $sessions,
            ];
        }

        return $series;
    }

    /**
     * Build 30-day breakdown by workflow and by session status for the donut chart.
     */
    private function getWorkflowBreakdown30d(int $userId, bool $isSuperAdmin): array
    {
        if (!Schema::hasTable('bot_sessions') || !Schema::hasTable('workflows')) {
            return ['total' => 0, 'by_workflow' => [], 'by_status' => []];
        }

        $start = now()->subDays(29)->startOfDay();

        $baseQuery = DB::table('bot_sessions as s')
            ->join('workflows as w', 'w.id', '=', 's.workflow_id')
            ->where(function ($q) use ($start) {
                $q->where('s.last_message_at', '>=', $start)
                    ->orWhere(function ($sq) use ($start) {
                        $sq->whereNull('s.last_message_at')
                            ->where('s.created_at', '>=', $start);
                    });
            });

        if (!$isSuperAdmin && Schema::hasColumn('workflows', 'user_id')) {
            $baseQuery->where('w.user_id', $userId);
        }

        $workflowRows = (clone $baseQuery)
            ->selectRaw('w.id, w.name, COUNT(*) as sessions_count')
            ->groupBy('w.id', 'w.name')
            ->orderByDesc('sessions_count')
            ->limit(6)
            ->get();

        $totalSessions = (int) (clone $baseQuery)->count();

        $byWorkflow = $workflowRows->map(function ($row) use ($totalSessions) {
            $count = (int) $row->sessions_count;
            return [
                'id' => (int) $row->id,
                'name' => $row->name,
                'count' => $count,
                'percentage' => $totalSessions > 0
                    ? round(($count / $totalSessions) * 100, 1)
                    : 0,
            ];
        })->values()->all();

        $statusRows = (clone $baseQuery)
            ->selectRaw('s.status, COUNT(*) as total')
            ->groupBy('s.status')
            ->pluck('total', 'status');

        $statusMap = [
            'completed' => 'Completed',
            'active' => 'Active',
            'waiting' => 'Waiting',
            'dropped' => 'Dropped',
            'error' => 'Error',
        ];

        $byStatus = [];
        foreach ($statusMap as $key => $label) {
            $count = (int) ($statusRows[$key] ?? 0);
            if ($count === 0 && $totalSessions > 0 && in_array($key, ['dropped', 'error'], true)) {
                continue;
            }
            $byStatus[] = [
                'key' => $key,
                'name' => $label,
                'count' => $count,
                'percentage' => $totalSessions > 0
                    ? round(($count / $totalSessions) * 100, 1)
                    : 0,
            ];
        }

        return [
            'total' => $totalSessions,
            'by_workflow' => $byWorkflow,
            'by_status' => $byStatus,
        ];
    }

    /**
     * Build 30-day ranked summary of workflows & their start trigger keywords.
     */
    private function getWorkflowTriggersSummary30d(int $userId, bool $isSuperAdmin): array
    {
        if (!Schema::hasTable('workflows')) {
            return [];
        }

        $start = now()->subDays(29)->startOfDay();

        $workflowsQuery = DB::table('workflows')
            ->where('channel', 'whatsapp')
            ->select('id', 'name', 'status');

        if (!$isSuperAdmin && Schema::hasColumn('workflows', 'user_id')) {
            $workflowsQuery->where('user_id', $userId);
        }

        $workflows = $workflowsQuery->get();
        if ($workflows->isEmpty()) {
            return [];
        }

        $wfIds = $workflows->pluck('id')->all();

        $startNodes = Schema::hasTable('workflow_nodes')
            ? DB::table('workflow_nodes')
                ->whereIn('workflow_id', $wfIds)
                ->where('node_type', 'start')
                ->get(['workflow_id', 'configuration'])
                ->keyBy('workflow_id')
            : collect();

        $sessionCounts = Schema::hasTable('bot_sessions')
            ? DB::table('bot_sessions')
                ->whereIn('workflow_id', $wfIds)
                ->where(function ($q) use ($start) {
                    $q->where('last_message_at', '>=', $start)
                        ->orWhere(function ($sq) use ($start) {
                            $sq->whereNull('last_message_at')
                                ->where('created_at', '>=', $start);
                        });
                })
                ->selectRaw('workflow_id, COUNT(*) as total')
                ->groupBy('workflow_id')
                ->pluck('total', 'workflow_id')
            : collect();

        $messageCounts = (Schema::hasTable('bot_messages') && Schema::hasTable('bot_sessions'))
            ? DB::table('bot_messages as m')
                ->join('bot_sessions as s', 's.id', '=', 'm.bot_session_id')
                ->whereIn('s.workflow_id', $wfIds)
                ->where('m.created_at', '>=', $start)
                ->selectRaw('s.workflow_id, COUNT(*) as total')
                ->groupBy('s.workflow_id')
                ->pluck('total', 'workflow_id')
            : collect();

        return $workflows->map(function ($wf) use ($startNodes, $sessionCounts, $messageCounts) {
            $node = $startNodes->get($wf->id);
            $cfg = $node?->configuration ?? [];
            if (is_string($cfg)) {
                $cfg = json_decode($cfg, true) ?? [];
            }
            $trigger = is_array($cfg)
                ? trim((string) ($cfg['triggerText'] ?? $cfg['trigger'] ?? $cfg['keyword'] ?? ''))
                : '';

            $sessions = (int) ($sessionCounts[$wf->id] ?? 0);
            $messages = (int) ($messageCounts[$wf->id] ?? 0);

            return [
                'workflow_id' => (int) $wf->id,
                'name' => $wf->name,
                'trigger' => $trigger,
                'status' => $wf->status,
                'sessions_count' => $sessions,
                'messages_count' => $messages,
                'hits' => $messages > 0 ? $messages : $sessions,
            ];
        })
            ->sortByDesc('hits')
            ->take(10)
            ->values()
            ->all();
    }

    /**
     * Build account-wise bots and workflows explorer data for Dashboard drill-down.
     */
    private function getAccountsOverview(int $userId, bool $isSuperAdmin): array
    {
        if (!Schema::hasTable('whatsapp_accounts')) {
            return [];
        }

        $accountsQuery = DB::table('whatsapp_accounts as a')
            ->leftJoin('users as u', 'u.id', '=', 'a.user_id')
            ->select([
                'a.id',
                'a.user_id',
                'a.name',
                'a.business_name',
                'a.waba_id',
                'a.sender_name',
                'a.status',
                'u.name as owner_name',
                'u.email as owner_email',
            ])
            ->orderByDesc('a.id');

        if (!$isSuperAdmin && Schema::hasColumn('whatsapp_accounts', 'user_id')) {
            $accountsQuery->where('a.user_id', $userId);
        }

        $accounts = $accountsQuery->get();
        if ($accounts->isEmpty()) {
            return [];
        }

        $accountIds = $accounts->pluck('id')->all();
        $ownerIds = $accounts->pluck('user_id')->filter()->unique()->values()->all();

        $bots = Schema::hasTable('bots')
            ? DB::table('bots')
                ->whereIn('whatsapp_account_id', $accountIds)
                ->when(!$isSuperAdmin && Schema::hasColumn('bots', 'user_id'), fn ($q) => $q->where('user_id', $userId))
                ->orderBy('id')
                ->get(['id', 'user_id', 'whatsapp_account_id', 'name', 'description', 'status'])
            : collect();

        $botIds = $bots->pluck('id')->all();

        $workflows = Schema::hasTable('workflows')
            ? DB::table('workflows')
                ->where(function ($q) use ($accountIds, $botIds) {
                    $q->whereIn('whatsapp_account_id', $accountIds);
                    if (!empty($botIds)) {
                        $q->orWhereIn('bot_id', $botIds);
                    }
                })
                ->when(!$isSuperAdmin && Schema::hasColumn('workflows', 'user_id'), fn ($q) => $q->where('user_id', $userId))
                ->orderBy('id')
                ->get(['id', 'user_id', 'whatsapp_account_id', 'bot_id', 'name', 'channel', 'status'])
            : collect();

        $workflowIds = $workflows->pluck('id')->all();

        $startNodes = (Schema::hasTable('workflow_nodes') && !empty($workflowIds))
            ? DB::table('workflow_nodes')
                ->whereIn('workflow_id', $workflowIds)
                ->where('node_type', 'start')
                ->get(['workflow_id', 'configuration'])
                ->keyBy('workflow_id')
            : collect();

        $sessionCountsByWorkflow = (Schema::hasTable('bot_sessions') && !empty($workflowIds))
            ? DB::table('bot_sessions')
                ->whereIn('workflow_id', $workflowIds)
                ->selectRaw('workflow_id, COUNT(*) as total')
                ->groupBy('workflow_id')
                ->pluck('total', 'workflow_id')
            : collect();

        $businessNames = (!empty($ownerIds) && Schema::hasTable('business_profiles'))
            ? DB::table('business_profiles')
                ->whereIn('user_id', $ownerIds)
                ->pluck('business_name', 'user_id')
            : collect();

        $botsByAccount = $bots->groupBy('whatsapp_account_id');
        $botsById = $bots->keyBy('id');

        return $accounts->map(function ($account) use (
            $botsByAccount,
            $botsById,
            $workflows,
            $startNodes,
            $sessionCountsByWorkflow,
            $businessNames
        ) {
            $accountBots = ($botsByAccount->get($account->id) ?? collect())->values();
            $accountBotIds = $accountBots->pluck('id')->all();

            $accountWorkflows = $workflows->filter(function ($wf) use ($account, $accountBotIds) {
                if ((int) ($wf->whatsapp_account_id ?? 0) === (int) $account->id) {
                    return true;
                }
                return $wf->whatsapp_account_id === null
                    && $wf->bot_id !== null
                    && in_array((int) $wf->bot_id, $accountBotIds, true);
            })->values();

            $workflowCountByBot = $accountWorkflows
                ->filter(fn ($wf) => !empty($wf->bot_id))
                ->groupBy('bot_id')
                ->map(fn ($group) => $group->count());

            $formattedBots = $accountBots->map(function ($bot, $index) use ($workflowCountByBot) {
                return [
                    'number' => $index + 1,
                    'id' => (int) $bot->id,
                    'name' => $bot->name,
                    'description' => $bot->description,
                    'status' => $bot->status,
                    'workflows_count' => (int) ($workflowCountByBot[$bot->id] ?? 0),
                ];
            })->values()->all();

            $totalSessions = 0;
            $formattedWorkflows = $accountWorkflows->map(function ($wf, $index) use (
                $botsById,
                $startNodes,
                $sessionCountsByWorkflow,
                &$totalSessions
            ) {
                $bot = $wf->bot_id ? $botsById->get($wf->bot_id) : null;
                $startNode = $startNodes->get($wf->id);
                $cfg = $startNode?->configuration ?? [];
                if (is_string($cfg)) {
                    $cfg = json_decode($cfg, true) ?? [];
                }
                $trigger = is_array($cfg)
                    ? trim((string) ($cfg['triggerText'] ?? $cfg['trigger'] ?? $cfg['keyword'] ?? ''))
                    : '';

                $sessions = (int) ($sessionCountsByWorkflow[$wf->id] ?? 0);
                $totalSessions += $sessions;

                return [
                    'number' => $index + 1,
                    'id' => (int) $wf->id,
                    'bot_id' => $wf->bot_id ? (int) $wf->bot_id : null,
                    'bot_name' => $bot?->name,
                    'name' => $wf->name,
                    'channel' => $wf->channel ?? 'whatsapp',
                    'status' => $wf->status ?? 'draft',
                    'trigger_keyword' => $trigger,
                    'sessions_count' => $sessions,
                ];
            })->values()->all();

            $displayBusiness = $account->business_name
                ?: ($businessNames->get($account->user_id) ?? null);

            return [
                'id' => (int) $account->id,
                'user_id' => (int) $account->user_id,
                'owner_name' => $account->owner_name,
                'owner_email' => $account->owner_email,
                'name' => $displayBusiness ?: $account->name,
                'account_name' => $account->name,
                'business_name' => $displayBusiness,
                'waba_id' => $account->waba_id,
                'sender_name' => $account->sender_name,
                'status' => $account->status,
                'bots_count' => count($formattedBots),
                'workflows_count' => count($formattedWorkflows),
                'sessions_count' => $totalSessions,
                'bots' => $formattedBots,
                'workflows' => $formattedWorkflows,
            ];
        })->values()->all();
    }
}
