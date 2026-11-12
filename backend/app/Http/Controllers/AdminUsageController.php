<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminUsageController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $isSuperAdmin = $user->isSuperAdmin();

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'search' => ['nullable', 'string', 'max:150'],

            // Backward compatibility only. Normal users cannot select another user.
            'tenant_id' => ['nullable', 'integer'],
        ]);

        $from = Carbon::parse(
            $validated['from'] ?? now()->subDays(29)->toDateString()
        )->startOfDay();

        $to = Carbon::parse(
            $validated['to'] ?? now()->toDateString()
        )->endOfDay();

        /*
        |--------------------------------------------------------------------------
        | Users (direct query, zero model hydration)
        |--------------------------------------------------------------------------
        */

        $usersQuery = DB::table('users');

        if (!$isSuperAdmin) {
            $usersQuery->where('id', $user->id);
        }

        if ($isSuperAdmin && !empty($validated['tenant_id'])) {
            $usersQuery->where('id', (int) $validated['tenant_id']);
        }

        $search = trim($validated['search'] ?? '');

        if ($isSuperAdmin && $search !== '') {
            $hasEmail = Schema::hasColumn('users', 'email');
            $usersQuery->where(function ($query) use ($search, $hasEmail) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('id', 'like', "%{$search}%");

                if ($hasEmail) {
                    $query->orWhere('email', 'like', "%{$search}%");
                }
            });
        }

        $users = $usersQuery
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        $usage = [];

        foreach ($users as $client) {
            $id = (int) $client->id;

            $usage[$id] = [
                'tenant_id' => $id,
                'client_id' => $id,
                'user_id' => $id,
                'client_name' => $client->name,
                'business_name' => $client->name,

                'total_workflows' => 0,
                'total_sessions' => 0,
                'active_sessions' => 0,

                'messages' => 0,
                'inbound_messages' => 0,
                'outbound_messages' => 0,

                'sent' => 0,
                'delivered' => 0,
                'failed' => 0,

                'messages_sent' => 0,
                'messages_delivered' => 0,
                'messages_failed' => 0,

                'workflow_executions' => 0,
                'execution_records' => 0,
                'successful_executions' => 0,
                'failed_executions' => 0,
                'running_executions' => 0,
                'api_requests' => 0,
                'last_activity' => null,
            ];
        }

        $ownerIds = array_keys($usage);

        if (!empty($ownerIds)) {
            $workflowOwnerCol = $this->aggregateWorkflowsUsage($usage, $ownerIds);
            $this->aggregateSessionsUsage($usage, $ownerIds, $from, $to, $workflowOwnerCol);
            $this->aggregateExecutionUsage($usage, $ownerIds, $from, $to, $workflowOwnerCol);
            $this->aggregateMessageUsage($usage, $ownerIds, $from, $to, $workflowOwnerCol);
        }

        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

        $usage = array_values($usage);

        foreach ($usage as &$row) {
            $row['messages_sent'] = $row['sent'];
            $row['messages_delivered'] = $row['delivered'];
            $row['messages_failed'] = $row['failed'];
        }
        unset($row);

        $sum = static function (array $rows, string $key): int {
            return (int) array_sum(array_column($rows, $key));
        };

        $stats = [
            'total_clients' => count($usage),
            'active_clients' => count($usage),

            'total_workflows' => $sum($usage, 'total_workflows'),
            'total_sessions' => $sum($usage, 'total_sessions'),
            'active_sessions' => $sum($usage, 'active_sessions'),

            'messages' => $sum($usage, 'messages'),
            'inbound_messages' => $sum($usage, 'inbound_messages'),
            'outbound_messages' => $sum($usage, 'outbound_messages'),

            'sent' => $sum($usage, 'sent'),
            'delivered' => $sum($usage, 'delivered'),
            'failed' => $sum($usage, 'failed'),

            'messages_sent' => $sum($usage, 'sent'),
            'messages_delivered' => $sum($usage, 'delivered'),
            'messages_failed' => $sum($usage, 'failed'),

            'workflow_executions' => $sum($usage, 'workflow_executions'),
            'execution_records' => $sum($usage, 'execution_records'),
            'successful_executions' => $sum($usage, 'successful_executions'),
            'failed_executions' => $sum($usage, 'failed_executions'),
            'running_executions' => $sum($usage, 'running_executions'),
            'api_requests' => $sum($usage, 'api_requests'),
        ];

        return response()->json([
            'success' => true,
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'stats' => $stats,
            'data' => $usage,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SQL Aggregation Queries (zero full-table row loading into PHP)
    |--------------------------------------------------------------------------
    */

    private function aggregateWorkflowsUsage(array &$usage, array $ownerIds): ?string
    {
        if (!Schema::hasTable('workflows')) {
            return null;
        }

        $columns = Schema::getColumnListing('workflows');
        $ownerColumn = $this->firstColumn($columns, ['user_id', 'created_by']);

        if (!$ownerColumn) {
            return null;
        }

        $selectRaw = ["{$ownerColumn} as owner_id", 'COUNT(*) as total_workflows'];
        if (in_array('created_at', $columns, true) && in_array('updated_at', $columns, true)) {
            $selectRaw[] = 'GREATEST(COALESCE(MAX(created_at), "1970-01-01 00:00:00"), COALESCE(MAX(updated_at), "1970-01-01 00:00:00")) as max_activity';
        } elseif (in_array('created_at', $columns, true)) {
            $selectRaw[] = 'MAX(created_at) as max_activity';
        }

        $rows = DB::table('workflows')
            ->whereIn($ownerColumn, $ownerIds)
            ->groupBy($ownerColumn)
            ->selectRaw(implode(', ', $selectRaw))
            ->get();

        foreach ($rows as $row) {
            $ownerId = (int) $row->owner_id;
            if (!isset($usage[$ownerId])) {
                continue;
            }

            $usage[$ownerId]['total_workflows'] = (int) $row->total_workflows;
            if (!empty($row->max_activity) && $row->max_activity !== '1970-01-01 00:00:00') {
                $this->updateActivity($usage[$ownerId], $row->max_activity);
            }
        }

        return $ownerColumn;
    }

    private function aggregateSessionsUsage(
        array &$usage,
        array $ownerIds,
        Carbon $from,
        Carbon $to,
        ?string $workflowOwnerCol
    ): void {
        if (!Schema::hasTable('bot_sessions') || !Schema::hasColumn('bot_sessions', 'created_at')) {
            return;
        }

        $columns = Schema::getColumnListing('bot_sessions');
        $hasUserId = in_array('user_id', $columns, true);
        $hasWorkflowId = in_array('workflow_id', $columns, true) && $workflowOwnerCol !== null;
        $hasStatus = in_array('status', $columns, true);

        if (!$hasUserId && !$hasWorkflowId) {
            return;
        }

        $query = DB::table('bot_sessions as bs')
            ->whereBetween('bs.created_at', [$from, $to]);

        if ($hasWorkflowId) {
            $query->leftJoin('workflows as sw', 'sw.id', '=', 'bs.workflow_id');
        }

        $ownerExpr = $this->buildSessionOwnerExpr($hasUserId, $hasWorkflowId, $workflowOwnerCol);
        $this->applyScopedOwnerPreFilter($query, $ownerIds, 'bs', $hasUserId, false, $hasWorkflowId, $workflowOwnerCol);

        $inner = $query->selectRaw("{$ownerExpr} as resolved_owner, bs.created_at" . ($hasStatus ? ', bs.status' : ", '' as status"));

        $rows = DB::query()
            ->fromSub($inner, 's')
            ->whereNotNull('s.resolved_owner')
            ->where('s.resolved_owner', '>', 0)
            ->selectRaw('s.resolved_owner')
            ->selectRaw('COUNT(*) as total_sessions')
            ->selectRaw("SUM(CASE WHEN LOWER(COALESCE(s.status, '')) IN ('active', 'waiting') THEN 1 ELSE 0 END) as active_sessions")
            ->selectRaw('MAX(s.created_at) as max_activity')
            ->groupBy('s.resolved_owner')
            ->get();

        foreach ($rows as $row) {
            $ownerId = (int) $row->resolved_owner;
            if (!isset($usage[$ownerId])) {
                continue;
            }

            $usage[$ownerId]['total_sessions'] = (int) $row->total_sessions;
            $usage[$ownerId]['active_sessions'] = (int) $row->active_sessions;
            $this->updateActivity($usage[$ownerId], $row->max_activity ?? null);
        }
    }

    private function aggregateExecutionUsage(
        array &$usage,
        array $ownerIds,
        Carbon $from,
        Carbon $to,
        ?string $workflowOwnerCol
    ): void {
        if (!Schema::hasTable('workflow_executions') || !Schema::hasColumn('workflow_executions', 'created_at')) {
            return;
        }

        $columns = Schema::getColumnListing('workflow_executions');
        $statusCol = $this->firstColumn($columns, ['status', 'execution_status']);
        $nodeCol = $this->firstColumn($columns, ['node_type', 'type']);
        $sessionCol = $this->firstColumn($columns, ['bot_session_id', 'session_id']);
        $hasEventWorkflow = in_array('workflow_id', $columns, true) && $workflowOwnerCol !== null;
        $hasEventUser = in_array('user_id', $columns, true);

        $sessionCols = Schema::hasTable('bot_sessions') ? Schema::getColumnListing('bot_sessions') : [];
        $sessionHasUser = in_array('user_id', $sessionCols, true);
        $sessionHasWorkflow = in_array('workflow_id', $sessionCols, true) && $workflowOwnerCol !== null;
        $hasSessionJoin = $sessionCol !== null && !empty($sessionCols);

        $ownerExpr = $this->buildEventOwnerExpr(
            'we',
            $hasEventUser,
            $hasEventWorkflow,
            $hasSessionJoin,
            $sessionHasUser,
            $sessionHasWorkflow,
            $workflowOwnerCol
        );

        $base = DB::table('workflow_executions as we')
            ->whereBetween('we.created_at', [$from, $to]);

        if ($hasEventWorkflow) {
            $base->leftJoin('workflows as ew', 'ew.id', '=', 'we.workflow_id');
        }
        if ($hasSessionJoin) {
            $base->leftJoin('bot_sessions as bs', 'bs.id', '=', "we.{$sessionCol}");
            if ($sessionHasWorkflow) {
                $base->leftJoin('workflows as sw', 'sw.id', '=', 'bs.workflow_id');
            }
        }

        $this->applyScopedOwnerPreFilter(
            $base,
            $ownerIds,
            'we',
            $hasEventUser,
            $hasEventWorkflow,
            $hasSessionJoin && $sessionHasWorkflow,
            $workflowOwnerCol,
            $hasSessionJoin && $sessionHasUser
        );

        $statusColSelect = $statusCol ? "LOWER(COALESCE(we.{$statusCol}, ''))" : "''";
        $nodeColSelect = $nodeCol ? "LOWER(COALESCE(we.{$nodeCol}, ''))" : "''";
        $sessionColSelect = $sessionCol !== null ? "we.{$sessionCol}" : 'NULL';

        $inner = (clone $base)
            ->selectRaw("{$ownerExpr} as resolved_owner")
            ->selectRaw('we.id as event_id')
            ->selectRaw('we.created_at as event_created_at')
            ->selectRaw("{$statusColSelect} as event_status")
            ->selectRaw("{$nodeColSelect} as event_node_type")
            ->selectRaw("{$sessionColSelect} as event_session_id");

        $rows = DB::query()
            ->fromSub($inner, 'e')
            ->whereNotNull('e.resolved_owner')
            ->where('e.resolved_owner', '>', 0)
            ->selectRaw('e.resolved_owner')
            ->selectRaw('COUNT(*) as execution_records')
            ->selectRaw("SUM(CASE WHEN e.event_status = 'success' THEN 1 ELSE 0 END) as successful_executions")
            ->selectRaw("SUM(CASE WHEN e.event_status = 'failed' THEN 1 ELSE 0 END) as failed_executions")
            ->selectRaw("SUM(CASE WHEN e.event_status = 'running' THEN 1 ELSE 0 END) as running_executions")
            ->selectRaw("SUM(CASE WHEN e.event_node_type = 'api' THEN 1 ELSE 0 END) as api_requests")
            ->selectRaw('COUNT(DISTINCT CASE WHEN e.event_session_id IS NOT NULL THEN e.event_session_id END) as workflow_executions')
            ->selectRaw('MAX(e.event_created_at) as max_activity')
            ->groupBy('e.resolved_owner')
            ->get();

        foreach ($rows as $row) {
            $ownerId = (int) $row->resolved_owner;
            if (!isset($usage[$ownerId])) {
                continue;
            }

            $usage[$ownerId]['execution_records'] = (int) $row->execution_records;
            $usage[$ownerId]['successful_executions'] = (int) $row->successful_executions;
            $usage[$ownerId]['failed_executions'] = (int) $row->failed_executions;
            $usage[$ownerId]['running_executions'] = (int) $row->running_executions;
            $usage[$ownerId]['api_requests'] = (int) $row->api_requests;
            $usage[$ownerId]['workflow_executions'] = (int) $row->workflow_executions;
            $this->updateActivity($usage[$ownerId], $row->max_activity ?? null);
        }

        if ($sessionCol !== null && $statusCol !== null) {
            $latestPerSession = DB::query()
                ->fromSub($inner, 'e')
                ->whereNotNull('e.resolved_owner')
                ->where('e.resolved_owner', '>', 0)
                ->whereNotNull('e.event_session_id')
                ->selectRaw('e.resolved_owner')
                ->selectRaw('e.event_session_id as exec_session_id')
                ->selectRaw("SUBSTRING_INDEX(MAX(CONCAT(DATE_FORMAT(e.event_created_at, '%Y%m%d%H%i%s'), LPAD(e.event_id, 12, '0'), ':', e.event_status)), ':', -1) as latest_status")
                ->groupBy('e.resolved_owner', 'e.event_session_id');

            $bonusRows = DB::query()
                ->fromSub($latestPerSession, 'ls')
                ->selectRaw('ls.resolved_owner')
                ->selectRaw("SUM(CASE WHEN ls.latest_status = 'success' THEN 1 ELSE 0 END) as extra_success")
                ->selectRaw("SUM(CASE WHEN ls.latest_status = 'failed' THEN 1 ELSE 0 END) as extra_failed")
                ->groupBy('ls.resolved_owner')
                ->get();

            foreach ($bonusRows as $row) {
                $ownerId = (int) $row->resolved_owner;
                if (!isset($usage[$ownerId])) {
                    continue;
                }
                $usage[$ownerId]['successful_executions'] += (int) $row->extra_success;
                $usage[$ownerId]['failed_executions'] += (int) $row->extra_failed;
            }
        }
    }

    private function aggregateMessageUsage(
        array &$usage,
        array $ownerIds,
        Carbon $from,
        Carbon $to,
        ?string $workflowOwnerCol
    ): void {
        if (!Schema::hasTable('bot_messages') || !Schema::hasColumn('bot_messages', 'created_at')) {
            return;
        }

        $columns = Schema::getColumnListing('bot_messages');
        $directionCol = $this->firstColumn($columns, ['direction', 'message_direction']);
        $statusCol = $this->firstColumn($columns, ['status', 'delivery_status']);
        $sessionCol = $this->firstColumn($columns, ['bot_session_id', 'session_id']);
        $hasEventWorkflow = in_array('workflow_id', $columns, true) && $workflowOwnerCol !== null;
        $hasEventUser = in_array('user_id', $columns, true);

        $sessionCols = Schema::hasTable('bot_sessions') ? Schema::getColumnListing('bot_sessions') : [];
        $sessionHasUser = in_array('user_id', $sessionCols, true);
        $sessionHasWorkflow = in_array('workflow_id', $sessionCols, true) && $workflowOwnerCol !== null;
        $hasSessionJoin = $sessionCol !== null && !empty($sessionCols);

        $ownerExpr = $this->buildEventOwnerExpr(
            'bm',
            $hasEventUser,
            $hasEventWorkflow,
            $hasSessionJoin,
            $sessionHasUser,
            $sessionHasWorkflow,
            $workflowOwnerCol
        );

        $query = DB::table('bot_messages as bm')
            ->whereBetween('bm.created_at', [$from, $to]);

        if ($hasEventWorkflow) {
            $query->leftJoin('workflows as ew', 'ew.id', '=', 'bm.workflow_id');
        }
        if ($hasSessionJoin) {
            $query->leftJoin('bot_sessions as bs', 'bs.id', '=', "bm.{$sessionCol}");
            if ($sessionHasWorkflow) {
                $query->leftJoin('workflows as sw', 'sw.id', '=', 'bs.workflow_id');
            }
        }

        $this->applyScopedOwnerPreFilter(
            $query,
            $ownerIds,
            'bm',
            $hasEventUser,
            $hasEventWorkflow,
            $hasSessionJoin && $sessionHasWorkflow,
            $workflowOwnerCol,
            $hasSessionJoin && $sessionHasUser
        );

        $dirExpr = $directionCol ? "LOWER(COALESCE(bm.{$directionCol}, ''))" : "''";
        $stExpr = $statusCol ? "LOWER(COALESCE(bm.{$statusCol}, ''))" : "''";

        $inner = $query
            ->selectRaw("{$ownerExpr} as resolved_owner")
            ->selectRaw('bm.created_at as msg_created_at')
            ->selectRaw("{$dirExpr} as msg_direction")
            ->selectRaw("{$stExpr} as msg_status");

        $isOut = "m.msg_direction IN ('outbound', 'outgoing', 'sent', 'out')";

        $rows = DB::query()
            ->fromSub($inner, 'm')
            ->whereNotNull('m.resolved_owner')
            ->where('m.resolved_owner', '>', 0)
            ->selectRaw('m.resolved_owner')
            ->selectRaw('COUNT(*) as messages')
            ->selectRaw("SUM(CASE WHEN m.msg_direction IN ('inbound', 'incoming', 'in') THEN 1 ELSE 0 END) as inbound_messages")
            ->selectRaw("SUM(CASE WHEN {$isOut} THEN 1 ELSE 0 END) as outbound_messages")
            ->selectRaw("SUM(CASE WHEN {$isOut} AND m.msg_status IN ('delivered', 'read') THEN 1 ELSE 0 END) as delivered")
            ->selectRaw("SUM(CASE WHEN {$isOut} AND m.msg_status IN ('failed', 'failure', 'error') THEN 1 ELSE 0 END) as failed")
            ->selectRaw('MAX(m.msg_created_at) as max_activity')
            ->groupBy('m.resolved_owner')
            ->get();

        foreach ($rows as $row) {
            $ownerId = (int) $row->resolved_owner;
            if (!isset($usage[$ownerId])) {
                continue;
            }

            $outbound = (int) $row->outbound_messages;
            $usage[$ownerId]['messages'] = (int) $row->messages;
            $usage[$ownerId]['inbound_messages'] = (int) $row->inbound_messages;
            $usage[$ownerId]['outbound_messages'] = $outbound;
            $usage[$ownerId]['sent'] = $outbound;
            $usage[$ownerId]['delivered'] = (int) $row->delivered;
            $usage[$ownerId]['failed'] = (int) $row->failed;
            $this->updateActivity($usage[$ownerId], $row->max_activity ?? null);
        }
    }

    private function buildSessionOwnerExpr(
        bool $sessionHasUser,
        bool $sessionHasWorkflow,
        ?string $workflowOwnerCol
    ): string {
        if ($sessionHasWorkflow && $sessionHasUser && $workflowOwnerCol) {
            return "CASE WHEN bs.id IS NULL THEN NULL WHEN sw.id IS NOT NULL AND sw.{$workflowOwnerCol} > 0 THEN (CASE WHEN bs.user_id > 0 AND bs.user_id <> sw.{$workflowOwnerCol} THEN NULL ELSE sw.{$workflowOwnerCol} END) ELSE NULLIF(bs.user_id, 0) END";
        }
        if ($sessionHasWorkflow && $workflowOwnerCol) {
            return "CASE WHEN bs.id IS NULL THEN NULL ELSE NULLIF(sw.{$workflowOwnerCol}, 0) END";
        }
        if ($sessionHasUser) {
            return 'CASE WHEN bs.id IS NULL THEN NULL ELSE NULLIF(bs.user_id, 0) END';
        }

        return 'NULL';
    }

    private function buildEventOwnerExpr(
        string $alias,
        bool $hasEventUser,
        bool $hasEventWorkflow,
        bool $hasSessionJoin,
        bool $sessionHasUser,
        bool $sessionHasWorkflow,
        ?string $workflowOwnerCol
    ): string {
        $sessExpr = $hasSessionJoin
            ? $this->buildSessionOwnerExpr($sessionHasUser, $sessionHasWorkflow, $workflowOwnerCol)
            : 'NULL';

        $wfExpr = ($hasEventWorkflow && $workflowOwnerCol)
            ? "NULLIF(ew.{$workflowOwnerCol}, 0)"
            : 'NULL';

        $directExpr = $hasEventUser
            ? "NULLIF({$alias}.user_id, 0)"
            : 'NULL';

        if ($sessExpr === 'NULL' && $wfExpr === 'NULL') {
            return $directExpr;
        }
        if ($sessExpr === 'NULL') {
            return "COALESCE({$wfExpr}, {$directExpr})";
        }
        if ($wfExpr === 'NULL') {
            return "COALESCE({$sessExpr}, {$directExpr})";
        }

        return "CASE WHEN ({$sessExpr}) IS NOT NULL AND ({$wfExpr}) IS NOT NULL AND ({$sessExpr}) <> ({$wfExpr}) THEN NULL ELSE COALESCE(({$sessExpr}), ({$wfExpr}), {$directExpr}) END";
    }

    private function applyScopedOwnerPreFilter(
        $query,
        array $ownerIds,
        string $alias,
        bool $hasUserCol,
        bool $hasEventWfCol,
        bool $hasSessionWfCol,
        ?string $workflowOwnerCol,
        bool $hasSessionUserCol = false
    ): void {
        if (empty($ownerIds)) {
            $query->whereRaw('1 = 0');
            return;
        }

        $query->where(function ($q) use (
            $ownerIds,
            $alias,
            $hasUserCol,
            $hasEventWfCol,
            $hasSessionWfCol,
            $workflowOwnerCol,
            $hasSessionUserCol
        ) {
            $hasCond = false;
            if ($hasUserCol) {
                $q->whereIn("{$alias}.user_id", $ownerIds);
                $hasCond = true;
            }
            if ($hasEventWfCol && $workflowOwnerCol) {
                $hasCond ? $q->orWhereIn("ew.{$workflowOwnerCol}", $ownerIds) : $q->whereIn("ew.{$workflowOwnerCol}", $ownerIds);
                $hasCond = true;
            }
            if ($hasSessionUserCol) {
                $hasCond ? $q->orWhereIn('bs.user_id', $ownerIds) : $q->whereIn('bs.user_id', $ownerIds);
                $hasCond = true;
            }
            if ($hasSessionWfCol && $workflowOwnerCol) {
                $hasCond ? $q->orWhereIn("sw.{$workflowOwnerCol}", $ownerIds) : $q->whereIn("sw.{$workflowOwnerCol}", $ownerIds);
                $hasCond = true;
            }
            if (!$hasCond) {
                $q->whereRaw('1 = 0');
            }
        });
    }

    private function firstColumn(array $columns, array $candidates): ?string
    {
        foreach ($candidates as $candidate) {
            if (in_array($candidate, $columns, true)) {
                return $candidate;
            }
        }

        return null;
    }

    private function updateActivity(array &$row, $createdAt): void
    {
        if (!$createdAt) {
            return;
        }

        if (
            empty($row['last_activity']) ||
            strtotime($createdAt) > strtotime($row['last_activity'])
        ) {
            $row['last_activity'] = $createdAt;
        }
    }
}
