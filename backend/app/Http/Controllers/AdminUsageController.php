<?php

namespace App\Http\Controllers;

use App\Models\User;
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
        | Users
        |--------------------------------------------------------------------------
        */

        $usersQuery = User::query();

        if (!$isSuperAdmin) {
            // A normal user can only see their own usage.
            $usersQuery->where('id', $user->id);
        }

        if ($isSuperAdmin && !empty($validated['tenant_id'])) {
            // Old frontend compatibility: tenant_id is treated as a user ID.
            $usersQuery->where('id', (int) $validated['tenant_id']);
        }

        $search = trim($validated['search'] ?? '');

        if ($isSuperAdmin && $search !== '') {
            $usersQuery->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%");

                if (Schema::hasColumn('users', 'email')) {
                    $query->orWhere('email', 'like', "%{$search}%");
                }

                if (Schema::hasColumn('users', 'id')) {
                    $query->orWhere('id', 'like', "%{$search}%");
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
                // Keep legacy keys so existing frontend code can continue working.
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

                // Aliases for frontends that use messages_sent naming.
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

        /*
        |--------------------------------------------------------------------------
        | Workflow ownership map: workflow ID => user ID
        |--------------------------------------------------------------------------
        */

        $workflows = $this->getWorkflowMap($user, $isSuperAdmin);

       foreach ($workflows as $workflow) {
                $ownerId = (int) $workflow['user_id'];

                if (!isset($usage[$ownerId])) {
                    continue;
                }

                $usage[$ownerId]['total_workflows']++;

                // Workflow creation/update date ko activity mein include karo.
                $this->updateActivity(
                    $usage[$ownerId],
                    $workflow['created_at'] ?? null
                );

                $this->updateActivity(
                    $usage[$ownerId],
                    $workflow['updated_at'] ?? null
                );
            }

        /*
        |--------------------------------------------------------------------------
        | Session ownership map: session ID => user ID
        |--------------------------------------------------------------------------
        */

        $sessions = $this->getSessionMap(
            $user,
            $isSuperAdmin,
            $workflows
        );

        foreach ($sessions as $session) {
            $ownerId = (int) $session['user_id'];

            if (!isset($usage[$ownerId])) {
                continue;
            }

            if (!$this->isWithinRange(
                $session['created_at'] ?? null,
                $from,
                $to
            )) {
                continue;
            }

            $usage[$ownerId]['total_sessions']++;

            if (in_array(
                strtolower((string) ($session['status'] ?? '')),
                ['active', 'waiting'],
                true
            )) {
                $usage[$ownerId]['active_sessions']++;
            }

            $this->updateActivity(
                $usage[$ownerId],
                $session['created_at'] ?? null
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Workflow execution records
        |--------------------------------------------------------------------------
        */

        $executions = $this->getEventRows(
            'workflow_executions',
            $from,
            $to,
            $user,
            $isSuperAdmin,
            $workflows,
            $sessions
        );

        $executionSessions = [];
        $latestSessionStatus = [];

        foreach ($executions as $event) {
            $ownerId = $this->resolveOwner(
                $event,
                $workflows,
                $sessions
            );

            if (!$ownerId || !isset($usage[$ownerId])) {
                continue;
            }

            $status = strtolower((string) (
                $event->status
                ?? $event->execution_status
                ?? ''
            ));

            $usage[$ownerId]['execution_records']++;

            if ($status === 'success') {
                $usage[$ownerId]['successful_executions']++;
            } elseif ($status === 'failed') {
                $usage[$ownerId]['failed_executions']++;
            } elseif ($status === 'running') {
                $usage[$ownerId]['running_executions']++;
            }

            $sessionId = $event->bot_session_id
                ?? $event->session_id
                ?? null;

            if ($sessionId !== null) {
                $key = $ownerId . ':' . $sessionId;

                $executionSessions[$ownerId][$key] = true;

                if (!array_key_exists($key, $latestSessionStatus)) {
                    $latestSessionStatus[$key] = $status;
                }
            }

            $nodeType = strtolower((string) (
                $event->node_type
                ?? $event->type
                ?? ''
            ));

            if ($nodeType === 'api') {
                $usage[$ownerId]['api_requests']++;
            }

            $this->updateActivity(
                $usage[$ownerId],
                $event->created_at ?? null
            );
        }

        foreach ($executionSessions as $ownerId => $items) {
            $usage[$ownerId]['workflow_executions'] = count($items);

            foreach (array_keys($items) as $key) {
                $status = $latestSessionStatus[$key] ?? '';

                if ($status === 'success') {
                    $usage[$ownerId]['successful_executions']++;
                } elseif ($status === 'failed') {
                    $usage[$ownerId]['failed_executions']++;
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Message records
        |--------------------------------------------------------------------------
        */

        $messages = $this->getEventRows(
            'bot_messages',
            $from,
            $to,
            $user,
            $isSuperAdmin,
            $workflows,
            $sessions
        );

        foreach ($messages as $event) {
            $ownerId = $this->resolveOwner(
                $event,
                $workflows,
                $sessions
            );

            if (!$ownerId || !isset($usage[$ownerId])) {
                continue;
            }

            $direction = strtolower((string) (
                $event->direction
                ?? $event->message_direction
                ?? ''
            ));

            $status = strtolower((string) (
                $event->status
                ?? $event->delivery_status
                ?? ''
            ));

            $usage[$ownerId]['messages']++;

            if (in_array($direction, ['inbound', 'incoming', 'in'], true)) {
                $usage[$ownerId]['inbound_messages']++;
            }

            if (in_array(
                $direction,
                ['outbound', 'outgoing', 'sent', 'out'],
                true
            )) {
                $usage[$ownerId]['outbound_messages']++;
                $usage[$ownerId]['sent']++;

                if (in_array($status, ['delivered', 'read'], true)) {
                    $usage[$ownerId]['delivered']++;
                }

                if (in_array(
                    $status,
                    ['failed', 'failure', 'error'],
                    true
                )) {
                    $usage[$ownerId]['failed']++;
                }
            }

            $this->updateActivity(
                $usage[$ownerId],
                $event->created_at ?? null
            );
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
    | Workflow map
    |--------------------------------------------------------------------------
    */

    private function getWorkflowMap(
        User $user,
        bool $isSuperAdmin
    ): array {
        if (!Schema::hasTable('workflows')) {
            return [];
        }

        $columns = Schema::getColumnListing('workflows');

        if (!in_array('id', $columns, true)) {
            return [];
        }

        $ownerColumn = $this->firstColumn(
            $columns,
            ['user_id', 'created_by']
        );

        /*
         * Do not infer ownership from tenant_id.
         * If workflows has no user ownership field, it cannot safely
         * be isolated by user using this controller alone.
         */
        if (!$ownerColumn) {
            return [];
        }

        $select = ['id', $ownerColumn . ' as owner_id'];

       foreach (['created_at', 'updated_at', 'status'] as $column) {
                if (in_array($column, $columns, true)) {
                    $select[] = $column;
                }
}

        $query = DB::table('workflows')->select($select);

        if (!$isSuperAdmin) {
            $query->where($ownerColumn, $user->id);
        }

        $map = [];

        foreach ($query->get() as $row) {
            $ownerId = (int) $row->owner_id;

            if ($ownerId <= 0) {
                continue;
            }

           $map[$row->id] = [
                'user_id' => $ownerId,
                'created_at' => $row->created_at ?? null,
                'updated_at' => $row->updated_at ?? null,
                'status' => $row->status ?? null,
            ];
        }

        return $map;
    }

    /*
    |--------------------------------------------------------------------------
    | Session map
    |--------------------------------------------------------------------------
    */

    private function getSessionMap(
        User $user,
        bool $isSuperAdmin,
        array $workflows
    ): array {
        if (!Schema::hasTable('bot_sessions')) {
            return [];
        }

        $columns = Schema::getColumnListing('bot_sessions');

        if (!in_array('id', $columns, true)) {
            return [];
        }

        $select = ['id'];

        foreach ([
            'user_id',
            'workflow_id',
            'status',
            'created_at',
        ] as $column) {
            if (in_array($column, $columns, true)) {
                $select[] = $column;
            }
        }

        $query = DB::table('bot_sessions')->select($select);

        if (!$isSuperAdmin) {
            $workflowIds = array_keys($workflows);

            $query->where(function ($q) use (
                $columns,
                $workflowIds,
                $user
            ) {
                $hasCondition = false;

                if (
                    in_array('user_id', $columns, true)
                ) {
                    $q->where('user_id', $user->id);
                    $hasCondition = true;
                }

                if (
                    !empty($workflowIds) &&
                    in_array('workflow_id', $columns, true)
                ) {
                    if ($hasCondition) {
                        $q->orWhereIn('workflow_id', $workflowIds);
                    } else {
                        $q->whereIn('workflow_id', $workflowIds);
                    }

                    $hasCondition = true;
                }

                if (!$hasCondition) {
                    $q->whereRaw('1 = 0');
                }
            });
        }

        $map = [];

        foreach ($query->get() as $row) {
            $workflowId = $row->workflow_id ?? null;

            $ownerId = (int) ($row->user_id ?? 0);

            if (
                $workflowId &&
                isset($workflows[$workflowId])
            ) {
                $workflowOwner = (int) $workflows[$workflowId]['user_id'];

                // Workflow ownership is authoritative when available.
                if ($ownerId > 0 && $ownerId !== $workflowOwner) {
                    continue;
                }

                $ownerId = $workflowOwner;
            }

            if ($ownerId <= 0) {
                continue;
            }

            if (!$isSuperAdmin && $ownerId !== (int) $user->id) {
                continue;
            }

            $map[$row->id] = [
                'user_id' => $ownerId,
                'workflow_id' => $workflowId,
                'status' => $row->status ?? '',
                'created_at' => $row->created_at ?? null,
            ];
        }

        return $map;
    }

    /*
    |--------------------------------------------------------------------------
    | Events
    |--------------------------------------------------------------------------
    */

    private function getEventRows(
        string $table,
        Carbon $from,
        Carbon $to,
        User $user,
        bool $isSuperAdmin,
        array $workflows,
        array $sessions
    ) {
        if (
            !Schema::hasTable($table) ||
            !Schema::hasColumn($table, 'created_at')
        ) {
            return collect();
        }

        $columns = Schema::getColumnListing($table);

        $select = ['created_at'];

        foreach ([
            'id',
            'user_id',
            'workflow_id',
            'session_id',
            'bot_session_id',
            'status',
            'delivery_status',
            'direction',
            'message_direction',
            'node_type',
            'type',
            'execution_status',
        ] as $column) {
            if (in_array($column, $columns, true)) {
                $select[] = $column;
            }
        }

        $query = DB::table($table)
            ->select(array_values(array_unique($select)))
            ->whereBetween('created_at', [$from, $to]);

        if (!$isSuperAdmin) {
            $workflowIds = array_keys($workflows);
            $sessionIds = array_keys($sessions);

            $query->where(function ($q) use (
                $columns,
                $user,
                $workflowIds,
                $sessionIds
            ) {
                $hasCondition = false;

                if (in_array('user_id', $columns, true)) {
                    $q->where('user_id', $user->id);
                    $hasCondition = true;
                }

                if (
                    !empty($workflowIds) &&
                    in_array('workflow_id', $columns, true)
                ) {
                    if ($hasCondition) {
                        $q->orWhereIn('workflow_id', $workflowIds);
                    } else {
                        $q->whereIn('workflow_id', $workflowIds);
                    }

                    $hasCondition = true;
                }

                foreach (['bot_session_id', 'session_id'] as $column) {
                    if (
                        !empty($sessionIds) &&
                        in_array($column, $columns, true)
                    ) {
                        if ($hasCondition) {
                            $q->orWhereIn($column, $sessionIds);
                        } else {
                            $q->whereIn($column, $sessionIds);
                        }

                        $hasCondition = true;
                    }
                }

                if (!$hasCondition) {
                    $q->whereRaw('1 = 0');
                }
            });
        }

        return $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve event owner
    |--------------------------------------------------------------------------
    */

    private function resolveOwner(
        object $event,
        array $workflows,
        array $sessions
    ): ?int {
        $sessionId = $event->bot_session_id
            ?? $event->session_id
            ?? null;

        $workflowId = $event->workflow_id ?? null;

        $sessionOwner = null;
        $workflowOwner = null;

        if ($sessionId && isset($sessions[$sessionId])) {
            $sessionOwner = (int) $sessions[$sessionId]['user_id'];
        }

        if ($workflowId && isset($workflows[$workflowId])) {
            $workflowOwner = (int) $workflows[$workflowId]['user_id'];
        }

        // Reject events whose session and workflow owners disagree.
        if (
            $sessionOwner &&
            $workflowOwner &&
            $sessionOwner !== $workflowOwner
        ) {
            return null;
        }

        if ($sessionOwner) {
            return $sessionOwner;
        }

        if ($workflowOwner) {
            return $workflowOwner;
        }

        $directUserId = (int) ($event->user_id ?? 0);

        return $directUserId > 0 ? $directUserId : null;
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    private function firstColumn(
        array $columns,
        array $candidates
    ): ?string {
        foreach ($candidates as $candidate) {
            if (in_array($candidate, $columns, true)) {
                return $candidate;
            }
        }

        return null;
    }

    private function isWithinRange(
        $date,
        Carbon $from,
        Carbon $to
    ): bool {
        if (!$date) {
            return false;
        }

        try {
            return Carbon::parse($date)->betweenIncluded($from, $to);
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function updateActivity(
        array &$row,
        $createdAt
    ): void {
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
