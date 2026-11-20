<?php

namespace App\Http\Controllers;

use App\Models\Bot;
use App\Models\BotMessage;
use App\Models\BotSession;
use App\Models\User;
use App\Models\WhatsAppAccount;
use App\Models\Workflow;
use App\Models\WorkflowExecution;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminMessageLogController extends Controller
{
    /**
     * Return filter options (clients for Super Admin, WhatsApp accounts, and workflows)
     * scoped strictly to the authenticated user unless Super Admin.
     */
    public function filters(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401, 'Unauthenticated.');

        $validated = $request->validate([
            'client_id' => ['nullable', 'integer'],
            'whatsapp_account_id' => ['nullable', 'integer'],
            'period' => ['nullable', 'string', 'in:today,yesterday,7d,30d,month,this_month,last_month,all,custom'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $isSuperAdmin = $user->isSuperAdmin();
        $targetUserId = $this->resolveTargetUserId($user, $isSuperAdmin, $validated['client_id'] ?? null);

        $clients = [];
        if ($isSuperAdmin) {
            $clients = $this->loadClients();
        }

        $accounts = $this->loadAccounts($targetUserId, $isSuperAdmin);
        $accountId = !empty($validated['whatsapp_account_id'])
            ? (int) $validated['whatsapp_account_id']
            : null;

        [$from, $to] = $this->resolveDateRange(
            $validated['period'] ?? 'all',
            $validated['from'] ?? null,
            $validated['to'] ?? null
        );

        $workflows = $this->loadWorkflowsWithCounts(
            $targetUserId,
            $isSuperAdmin,
            $accountId,
            $from,
            $to
        );

        return response()->json([
            'success' => true,
            'is_super_admin' => $isSuperAdmin,
            'clients' => $clients,
            'accounts' => $accounts,
            'workflows' => $workflows,
        ]);
    }

    /**
     * List conversations (BotSessions) and aggregate Message Analytics
     * filtered by workflow, WhatsApp account, date range, status, and search.
     */
    public function conversations(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401, 'Unauthenticated.');

        $validated = $request->validate([
            'client_id' => ['nullable', 'integer'],
            'whatsapp_account_id' => ['nullable', 'integer'],
            'workflow_id' => ['nullable', 'string', 'max:32'],
            'period' => ['nullable', 'string', 'in:today,yesterday,7d,30d,month,this_month,last_month,all,custom'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'status' => ['nullable', 'string', 'in:all,active,waiting,completed,dropped,error'],
            'search' => ['nullable', 'string', 'max:150'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'include_summary' => ['nullable', 'boolean'],
            'known_total' => ['nullable', 'integer', 'min:0'],
            'cursor_ts' => ['nullable', 'string', 'max:40'],
            'cursor_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $isSuperAdmin = $user->isSuperAdmin();
        $targetUserId = $this->resolveTargetUserId($user, $isSuperAdmin, $validated['client_id'] ?? null);

        $workflowParam = trim((string) ($validated['workflow_id'] ?? ''));
        $workflowId = ($workflowParam !== '' && strtolower($workflowParam) !== 'all' && ctype_digit($workflowParam))
            ? (int) $workflowParam
            : null;

        if ($workflowId !== null && !$this->canAccessWorkflow($user, $workflowId, $isSuperAdmin)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this workflow.',
            ], 403);
        }

        $accountId = !empty($validated['whatsapp_account_id'])
            ? (int) $validated['whatsapp_account_id']
            : null;

        [$from, $to] = $this->resolveDateRange(
            $validated['period'] ?? 'today',
            $validated['from'] ?? null,
            $validated['to'] ?? null
        );

        $baseQuery = $this->buildSessionBaseQuery(
            $targetUserId,
            $isSuperAdmin,
            $accountId,
            $workflowId,
            $from,
            $to,
            $validated['status'] ?? null,
            $validated['search'] ?? null
        );

        $includeSummary = $request->boolean('include_summary', true);
        $hasKnownTotal = !$includeSummary && isset($validated['known_total']);

        $total = $hasKnownTotal
            ? (int) $validated['known_total']
            : (int) (clone $baseQuery)->count('bot_sessions.id');

        $summary = $includeSummary
            ? $this->buildAggregateAnalyticsFromBaseQuery(clone $baseQuery, $total)
            : null;

        $perPage = max(1, (int) ($validated['per_page'] ?? 30));
        $currentPage = max(1, (int) ($validated['page'] ?? 1));
        $lastPage = max(1, (int) ceil($total / $perPage));
        $offset = ($currentPage - 1) * $perPage;
        $activityExpr = 'COALESCE(bot_sessions.last_message_at, bot_sessions.updated_at, bot_sessions.created_at)';

        $useSeekCursor = $currentPage > 1
            && !empty($validated['cursor_ts'])
            && !empty($validated['cursor_id']);

        if ($total === 0) {
            $sessions = collect();
        } else {
            $pageQuery = $this->attachSessionDisplayJoins(clone $baseQuery)
                ->select([
                    'bot_sessions.id',
                    'bot_sessions.user_id',
                    'bot_sessions.bot_id',
                    'bot_sessions.workflow_id',
                    'bot_sessions.whatsapp_account_id',
                    'bot_sessions.user_identifier',
                    'bot_sessions.status',
                    'bot_sessions.current_node_id',
                    'bot_sessions.variables',
                    'bot_sessions.last_message_at',
                    'bot_sessions.created_at',
                    'bot_sessions.updated_at',
                    DB::raw("{$activityExpr} as sort_activity_at"),
                    'wf.name as workflow_name',
                    'wf.bot_id as workflow_bot_id',
                    'wf.whatsapp_account_id as workflow_whatsapp_account_id',
                    'b.name as bot_name',
                    'wa.name as account_name',
                    'wa.business_name as account_business_name',
                    'wa.waba_id as account_waba_id',
                ]);

            if ($useSeekCursor) {
                $cursorTs = (string) $validated['cursor_ts'];
                $cursorId = (int) $validated['cursor_id'];
                $pageQuery->whereRaw(
                    "({$activityExpr} < ? OR ({$activityExpr} = ? AND bot_sessions.id < ?))",
                    [$cursorTs, $cursorTs, $cursorId]
                );
            } else {
                $pageQuery->offset($offset);
            }

            $sessions = $pageQuery
                ->orderByRaw("{$activityExpr} DESC")
                ->orderByDesc('bot_sessions.id')
                ->limit($perPage)
                ->get();
        }

        $sessionMetrics = $this->getPerSessionMessageMetrics($sessions->pluck('id')->all());

        $formatted = $sessions->map(function (object $session) use ($sessionMetrics) {
            return $this->formatSessionListItem($session, $sessionMetrics[$session->id] ?? null);
        })->values();

        $lastRow = $sessions->last();
        $nextCursor = ($lastRow && $currentPage < $lastPage)
            ? [
                'ts' => (string) ($lastRow->sort_activity_at ?? ''),
                'id' => (int) $lastRow->id,
            ]
            : null;

        return response()->json([
            'success' => true,
            'filters' => [
                'from' => $from?->toDateString(),
                'to' => $to?->toDateString(),
                'workflow_id' => $workflowId ?? 'all',
            ],
            'summary' => $summary,
            'conversations' => $formatted,
            'pagination' => [
                'current_page' => $currentPage,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
                'next_cursor' => $nextCursor,
            ],
        ]);
    }

    /**
     * Show full WhatsApp conversation messages, analytics, variables, and node trail
     * for a single BotSession.
     */
    public function show(Request $request, BotSession $session): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401, 'Unauthenticated.');

        if (!$this->canAccessSession($user, $session)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access to this conversation.',
            ], 403);
        }

        $sessionRow = $this->loadSessionRowById((int) $session->id) ?? $session;

        $formattedMessages = [];
        foreach (
            DB::table('bot_messages')
                ->where('bot_session_id', $session->id)
                ->select([
                    'id',
                    'direction',
                    'message_type',
                    'text',
                    'payload',
                    'external_message_id',
                    'delivery_status',
                    'created_at',
                ])
                ->orderBy('created_at')
                ->orderBy('id')
                ->cursor() as $message
        ) {
            $formattedMessages[] = $this->formatMessage($message);
        }

        $analytics = $this->computeSessionAnalytics($formattedMessages);

        $executions = DB::table('workflow_executions')
            ->where('bot_session_id', $session->id)
            ->orderByDesc('id')
            ->limit(25)
            ->get(['id', 'node_id', 'status', 'error_message', 'started_at', 'finished_at', 'created_at'])
            ->map(fn (object $exec) => [
                'id' => $exec->id,
                'node_id' => $exec->node_id,
                'status' => $exec->status,
                'error_message' => $exec->error_message,
                'started_at' => $this->toCarbon($exec->started_at)?->toIso8601String(),
                'finished_at' => $this->toCarbon($exec->finished_at)?->toIso8601String(),
                'created_at' => $this->toCarbon($exec->created_at)?->toIso8601String(),
            ])
            ->values();

        return response()->json([
            'success' => true,
            'session' => $this->formatSessionDetail($sessionRow, $analytics),
            'analytics' => $analytics,
            'messages' => $formattedMessages,
            'executions' => $executions,
        ]);
    }

    /**
     * Export filtered workflow conversations summary to CSV.
     */
    public function export(Request $request): StreamedResponse|JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401, 'Unauthenticated.');

        $validated = $request->validate([
            'client_id' => ['nullable', 'integer'],
            'whatsapp_account_id' => ['nullable', 'integer'],
            'workflow_id' => ['nullable', 'string', 'max:32'],
            'period' => ['nullable', 'string', 'in:today,yesterday,7d,30d,month,this_month,last_month,all,custom'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'status' => ['nullable', 'string', 'in:all,active,waiting,completed,dropped,error'],
            'search' => ['nullable', 'string', 'max:150'],
        ]);

        $isSuperAdmin = $user->isSuperAdmin();
        $targetUserId = $this->resolveTargetUserId($user, $isSuperAdmin, $validated['client_id'] ?? null);

        $workflowParam = trim((string) ($validated['workflow_id'] ?? ''));
        $workflowId = ($workflowParam !== '' && strtolower($workflowParam) !== 'all' && ctype_digit($workflowParam))
            ? (int) $workflowParam
            : null;

        if ($workflowId !== null && !$this->canAccessWorkflow($user, $workflowId, $isSuperAdmin)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $accountId = !empty($validated['whatsapp_account_id'])
            ? (int) $validated['whatsapp_account_id']
            : null;

        [$from, $to] = $this->resolveDateRange(
            $validated['period'] ?? 'all',
            $validated['from'] ?? null,
            $validated['to'] ?? null
        );

        $exportQuery = $this->attachSessionDisplayJoins(
            $this->buildSessionBaseQuery(
                $targetUserId,
                $isSuperAdmin,
                $accountId,
                $workflowId,
                $from,
                $to,
                $validated['status'] ?? null,
                $validated['search'] ?? null
            )
        )
            ->select([
                'bot_sessions.id',
                'bot_sessions.user_identifier',
                'bot_sessions.status',
                'bot_sessions.variables',
                'bot_sessions.last_message_at',
                'bot_sessions.created_at',
                'wf.name as workflow_name',
                'wa.name as account_name',
                'wa.business_name as account_business_name',
            ])
            ->orderByRaw('COALESCE(bot_sessions.last_message_at, bot_sessions.updated_at, bot_sessions.created_at) DESC')
            ->orderByDesc('bot_sessions.id');

        $filename = 'message-logs-' . now()->format('Y-m-d-His') . '.csv';

        return response()->streamDownload(function () use ($exportQuery) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                'Session ID',
                'Customer Mobile',
                'Customer Name',
                'Workflow',
                'WhatsApp Account',
                'Status',
                'Total Messages',
                'Bot Messages',
                'User Messages',
                'Interactive Messages',
                'Failed Messages',
                'Captured Variables',
                'Last Interaction',
                'Started At',
            ]);

            $maxRows = 5000;
            $chunkSize = 500;
            for ($offset = 0; $offset < $maxRows; $offset += $chunkSize) {
                $chunk = (clone $exportQuery)->offset($offset)->limit($chunkSize)->get();
                if ($chunk->isEmpty()) {
                    break;
                }

                $metrics = $this->getPerSessionMessageMetrics($chunk->pluck('id')->all(), false);

                foreach ($chunk as $session) {
                    $stat = $metrics[$session->id] ?? [];
                    $name = $this->extractDisplayName($session);
                    $vars = $this->decodeJsonField($session->variables);

                    fputcsv($handle, [
                        $session->id,
                        $session->user_identifier,
                        $name ?? '',
                        $session->workflow_name ?? 'Unassigned Workflow',
                        $session->account_business_name ?: ($session->account_name ?? ''),
                        $session->status,
                        $stat['total_messages'] ?? 0,
                        $stat['bot_messages'] ?? 0,
                        $stat['user_messages'] ?? 0,
                        $stat['interactive_messages'] ?? 0,
                        $stat['failed_count'] ?? 0,
                        !empty($vars) ? json_encode($vars, JSON_UNESCAPED_UNICODE) : '',
                        $this->toCarbon($session->last_message_at)?->toDateTimeString() ?? '',
                        $this->toCarbon($session->created_at)?->toDateTimeString() ?? '',
                    ]);
                }

                if ($chunk->count() < $chunkSize) {
                    break;
                }
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Export a single conversation chat transcript to CSV.
     */
    public function exportConversation(Request $request, BotSession $session): StreamedResponse|JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401, 'Unauthenticated.');

        if (!$this->canAccessSession($user, $session)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $workflowName = $session->workflow_id
            ? (string) (DB::table('workflows')->where('id', $session->workflow_id)->value('name') ?? '')
            : '';

        $filename = 'chat-' . preg_replace('/\D+/', '', (string) $session->user_identifier)
            . '-session-' . $session->id . '.csv';

        return response()->streamDownload(function () use ($session, $workflowName) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                'Message ID',
                'Timestamp',
                'Sender',
                'Message Type',
                'Text / Display',
                'Delivery Status',
                'Workflow',
                'Customer Mobile',
            ]);

            $cursor = DB::table('bot_messages')
                ->where('bot_session_id', $session->id)
                ->select([
                    'id',
                    'direction',
                    'message_type',
                    'text',
                    'payload',
                    'external_message_id',
                    'delivery_status',
                    'created_at',
                ])
                ->orderBy('created_at')
                ->orderBy('id')
                ->cursor();

            foreach ($cursor as $message) {
                $formatted = $this->formatMessage($message);
                fputcsv($handle, [
                    $message->id,
                    $this->toCarbon($message->created_at)?->toDateTimeString() ?? '',
                    $message->direction === 'inbound' ? 'Customer' : 'Bot',
                    $formatted['message_type'],
                    $formatted['display_text'],
                    $formatted['delivery_status'] ?? '',
                    $workflowName,
                    $session->user_identifier,
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Determine which user ID's data should be queried.
     */
    private function resolveTargetUserId(User $user, bool $isSuperAdmin, mixed $requestedClientId): ?int
    {
        if (!$isSuperAdmin) {
            return (int) $user->id;
        }

        return !empty($requestedClientId) ? (int) $requestedClientId : null;
    }

    /**
     * Load registered clients for Super Admin selector.
     */
    private function loadClients(): array
    {
        $businessProfiles = Schema::hasTable('business_profiles')
            ? DB::table('business_profiles')->pluck('business_name', 'user_id')
            : collect();

        return DB::table('users')
            ->where(function ($q) {
                $q->whereNull('role')
                    ->orWhereRaw('LOWER(role) != ?', ['super_admin']);
            })
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(function (object $client) use ($businessProfiles) {
                $businessName = $businessProfiles->get($client->id);
                return [
                    'id' => $client->id,
                    'name' => $client->name,
                    'email' => $client->email,
                    'business_name' => $businessName ?: $client->name,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Load WhatsApp accounts scoped by ownership.
     */
    private function loadAccounts(?int $targetUserId, bool $isSuperAdmin): array
    {
        if (!Schema::hasTable('whatsapp_accounts')) {
            return [];
        }

        $hasPhoneNumber = Schema::hasColumn('whatsapp_accounts', 'phone_number');
        $columns = ['id', 'user_id', 'name', 'business_name', 'waba_id', 'status'];
        if ($hasPhoneNumber) {
            $columns[] = 'phone_number';
        }

        $query = DB::table('whatsapp_accounts')
            ->select($columns)
            ->orderBy('name');

        if (!$isSuperAdmin || $targetUserId !== null) {
            $query->where('user_id', $targetUserId);
        }

        return $query->get()->map(function (object $account) use ($hasPhoneNumber) {
            return [
                'id' => $account->id,
                'user_id' => $account->user_id,
                'name' => $account->business_name ?: $account->name,
                'account_name' => $account->name,
                'business_name' => $account->business_name,
                'waba_id' => $account->waba_id,
                'phone_number' => $hasPhoneNumber
                    ? ($account->phone_number ?? $account->waba_id)
                    : $account->waba_id,
                'status' => $account->status,
            ];
        })->values()->all();
    }

    /**
     * Load workflows (with start trigger keyword & session count) for the selected account/user.
     */
    private function loadWorkflowsWithCounts(
        ?int $targetUserId,
        bool $isSuperAdmin,
        ?int $accountId,
        ?Carbon $from,
        ?Carbon $to
    ): array {
        $query = DB::table('workflows as w')
            ->leftJoin('bots as b', 'b.id', '=', 'w.bot_id')
            ->leftJoin('whatsapp_accounts as wa', 'wa.id', '=', 'w.whatsapp_account_id')
            ->where('w.channel', 'whatsapp')
            ->select([
                'w.id',
                'w.name',
                'w.status',
                'w.user_id',
                'w.bot_id',
                'w.whatsapp_account_id',
                'b.name as bot_name',
                'b.whatsapp_account_id as bot_whatsapp_account_id',
                'wa.name as account_name',
                'wa.business_name as account_business_name',
            ])
            ->orderBy('w.name');

        if (!$isSuperAdmin || $targetUserId !== null) {
            $query->where('w.user_id', $targetUserId);
        }

        if ($accountId !== null) {
            $query->where(function ($q) use ($accountId) {
                $q->where('w.whatsapp_account_id', $accountId)
                    ->orWhere('b.whatsapp_account_id', $accountId);
            });
        }

        $workflows = $query->get();
        $workflowIds = $workflows->pluck('id')->all();

        $startNodes = empty($workflowIds)
            ? collect()
            : DB::table('workflow_nodes')
                ->whereIn('workflow_id', $workflowIds)
                ->where('node_type', 'start')
                ->orderBy('id')
                ->get(['workflow_id', 'configuration'])
                ->unique('workflow_id')
                ->keyBy('workflow_id');

        $sessionCounts = collect();
        if (!empty($workflowIds)) {
            $countQuery = DB::table('bot_sessions')
                ->whereIn('bot_sessions.workflow_id', $workflowIds)
                ->select('bot_sessions.workflow_id', DB::raw('COUNT(*) as total'));

            if ($accountId !== null) {
                $countQuery->where(function ($q) use ($accountId) {
                    $q->where('bot_sessions.whatsapp_account_id', $accountId)
                        ->orWhereNull('bot_sessions.whatsapp_account_id');
                });
            }

            if ($from !== null && $to !== null) {
                $this->applySessionDateFilter($countQuery, $from, $to);
            }

            $sessionCounts = $countQuery->groupBy('bot_sessions.workflow_id')->pluck('total', 'workflow_id');
        }

        return $workflows->map(function (object $workflow) use ($sessionCounts, $startNodes) {
            $startNode = $startNodes->get($workflow->id);
            $config = $this->decodeJsonField($startNode?->configuration);

            $trigger = '';
            if (!empty($config)) {
                $trigger = trim((string) (
                    $config['triggerText']
                    ?? $config['trigger']
                    ?? $config['trigger_message']
                    ?? $config['keyword']
                    ?? ''
                ));
            }

            $effectiveAccountId = $workflow->whatsapp_account_id
                ?? $workflow->bot_whatsapp_account_id;

            return [
                'id' => $workflow->id,
                'name' => $workflow->name,
                'status' => $workflow->status,
                'user_id' => $workflow->user_id,
                'bot_id' => $workflow->bot_id,
                'bot_name' => $workflow->bot_name,
                'whatsapp_account_id' => $effectiveAccountId,
                'account_name' => $workflow->account_business_name ?: $workflow->account_name,
                'trigger_keyword' => $trigger,
                'sessions_count' => (int) ($sessionCounts[$workflow->id] ?? 0),
            ];
        })->values()->all();
    }

    /**
     * Build direct SQL query enforcing ownership, workflow, account, date, status, and search.
     */
    private function buildSessionBaseQuery(
        ?int $targetUserId,
        bool $isSuperAdmin,
        ?int $accountId,
        ?int $workflowId,
        ?Carbon $from,
        ?Carbon $to,
        ?string $status,
        ?string $search
    ) {
        $query = DB::table('bot_sessions')
            ->leftJoin('workflows as wf', 'wf.id', '=', 'bot_sessions.workflow_id')
            ->where('bot_sessions.channel', 'whatsapp');

        if (!$isSuperAdmin || $targetUserId !== null) {
            $query->where(function ($q) use ($targetUserId) {
                $q->where('bot_sessions.user_id', $targetUserId)
                    ->orWhere('wf.user_id', $targetUserId);
            });
        }

        if ($workflowId !== null) {
            $query->where('bot_sessions.workflow_id', $workflowId);
        }

        if ($accountId !== null) {
            $query->where(function ($q) use ($accountId) {
                $q->where('bot_sessions.whatsapp_account_id', $accountId)
                    ->orWhere(function ($sq) use ($accountId) {
                        $sq->whereNull('bot_sessions.whatsapp_account_id')
                            ->where('wf.whatsapp_account_id', $accountId);
                    });
            });
        }

        if ($from !== null && $to !== null) {
            $this->applySessionDateFilter($query, $from, $to);
        }

        if (!empty($status) && strtolower($status) !== 'all') {
            $query->where('bot_sessions.status', strtolower($status));
        }

        $cleanSearch = trim((string) $search);
        if ($cleanSearch !== '') {
            $query->where(function ($q) use ($cleanSearch) {
                $q->where('bot_sessions.user_identifier', 'like', "%{$cleanSearch}%")
                    ->orWhere('bot_sessions.variables', 'like', "%{$cleanSearch}%")
                    ->orWhere('wf.name', 'like', "%{$cleanSearch}%")
                    ->orWhereExists(function ($mq) use ($cleanSearch) {
                        $mq->selectRaw('1')
                            ->from('bot_messages as bm_search')
                            ->whereColumn('bm_search.bot_session_id', 'bot_sessions.id')
                            ->where('bm_search.text', 'like', "%{$cleanSearch}%");
                    });
            });
        }

        return $query;
    }

    /**
     * Attach optional metadata LEFT JOINs (bot & WhatsApp account) for display formatting.
     */
    private function attachSessionDisplayJoins($query)
    {
        return $query
            ->leftJoin('bots as b', 'b.id', '=', 'wf.bot_id')
            ->leftJoin('whatsapp_accounts as wa', 'wa.id', '=', DB::raw('COALESCE(bot_sessions.whatsapp_account_id, wf.whatsapp_account_id)'));
    }

    /**
     * Fetch a single session row with display joins using a direct query.
     */
    private function loadSessionRowById(int $sessionId): ?object
    {
        return DB::table('bot_sessions')
            ->leftJoin('workflows as wf', 'wf.id', '=', 'bot_sessions.workflow_id')
            ->leftJoin('bots as b', 'b.id', '=', 'wf.bot_id')
            ->leftJoin('whatsapp_accounts as wa', 'wa.id', '=', DB::raw('COALESCE(bot_sessions.whatsapp_account_id, wf.whatsapp_account_id)'))
            ->where('bot_sessions.id', $sessionId)
            ->select([
                'bot_sessions.id',
                'bot_sessions.user_id',
                'bot_sessions.bot_id',
                'bot_sessions.workflow_id',
                'bot_sessions.whatsapp_account_id',
                'bot_sessions.user_identifier',
                'bot_sessions.status',
                'bot_sessions.current_node_id',
                'bot_sessions.variables',
                'bot_sessions.last_message_at',
                'bot_sessions.created_at',
                'bot_sessions.updated_at',
                'wf.name as workflow_name',
                'wf.bot_id as workflow_bot_id',
                'wf.whatsapp_account_id as workflow_whatsapp_account_id',
                'b.name as bot_name',
                'wa.name as account_name',
                'wa.business_name as account_business_name',
                'wa.waba_id as account_waba_id',
            ])
            ->first();
    }

    /**
     * Filter sessions by activity date window (last_message_at, created_at, or indexed message exists).
     */
    private function applySessionDateFilter($query, Carbon $from, Carbon $to): void
    {
        $query->where(function ($q) use ($from, $to) {
            $q->whereBetween('bot_sessions.last_message_at', [$from, $to])
                ->orWhere(function ($sq) use ($from, $to) {
                    $sq->whereNull('bot_sessions.last_message_at')
                        ->whereBetween('bot_sessions.created_at', [$from, $to]);
                })
                ->orWhereExists(function ($mq) use ($from, $to) {
                    $mq->selectRaw('1')
                        ->from('bot_messages as bm_date')
                        ->whereColumn('bm_date.bot_session_id', 'bot_sessions.id')
                        ->whereBetween('bm_date.created_at', [$from, $to]);
                });
        });
    }

    /**
     * Resolve start & end Carbon bounds from preset period or custom dates.
     *
     * @return array{0: ?Carbon, 1: ?Carbon}
     */
    private function resolveDateRange(string $period, ?string $fromStr, ?string $toStr): array
    {
        $period = strtolower(trim($period));

        return match ($period) {
            'today' => [now()->startOfDay(), now()->endOfDay()],
            'yesterday' => [now()->subDay()->startOfDay(), now()->subDay()->endOfDay()],
            '7d' => [now()->subDays(6)->startOfDay(), now()->endOfDay()],
            '30d' => [now()->subDays(29)->startOfDay(), now()->endOfDay()],
            'month', 'this_month' => [now()->startOfMonth(), now()->endOfDay()],
            'last_month' => [now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth()],
            'custom' => [
                $fromStr ? Carbon::parse($fromStr)->startOfDay() : null,
                $toStr ? Carbon::parse($toStr)->endOfDay() : null,
            ],
            default => [null, null],
        };
    }

    /**
     * Compute aggregate message analytics in a single SQL JOIN subquery (zero ID plucking in PHP).
     */
    private function buildAggregateAnalyticsFromBaseQuery($baseQuery, int $totalConversations): array
    {
        $empty = [
            'total_conversations' => $totalConversations,
            'total_messages' => 0,
            'bot_messages' => 0,
            'user_messages' => 0,
            'interactive_messages' => 0,
            'sent_count' => 0,
            'delivered_count' => 0,
            'read_count' => 0,
            'failed_count' => 0,
        ];

        if ($totalConversations <= 0) {
            return $empty;
        }

        $filteredSessions = (clone $baseQuery)->select('bot_sessions.id as matched_session_id');

        $row = DB::table('bot_messages as bm')
            ->joinSub($filteredSessions, 'fs', function ($join) {
                $join->on('fs.matched_session_id', '=', 'bm.bot_session_id');
            })
            ->selectRaw("
                COUNT(*) as total_messages,
                SUM(CASE WHEN bm.direction = 'outbound' THEN 1 ELSE 0 END) as bot_messages,
                SUM(CASE WHEN bm.direction = 'inbound' THEN 1 ELSE 0 END) as user_messages,
                SUM(CASE WHEN bm.message_type IN ('menu', 'button', 'interactive', 'list') THEN 1 ELSE 0 END) as interactive_messages,
                SUM(CASE WHEN bm.direction = 'outbound' AND bm.delivery_status IN ('sent', 'delivered', 'read') THEN 1 ELSE 0 END) as sent_count,
                SUM(CASE WHEN bm.direction = 'outbound' AND bm.delivery_status IN ('delivered', 'read') THEN 1 ELSE 0 END) as delivered_count,
                SUM(CASE WHEN bm.direction = 'outbound' AND bm.delivery_status = 'read' THEN 1 ELSE 0 END) as read_count,
                SUM(CASE WHEN bm.direction = 'outbound' AND bm.delivery_status IN ('failed', 'error') THEN 1 ELSE 0 END) as failed_count
            ")
            ->first();

        if (!$row) {
            return $empty;
        }

        return [
            'total_conversations' => $totalConversations,
            'total_messages' => (int) ($row->total_messages ?? 0),
            'bot_messages' => (int) ($row->bot_messages ?? 0),
            'user_messages' => (int) ($row->user_messages ?? 0),
            'interactive_messages' => (int) ($row->interactive_messages ?? 0),
            'sent_count' => (int) ($row->sent_count ?? 0),
            'delivered_count' => (int) ($row->delivered_count ?? 0),
            'read_count' => (int) ($row->read_count ?? 0),
            'failed_count' => (int) ($row->failed_count ?? 0),
        ];
    }

    /**
     * Fetch per-session message counts (and optional latest message preview) via direct SQL.
     */
    private function getPerSessionMessageMetrics(array $sessionIds, bool $includeLatestPreview = true): array
    {
        if (empty($sessionIds)) {
            return [];
        }

        $aggregates = DB::table('bot_messages')
            ->whereIn('bot_session_id', $sessionIds)
            ->groupBy('bot_session_id')
            ->selectRaw("
                bot_session_id,
                COUNT(*) as total_messages,
                SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as bot_messages,
                SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as user_messages,
                SUM(CASE WHEN message_type IN ('menu', 'button', 'interactive', 'list') THEN 1 ELSE 0 END) as interactive_messages,
                SUM(CASE WHEN direction = 'outbound' AND delivery_status IN ('failed', 'error') THEN 1 ELSE 0 END) as failed_count,
                MAX(id) as latest_message_id
            ")
            ->get()
            ->keyBy('bot_session_id');

        $latestMessages = collect();
        if ($includeLatestPreview) {
            $latestIds = $aggregates->pluck('latest_message_id')->filter()->values()->all();
            if (!empty($latestIds)) {
                $latestMessages = DB::table('bot_messages')
                    ->whereIn('id', $latestIds)
                    ->get([
                        'id',
                        'direction',
                        'message_type',
                        'text',
                        'payload',
                        'external_message_id',
                        'delivery_status',
                        'created_at',
                    ])
                    ->keyBy('id');
            }
        }

        $result = [];
        foreach ($sessionIds as $sessionId) {
            $agg = $aggregates->get($sessionId);
            $latest = $includeLatestPreview && $agg && $agg->latest_message_id
                ? $latestMessages->get($agg->latest_message_id)
                : null;
            $formattedLatest = $latest ? $this->formatMessage($latest) : null;

            $result[$sessionId] = [
                'total_messages' => (int) ($agg->total_messages ?? 0),
                'bot_messages' => (int) ($agg->bot_messages ?? 0),
                'user_messages' => (int) ($agg->user_messages ?? 0),
                'interactive_messages' => (int) ($agg->interactive_messages ?? 0),
                'failed_count' => (int) ($agg->failed_count ?? 0),
                'last_message_text' => $formattedLatest['preview_text'] ?? null,
                'last_message_direction' => $latest?->direction,
                'last_message_type' => $latest?->message_type,
                'last_message_at' => $this->toCarbon($latest?->created_at)?->toIso8601String(),
            ];
        }

        return $result;
    }

    /**
     * Format a session row for the left conversation list.
     */
    private function formatSessionListItem(object $session, ?array $metrics): array
    {
        $lastActivity = $session->last_message_at
            ?? ($metrics['last_message_at'] ?? null)
            ?? $session->updated_at
            ?? $session->created_at;

        $lastActivityCarbon = $this->toCarbon($lastActivity);
        $createdCarbon = $this->toCarbon($session->created_at);
        $vars = $this->decodeJsonField($session->variables);

        $workflowName = $session->workflow_name ?? $session->workflow?->name ?? 'Unassigned Workflow';
        $botId = $session->bot_id ?? $session->workflow_bot_id ?? $session->workflow?->bot_id ?? null;
        $botName = $session->bot_name ?? $session->workflow?->bot?->name ?? null;
        $accountId = $session->whatsapp_account_id
            ?? $session->workflow_whatsapp_account_id
            ?? $session->workflow?->whatsapp_account_id
            ?? null;
        $accountName = ($session->account_business_name ?? $session->whatsappAccount?->business_name ?? null)
            ?: ($session->account_name ?? $session->whatsappAccount?->name ?? null);

        return [
            'id' => $session->id,
            'user_identifier' => $session->user_identifier,
            'display_name' => $this->extractDisplayName($session),
            'workflow_id' => $session->workflow_id,
            'workflow_name' => $workflowName,
            'bot_id' => $botId,
            'bot_name' => $botName,
            'whatsapp_account_id' => $accountId,
            'account_name' => $accountName,
            'status' => $session->status,
            'current_node_id' => $session->current_node_id,
            'variables' => $vars,
            'total_messages' => $metrics['total_messages'] ?? 0,
            'bot_messages' => $metrics['bot_messages'] ?? 0,
            'user_messages' => $metrics['user_messages'] ?? 0,
            'interactive_messages' => $metrics['interactive_messages'] ?? 0,
            'failed_count' => $metrics['failed_count'] ?? 0,
            'last_message_text' => $metrics['last_message_text'] ?? null,
            'last_message_direction' => $metrics['last_message_direction'] ?? null,
            'last_message_type' => $metrics['last_message_type'] ?? null,
            'last_message_at' => $lastActivityCarbon?->toIso8601String(),
            'last_message_human' => $lastActivityCarbon?->diffForHumans(),
            'created_at' => $createdCarbon?->toIso8601String(),
        ];
    }

    /**
     * Format full session metadata for the center & right panels.
     */
    private function formatSessionDetail(object $session, array $analytics): array
    {
        $lastAt = $this->toCarbon($session->last_message_at ?? $session->updated_at ?? $session->created_at);
        $createdAt = $this->toCarbon($session->created_at);
        $vars = $this->decodeJsonField($session->variables);

        $workflowName = $session->workflow_name ?? $session->workflow?->name ?? 'Unassigned Workflow';
        $botId = $session->bot_id ?? $session->workflow_bot_id ?? $session->workflow?->bot_id ?? null;
        $botName = $session->bot_name ?? $session->workflow?->bot?->name ?? null;
        $accountId = $session->whatsapp_account_id
            ?? $session->workflow_whatsapp_account_id
            ?? $session->workflow?->whatsapp_account_id
            ?? null;
        $accountName = ($session->account_business_name ?? $session->whatsappAccount?->business_name ?? null)
            ?: ($session->account_name ?? $session->whatsappAccount?->name ?? null);
        $accountNumber = $session->account_waba_id ?? $session->whatsappAccount?->waba_id ?? null;

        return [
            'id' => $session->id,
            'user_identifier' => $session->user_identifier,
            'display_name' => $this->extractDisplayName($session),
            'workflow_id' => $session->workflow_id,
            'workflow_name' => $workflowName,
            'bot_id' => $botId,
            'bot_name' => $botName,
            'whatsapp_account_id' => $accountId,
            'account_name' => $accountName,
            'account_number' => $accountNumber,
            'status' => $session->status,
            'current_node_id' => $session->current_node_id,
            'variables' => $vars,
            'last_message_at' => $lastAt?->toIso8601String(),
            'last_message_formatted' => $lastAt?->format('d M Y, h:i A'),
            'created_at' => $createdAt?->toIso8601String(),
            'analytics' => $analytics,
        ];
    }

    /**
     * Compute Message Analytics for a single session's formatted messages.
     */
    private function computeSessionAnalytics(array $formattedMessages): array
    {
        $total = count($formattedMessages);
        $botCount = 0;
        $userCount = 0;
        $interactiveCount = 0;
        $sentCount = 0;
        $deliveredCount = 0;
        $readCount = 0;
        $failedCount = 0;

        foreach ($formattedMessages as $msg) {
            if ($msg['direction'] === 'outbound') {
                $botCount++;
                $status = strtolower((string) ($msg['delivery_status'] ?? ''));
                if (in_array($status, ['sent', 'delivered', 'read'], true)) {
                    $sentCount++;
                }
                if (in_array($status, ['delivered', 'read'], true)) {
                    $deliveredCount++;
                }
                if ($status === 'read') {
                    $readCount++;
                }
                if (in_array($status, ['failed', 'error'], true)) {
                    $failedCount++;
                }
            } else {
                $userCount++;
            }

            if (!empty($msg['is_interactive'])) {
                $interactiveCount++;
            }
        }

        return [
            'total_messages' => $total,
            'bot_messages' => $botCount,
            'user_messages' => $userCount,
            'interactive_messages' => $interactiveCount,
            'sent_count' => $sentCount,
            'delivered_count' => $deliveredCount,
            'read_count' => $readCount,
            'failed_count' => $failedCount,
        ];
    }

    /**
     * Normalize a bot_messages row (stdClass or Model, including payload JSON variants) for the mobile chat UI.
     */
    private function formatMessage(object $message): array
    {
        $payload = $this->decodeJsonField($message->payload ?? null);

        $type = strtolower((string) ($message->message_type ?: 'text'));
        $rawText = (string) ($message->text ?? '');

        $options = $this->extractMenuOptions($payload);
        $buttons = $this->extractButtons($payload);
        $media = $this->extractMedia($type, $rawText, $payload);
        $template = $this->extractTemplate($type, $rawText, $payload);

        $displayText = $this->resolveDisplayText($message->direction, $type, $rawText, $payload, $media, $template);
        $previewText = $displayText !== '' ? $displayText : ($media['filename'] ?? ucfirst($type) . ' message');

        $deliveryStatus = $this->resolveDeliveryStatus($message, $payload);
        $errorReason = $deliveryStatus === 'failed' ? $this->extractErrorReason($payload) : null;

        $isInteractive = in_array($type, ['menu', 'button', 'interactive', 'list'], true)
            || !empty($options)
            || !empty($buttons)
            || !empty(data_get($payload, 'interactive'));

        $createdAt = $this->toCarbon($message->created_at ?? null);

        return [
            'id' => $message->id,
            'direction' => $message->direction,
            'message_type' => $type,
            'display_text' => $displayText,
            'preview_text' => $previewText,
            'delivery_status' => $deliveryStatus,
            'error_reason' => $errorReason,
            'external_message_id' => $message->external_message_id,
            'is_interactive' => $isInteractive,
            'options' => $options,
            'buttons' => $buttons,
            'media' => $media,
            'template' => $template,
            'created_at' => $createdAt?->toIso8601String(),
            'date_label' => $createdAt?->isToday()
                ? 'TODAY'
                : ($createdAt?->isYesterday()
                    ? 'YESTERDAY'
                    : ($createdAt?->format('d M Y') ?? '')),
            'time_label' => $createdAt?->format('h:i A') ?? '',
        ];
    }

    /**
     * Resolve human-readable message text (fixes raw source-option-N handles on interactive replies).
     */
    private function resolveDisplayText(
        string $direction,
        string $type,
        string $rawText,
        array $payload,
        ?array $media,
        ?array $template
    ): string {
        if ($direction === 'inbound') {
            $interactiveTitle = data_get($payload, 'interactive.title')
                ?? data_get($payload, 'interactive.button_reply.title')
                ?? data_get($payload, 'interactive.list_reply.title')
                ?? data_get($payload, 'eventContent.message.interactive.button_reply.title')
                ?? data_get($payload, 'eventContent.message.interactive.list_reply.title')
                ?? data_get($payload, 'entry.0.changes.0.value.messages.0.interactive.button_reply.title')
                ?? data_get($payload, 'entry.0.changes.0.value.messages.0.interactive.list_reply.title');

            if (is_string($interactiveTitle) && trim($interactiveTitle) !== '') {
                if ($rawText === '' || preg_match('/^source-option-\d+$/i', trim($rawText))) {
                    return trim($interactiveTitle);
                }
            }
        }

        if ($media && !empty($media['url']) && trim($rawText) === trim((string) $media['url'])) {
            return (string) ($media['caption'] ?? '');
        }

        if ($rawText !== '') {
            return $rawText;
        }

        return (string) (
            $payload['message']
            ?? $template['body']
            ?? $media['caption']
            ?? ''
        );
    }

    private function extractMenuOptions(array $payload): array
    {
        $raw = $payload['options']
            ?? $payload['menuOptions']
            ?? $payload['menu_options']
            ?? data_get($payload, 'payload.message.content.list.sections.0.rows')
            ?? [];

        if (!is_array($raw)) {
            return [];
        }

        $options = [];
        foreach ($raw as $index => $option) {
            if (!is_array($option)) {
                continue;
            }
            $label = trim((string) ($option['label'] ?? $option['title'] ?? $option['text'] ?? ''));
            if ($label === '') {
                continue;
            }
            $options[] = [
                'id' => $option['id'] ?? $option['source_handle'] ?? "option-{$index}",
                'title' => $label,
            ];
        }

        return $options;
    }

    private function extractButtons(array $payload): array
    {
        $raw = $payload['buttons']
            ?? data_get($payload, 'payload.message.content.mediaTemplate.buttons')
            ?? data_get($payload, 'payload.message.content.interactive.buttons')
            ?? [];

        if (!is_array($raw)) {
            return [];
        }

        $buttons = [];
        foreach ($raw as $index => $button) {
            if (!is_array($button)) {
                continue;
            }
            $title = trim((string) ($button['title'] ?? $button['text'] ?? $button['label'] ?? ''));
            if ($title === '') {
                continue;
            }
            $buttons[] = [
                'id' => $button['id'] ?? $button['source_handle'] ?? "btn-{$index}",
                'type' => strtolower((string) ($button['type'] ?? 'reply')),
                'title' => $title,
                'url' => $button['url'] ?? null,
            ];
        }

        return $buttons;
    }

    private function extractMedia(string $type, string $rawText, array $payload): ?array
    {
        $templateMedia = data_get($payload, 'payload.message.content.mediaTemplate.media');
        if (is_array($templateMedia) && !empty($templateMedia['url'])) {
            return [
                'type' => strtolower((string) ($templateMedia['type'] ?? 'image')),
                'url' => $templateMedia['url'],
                'filename' => basename((string) parse_url((string) $templateMedia['url'], PHP_URL_PATH)) ?: null,
                'caption' => data_get($payload, 'payload.message.content.mediaTemplate.caption'),
            ];
        }

        $contentMedia = data_get($payload, 'payload.message.content.media')
            ?? data_get($payload, 'payload.message.content.attachment');

        $url = data_get($contentMedia, 'url')
            ?? data_get($payload, 'media_url')
            ?? data_get($payload, 'mediaUrl')
            ?? data_get($payload, 'url');

        if (!$url && in_array($type, ['image', 'video', 'audio', 'document', 'pdf'], true) && filter_var($rawText, FILTER_VALIDATE_URL)) {
            $url = $rawText;
        }

        if (!$url) {
            return null;
        }

        $mediaType = $type === 'pdf' ? 'document' : $type;
        if (!in_array($mediaType, ['image', 'video', 'audio', 'document'], true)) {
            $mediaType = strtolower((string) (data_get($contentMedia, 'type') ?? 'document'));
        }

        return [
            'type' => $mediaType,
            'url' => (string) $url,
            'filename' => data_get($contentMedia, 'fileName')
                ?? data_get($payload, 'filename')
                ?? (basename((string) parse_url((string) $url, PHP_URL_PATH)) ?: 'Document'),
            'caption' => data_get($contentMedia, 'caption') ?? data_get($payload, 'caption'),
        ];
    }

    private function extractTemplate(string $type, string $rawText, array $payload): ?array
    {
        $mediaTemplate = data_get($payload, 'payload.message.content.mediaTemplate');
        if (is_array($mediaTemplate) && !empty($mediaTemplate['templateId'])) {
            return [
                'name' => $mediaTemplate['templateId'],
                'body' => $rawText ?: null,
            ];
        }

        if ($type === 'template' || $type === 'media_template') {
            return [
                'name' => data_get($payload, 'template_id') ?? data_get($payload, 'templateName'),
                'body' => $rawText ?: null,
            ];
        }

        return null;
    }

    private function resolveDeliveryStatus(object $message, array $payload): ?string
    {
        if ($message->direction === 'inbound') {
            return null;
        }

        if (!empty($message->delivery_status)) {
            return strtolower((string) $message->delivery_status);
        }

        if (isset($payload['success']) && $payload['success'] === false) {
            return 'failed';
        }

        if (isset($payload['ok']) && $payload['ok'] === false) {
            return 'failed';
        }

        return $message->external_message_id ? 'sent' : 'pending';
    }

    private function extractErrorReason(array $payload): ?string
    {
        $candidates = [
            data_get($payload, 'message'),
            data_get($payload, 'error_message'),
            data_get($payload, 'whatsapp_response.message'),
            data_get($payload, 'response.statusDesc'),
            data_get($payload, 'data.statusDesc'),
            data_get($payload, 'body.raw'),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return null;
    }

    private function extractDisplayName(object $session): ?string
    {
        $vars = $this->decodeJsonField($session->variables ?? null);
        foreach (['name', 'full_name', 'fullName', 'customer_name', 'first_name'] as $key) {
            if (!empty($vars[$key]) && is_string($vars[$key])) {
                return trim($vars[$key]);
            }
        }

        return null;
    }

    private function decodeJsonField(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    private function toCarbon(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof Carbon) {
            return $value;
        }

        if ($value instanceof \DateTimeInterface) {
            return Carbon::instance($value);
        }

        try {
            return Carbon::parse((string) $value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function canAccessWorkflow(User $user, int $workflowId, bool $isSuperAdmin): bool
    {
        if ($isSuperAdmin) {
            return DB::table('workflows')->where('id', $workflowId)->exists();
        }

        $hasUserId = Schema::hasColumn('workflows', 'user_id');
        $hasCreatedBy = Schema::hasColumn('workflows', 'created_by');

        return DB::table('workflows')
            ->where('id', $workflowId)
            ->where(function ($q) use ($user, $hasUserId, $hasCreatedBy) {
                if ($hasUserId) {
                    $q->where('user_id', $user->id);
                }
                if ($hasCreatedBy) {
                    $hasUserId
                        ? $q->orWhere('created_by', $user->id)
                        : $q->where('created_by', $user->id);
                }
                if (!$hasUserId && !$hasCreatedBy) {
                    $q->whereRaw('1 = 0');
                }
            })
            ->exists();
    }

    private function canAccessSession(User $user, BotSession $session): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ((int) $session->user_id === (int) $user->id) {
            return true;
        }

        if ($session->workflow_id) {
            return $this->canAccessWorkflow($user, (int) $session->workflow_id, false);
        }

        return false;
    }
}
