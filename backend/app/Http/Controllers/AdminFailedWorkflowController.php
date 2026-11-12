<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminFailedWorkflowController extends Controller
{
    private string $table = 'workflow_executions';

    /**
     * Build execution query with workflow ownership restrictions.
     */
    private function baseQuery($user)
    {
        abort_unless(
            Schema::hasTable($this->table),
            500,
            'Workflow executions table does not exist.'
        );

        abort_unless(
            Schema::hasTable('workflows'),
            500,
            'Workflows table does not exist.'
        );

        abort_unless(
            Schema::hasColumn($this->table, 'workflow_id'),
            500,
            'Workflow executions table has no workflow_id column.'
        );

        $hasTenantId = Schema::hasColumn('workflows', 'tenant_id');
        $hasCreatedBy = Schema::hasColumn('workflows', 'created_by');
        $hasUserId = Schema::hasColumn('workflows', 'user_id');

        $select = [
            'e.*',
            'w.name as workflow_name',
        ];
        if ($hasTenantId) {
            $select[] = 'w.tenant_id as workflow_tenant_id';
        }
        if ($hasCreatedBy) {
            $select[] = 'w.created_by as workflow_created_by';
        }
        if ($hasUserId) {
            $select[] = 'w.user_id as workflow_user_id';
        }

        $query = DB::table('workflow_executions as e')
            ->join('workflows as w', 'w.id', '=', 'e.workflow_id')
            ->select($select);

        // Super admin can view all executions.
        if (strtolower((string) ($user->role ?? '')) === 'super_admin') {
            return $query;
        }

        // Tenant users can view executions belonging to their tenant.
        if ($user->tenant_id !== null && $hasTenantId) {
            return $query->where('w.tenant_id', $user->tenant_id);
        }

        if ($hasUserId && $hasCreatedBy) {
            return $query->where(function ($q) use ($user) {
                $q->where('w.user_id', $user->id)
                    ->orWhere('w.created_by', $user->id);
            });
        }

        if ($hasUserId) {
            return $query->where('w.user_id', $user->id);
        }

        if ($hasCreatedBy) {
            return $query->where('w.created_by', $user->id);
        }

        abort(
            403,
            'Workflow access is not configured. Set workflow ownership before viewing failed executions.'
        );
    }

    /**
     * List failed workflow executions with filters and pagination.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', 'string', 'in:failed,running,success'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        abort_unless(
            Schema::hasColumn($this->table, 'status'),
            500,
            'The workflow_executions table has no status column.'
        );

        $query = $this->baseQuery($user);

        // Default view: failed executions.
        $status = $validated['status'] ?? 'failed';

        if ($status !== '') {
            $query->where('e.status', $status);
        }

        // Search execution ID, workflow ID/name and error message (exact match when numeric for index speed).
        if (!empty($validated['search'])) {
            $search = trim((string) $validated['search']);
            $hasErrorColumn = Schema::hasColumn('workflow_executions', 'error_message');
            $isNumeric = ctype_digit($search);

            $query->where(function ($q) use ($search, $hasErrorColumn, $isNumeric) {
                if ($isNumeric) {
                    $q->where('e.id', (int) $search)
                        ->orWhere('e.workflow_id', (int) $search);
                } else {
                    $q->where('e.id', 'like', "%{$search}%")
                        ->orWhere('e.workflow_id', 'like', "%{$search}%");
                }

                $q->orWhere('w.name', 'like', "%{$search}%");

                if ($hasErrorColumn) {
                    $q->orWhere('e.error_message', 'like', "%{$search}%");
                }
            });
        }

        if (!empty($validated['from'])) {
            $query->where('e.created_at', '>=', Carbon::parse($validated['from'])->startOfDay());
        }

        if (!empty($validated['to'])) {
            $query->where('e.created_at', '<=', Carbon::parse($validated['to'])->endOfDay());
        }

        $perPage = max(1, (int) ($validated['per_page'] ?? 10));
        $currentPage = max(1, (int) ($validated['page'] ?? 1));
        $total = (int) (clone $query)->count('e.id');
        $lastPage = max(1, (int) ceil($total / $perPage));
        $currentPage = min($currentPage, $lastPage);
        $offset = ($currentPage - 1) * $perPage;

        $rows = $total === 0
            ? collect()
            : $query
                ->orderByDesc('e.created_at')
                ->orderByDesc('e.id')
                ->offset($offset)
                ->limit($perPage)
                ->get();

        $transformed = $rows->map(function ($item) {
            $row = (array) $item;

            $row['workflow'] = [
                'name' => $row['workflow_name'] ?? 'Unnamed workflow',
            ];

            $row['error_message'] = $row['error_message'] ?? null;

            // This table does not contain failed_at.
            $row['failed_at'] = $row['finished_at']
                ?? $row['updated_at']
                ?? $row['created_at']
                ?? null;

            return $row;
        })->values();

        return response()->json([
            'success' => true,
            'message' => 'Failed workflow executions retrieved successfully.',
            'data' => [
                'current_page' => $currentPage,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
                'data' => $transformed,
            ],
        ]);
    }

    /**
     * Show one execution's details.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $execution = $this->baseQuery($user)
            ->where('e.id', $id)
            ->first();

        abort_unless($execution, 404, 'Workflow execution not found.');

        $row = (array) $execution;

        $row['workflow'] = [
            'name' => $row['workflow_name'] ?? 'Unnamed workflow',
        ];

        $row['error_message'] = $row['error_message'] ?? null;

        $row['failed_at'] = $row['finished_at']
            ?? $row['updated_at']
            ?? $row['created_at']
            ?? null;

        return response()->json([
            'success' => true,
            'message' => 'Workflow execution retrieved successfully.',
            'data' => $row,
        ]);
    }

    /**
     * Retry endpoint.
     *
     * Actual WorkflowEngine restart logic is not connected yet.
     */
    public function retry(Request $request, $id)
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $execution = $this->baseQuery($user)
            ->where('e.id', $id)
            ->first();

        abort_unless($execution, 404, 'Workflow execution not found.');

        if (strtolower((string) $execution->status) !== 'failed') {
            return response()->json([
                'success' => false,
                'message' => 'Only failed executions can be retried.',
            ], 422);
        }

        return response()->json([
            'success' => false,
            'message' => 'Retry is not connected to WorkflowEngine yet.',
        ], 501);
    }
}
