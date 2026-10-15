<?php

namespace App\Http\Controllers;

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

        $query = DB::table('workflow_executions as e')
            ->join('workflows as w', 'w.id', '=', 'e.workflow_id')
            ->select([
                'e.*',
                'w.name as workflow_name',
                'w.tenant_id as workflow_tenant_id',
                'w.created_by as workflow_created_by',
            ]);

        // Super admin can view all executions.
        if ($user->role === 'super_admin') {
            return $query;
        }

        // Tenant users can view executions belonging to their tenant.
        if ($user->tenant_id !== null) {
            return $query->where('w.tenant_id', $user->tenant_id);
        }

        // Users without a tenant can view only workflows they created.
        if (Schema::hasColumn('workflows', 'created_by')) {
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

        // Search execution ID, workflow ID/name and error message.
        if (!empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($q) use ($search) {
                $q->where('e.id', 'like', "%{$search}%")
                    ->orWhere('e.workflow_id', 'like', "%{$search}%")
                    ->orWhere('w.name', 'like', "%{$search}%");

                if (Schema::hasColumn('workflow_executions', 'error_message')) {
                    $q->orWhere('e.error_message', 'like', "%{$search}%");
                }
            });
        }

        if (!empty($validated['from'])) {
            $query->whereDate('e.created_at', '>=', $validated['from']);
        }

        if (!empty($validated['to'])) {
            $query->whereDate('e.created_at', '<=', $validated['to']);
        }

        $paginator = $query
            ->orderByDesc('e.created_at')
            ->paginate($validated['per_page'] ?? 10)
            ->withQueryString();

        $paginator->getCollection()->transform(function ($item) {
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
        });

        return response()->json([
            'success' => true,
            'message' => 'Failed workflow executions retrieved successfully.',
            'data' => $paginator,
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
