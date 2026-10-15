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
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'tenant_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:150'],
        ]);

        $from = Carbon::parse(
            $validated['from'] ?? now()->subDays(29)->toDateString()
        )->startOfDay();

        $to = Carbon::parse(
            $validated['to'] ?? now()->toDateString()
        )->endOfDay();

        $selectedTenant = !empty($validated['tenant_id'])
            ? (int) $validated['tenant_id']
            : null;

        /*
        |--------------------------------------------------------------------------
        | Load tenant, workflow and session mappings
        |--------------------------------------------------------------------------
        */

        $clients = $this->getClients();
        $workflows = $this->getWorkflows();
        $sessions = $this->getSessions($workflows);

        $executions = $this->getEvents(
            'workflow_executions',
            $from,
            $to
        );

        $messages = $this->getEvents(
            'bot_messages',
            $from,
            $to
        );

        /*
        |--------------------------------------------------------------------------
        | Initialize tenant usage rows
        |--------------------------------------------------------------------------
        */

        $usage = [];

        foreach ($clients as $client) {
            $tenantId = (int) $client->id;

            if (
                $selectedTenant !== null &&
                $tenantId !== $selectedTenant
            ) {
                continue;
            }

            $usage[$tenantId] = [
                'tenant_id' => $tenantId,
                'client_name' => $client->name,

                'total_workflows' => 0,
                'total_sessions' => 0,
                'active_sessions' => 0,

                'messages' => 0,
                'inbound_messages' => 0,
                'outbound_messages' => 0,

                'sent' => 0,
                'delivered' => 0,
                'failed' => 0,

                // Distinct sessions that have execution records.
                // This is an estimate of runs, not a true run ID count.
                'workflow_executions' => 0,

                // Raw node-level execution records.
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
        | Count workflow definitions by tenant
        |--------------------------------------------------------------------------
        */

        foreach ($workflows as $workflow) {
            $tenantId = (int) ($workflow['tenant_id'] ?? 0);

            if (!isset($usage[$tenantId])) {
                continue;
            }

            $usage[$tenantId]['total_workflows']++;
        }

        /*
        |--------------------------------------------------------------------------
        | Count sessions
        |--------------------------------------------------------------------------
        */

        foreach ($sessions as $session) {
            $tenantId = (int) ($session['tenant_id'] ?? 0);

            if (!isset($usage[$tenantId])) {
                continue;
            }

            // Apply the selected date range to session creation.
            if (!$this->isWithinDateRange(
                $session['created_at'] ?? null,
                $from,
                $to
            )) {
                continue;
            }

            $usage[$tenantId]['total_sessions']++;

            if (in_array(
                strtolower((string) ($session['status'] ?? '')),
                ['active', 'waiting'],
                true
            )) {
                $usage[$tenantId]['active_sessions']++;
            }

            $this->updateActivity(
                $usage[$tenantId],
                $session['created_at'] ?? null
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Count node execution records and distinct execution sessions
        |--------------------------------------------------------------------------
        */

        $runSessions = [];
        $latestSessionStatus = [];

        foreach ($executions as $event) {
            $tenantId = $this->resolveTenant(
                $event,
                $workflows,
                $sessions
            );

            if (!isset($usage[$tenantId])) {
                continue;
            }

            $status = strtolower((string) (
                $event->status
                ?? $event->execution_status
                ?? ''
            ));

            $usage[$tenantId]['execution_records']++;

            if ($status === 'success') {
                $usage[$tenantId]['successful_executions']++;
            } elseif ($status === 'failed') {
                $usage[$tenantId]['failed_executions']++;
            } elseif ($status === 'running') {
                $usage[$tenantId]['running_executions']++;
            }

            /*
             * workflow_executions has bot_session_id but no run_id.
             * Count each non-null session once per tenant.
             *
             * The event query is ordered newest-first, so the first
             * status encountered is the latest status for that session.
             */
            $sessionId = $event->bot_session_id
                ?? $event->session_id
                ?? null;

            if ($sessionId !== null) {
                $sessionKey = $tenantId . ':' . $sessionId;

                $runSessions[$tenantId][$sessionKey] = true;

                if (!array_key_exists(
                    $sessionKey,
                    $latestSessionStatus
                )) {
                    $latestSessionStatus[$sessionKey] = $status;
                }
            }

            $type = strtolower((string) (
                $event->node_type ?? $event->type ?? ''
            ));

            if ($type === 'api') {
                $usage[$tenantId]['api_requests']++;
            }

            $this->updateActivity(
                $usage[$tenantId],
                $event->created_at ?? null
            );
        }

        foreach ($runSessions as $tenantId => $tenantSessions) {
            $usage[$tenantId]['workflow_executions'] =
                count($tenantSessions);

            foreach (array_keys($tenantSessions) as $sessionKey) {
                $status = $latestSessionStatus[$sessionKey] ?? '';

                if ($status === 'success') {
                    $usage[$tenantId]['successful_executions']++;
                } elseif ($status === 'failed') {
                    $usage[$tenantId]['failed_executions']++;
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Count messages by direction
        |--------------------------------------------------------------------------
        */

        foreach ($messages as $event) {
            $tenantId = $this->resolveTenant(
                $event,
                $workflows,
                $sessions
            );

            if (!isset($usage[$tenantId])) {
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

            // Count every message, inbound or outbound.
            $usage[$tenantId]['messages']++;

            if (in_array(
                $direction,
                ['inbound', 'incoming', 'in'],
                true
            )) {
                $usage[$tenantId]['inbound_messages']++;
            }

            if (in_array(
                $direction,
                ['outbound', 'outgoing', 'sent', 'out'],
                true
            )) {
                $usage[$tenantId]['outbound_messages']++;
                $usage[$tenantId]['sent']++;

                if (in_array($status, ['delivered', 'read'], true)) {
                    $usage[$tenantId]['delivered']++;
                }

                if (in_array(
                    $status,
                    ['failed', 'failure', 'error'],
                    true
                )) {
                    $usage[$tenantId]['failed']++;
                }
            }

            $this->updateActivity(
                $usage[$tenantId],
                $event->created_at ?? null
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Apply search filter
        |--------------------------------------------------------------------------
        */

        $usage = array_values($usage);

        $search = strtolower(trim($validated['search'] ?? ''));

        if ($search !== '') {
            $usage = array_values(array_filter(
                $usage,
                fn ($row) => str_contains(
                    strtolower((string) $row['client_name']),
                    $search
                )
            ));
        }

        /*
        |--------------------------------------------------------------------------
        | Aggregate dashboard statistics
        |--------------------------------------------------------------------------
        */

        $sum = function (string $key) use ($usage): int {
            return (int) array_sum(
                array_column($usage, $key)
            );
        };

        $stats = [
            'total_clients' => count($usage),

            'total_workflows' => $sum('total_workflows'),
            'total_sessions' => $sum('total_sessions'),
            'active_sessions' => $sum('active_sessions'),

            'messages' => $sum('messages'),
            'inbound_messages' => $sum('inbound_messages'),
            'outbound_messages' => $sum('outbound_messages'),

            'sent' => $sum('sent'),
            'delivered' => $sum('delivered'),
            'failed' => $sum('failed'),

            // Distinct sessions with execution records.
            'workflow_executions' => $sum('workflow_executions'),

            // Raw node execution counts are reported separately.
            'execution_records' => $sum('execution_records'),
            'successful_executions' => $sum('successful_executions'),
            'failed_executions' => $sum('failed_executions'),
            'running_executions' => $sum('running_executions'),

            'api_requests' => $sum('api_requests'),
        ];

        return response()->json([
            'success' => true,

            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'tenant_id' => $selectedTenant,
                'search' => $search,
            ],

            'stats' => $stats,
            'data' => $usage,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Tenants
    |--------------------------------------------------------------------------
    */

    private function getClients()
    {
        if (
            !Schema::hasTable('tenants') ||
            !Schema::hasColumn('tenants', 'id') ||
            !Schema::hasColumn('tenants', 'name')
        ) {
            return collect();
        }

        return DB::table('tenants')
            ->select('id', 'name')
            ->orderBy('name')
            ->get();
    }

    /*
    |--------------------------------------------------------------------------
    | Workflow map
    |--------------------------------------------------------------------------
    */

    private function getWorkflows(): array
    {
        if (
            !Schema::hasTable('workflows') ||
            !Schema::hasColumn('workflows', 'id')
        ) {
            return [];
        }

        $columns = Schema::getColumnListing('workflows');

        $ownerColumn = $this->firstColumn(
            $columns,
            ['tenant_id', 'client_id']
        );

        if (!$ownerColumn) {
            return [];
        }

        $select = ['id', $ownerColumn . ' as tenant_id'];

        if (in_array('created_at', $columns, true)) {
            $select[] = 'created_at';
        }

        if (in_array('status', $columns, true)) {
            $select[] = 'status';
        }

        $result = [];

        foreach (DB::table('workflows')->select($select)->get() as $row) {
            $result[$row->id] = [
                'tenant_id' => (int) ($row->tenant_id ?? 0),
                'created_at' => $row->created_at ?? null,
                'status' => $row->status ?? null,
            ];
        }

        return $result;
    }

    /*
    |--------------------------------------------------------------------------
    | Session map
    |--------------------------------------------------------------------------
    */

    private function getSessions(array $workflows): array
    {
        if (
            !Schema::hasTable('bot_sessions') ||
            !Schema::hasColumn('bot_sessions', 'id')
        ) {
            return [];
        }

        $columns = Schema::getColumnListing('bot_sessions');

        $select = ['id'];

        foreach ([
            'workflow_id',
            'tenant_id',
            'client_id',
            'status',
            'created_at',
        ] as $column) {
            if (in_array($column, $columns, true)) {
                $select[] = $column;
            }
        }

        $map = [];

        foreach (DB::table('bot_sessions')->select($select)->get() as $row) {
            $tenantId = (int) (
                $row->tenant_id
                ?? $row->client_id
                ?? 0
            );

            $workflowId = $row->workflow_id ?? null;

            if (
                $tenantId <= 0 &&
                $workflowId &&
                isset($workflows[$workflowId])
            ) {
                $tenantId = (int) $workflows[$workflowId]['tenant_id'];
            }

            $map[$row->id] = [
                'tenant_id' => $tenantId,
                'workflow_id' => $workflowId,
                'status' => $row->status ?? '',
                'created_at' => $row->created_at ?? null,
            ];
        }

        return $map;
    }

    /*
    |--------------------------------------------------------------------------
    | Events within the selected date range
    |--------------------------------------------------------------------------
    */

    private function getEvents(
        string $table,
        Carbon $from,
        Carbon $to
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
            'tenant_id',
            'client_id',
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

        return DB::table($table)
            ->select(array_values(array_unique($select)))
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve tenant for an event
    |--------------------------------------------------------------------------
    */

    private function resolveTenant(
        object $event,
        array $workflows,
        array $sessions
    ): int {
        $tenantId = (int) ($event->tenant_id ?? 0);

        if ($tenantId > 0) {
            return $tenantId;
        }

        $clientId = (int) ($event->client_id ?? 0);

        if ($clientId > 0) {
            return $clientId;
        }

        $sessionId = $event->session_id
            ?? $event->bot_session_id
            ?? null;

        /*
         * Prefer the session's workflow mapping if direct ownership
         * is missing or the event has no workflow ID.
         */
        if ($sessionId && isset($sessions[$sessionId])) {
            $sessionTenantId = (int) (
                $sessions[$sessionId]['tenant_id'] ?? 0
            );

            if ($sessionTenantId > 0) {
                return $sessionTenantId;
            }
        }

        $workflowId = $event->workflow_id ?? null;

        if ($workflowId && isset($workflows[$workflowId])) {
            return (int) $workflows[$workflowId]['tenant_id'];
        }

        return 0;
    }

    /*
    |--------------------------------------------------------------------------
    | Date and activity helpers
    |--------------------------------------------------------------------------
    */

    private function isWithinDateRange(
        $date,
        Carbon $from,
        Carbon $to
    ): bool {
        if (!$date) {
            return false;
        }

        try {
            $value = Carbon::parse($date);

            return $value->betweenIncluded($from, $to);
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
}
