<?php
namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AdminAuditLogController extends Controller
{

    private function applyAccessScope($query, $user)
    {
        if ($user->role === 'super_admin') {
            return $query;
        }

        if ($user->tenant_id !== null) {
            return $query->where('tenant_id', $user->tenant_id);
        }

        return $query->where('user_id', $user->id);
    }

    /**
     * List audit logs with search, filters and pagination.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $validated = $request->validate([
            'search'      => ['nullable', 'string', 'max:150'],
            'action'      => ['nullable', 'string', 'max:100'],
            'entity_type' => ['nullable', 'string', 'max:100'],
            'user_id'     => ['nullable', 'integer', 'min:1'],
            'from'        => ['nullable', 'date'],
            'to'          => ['nullable', 'date', 'after_or_equal:from'],
            'per_page'    => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = AuditLog::query()->with([
            'user:id,name,email',
            'tenant:id,name',
        ]);

        // Restrict records according to the authenticated user.
        $this->applyAccessScope($query, $user);

        // Search by action, entity type, entity ID or IP address.
        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('entity_type', 'like', "%{$search}%")
                    ->orWhere('entity_id', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        // Filter by action.
        if (! empty($validated['action'])) {
            $query->where('action', $validated['action']);
        }

        // Filter by entity type.
        if (! empty($validated['entity_type'])) {
            $query->where(
                'entity_type',
                $validated['entity_type']
            );
        }

        // Only super admins can filter across different users.
        if (! empty($validated['user_id'])) {
            if ($user->role === 'super_admin') {
                $query->where('user_id', $validated['user_id']);
            } elseif ($user->tenant_id !== null) {
                // A tenant user can filter only users in their tenant.
                $query->where('user_id', $validated['user_id']);
            } else {
                // A user without a tenant can see only their own logs.
                abort_if(
                    (int) $validated['user_id'] !== (int) $user->id,
                    403,
                    'You cannot view another user\'s audit logs.'
                );

                $query->where('user_id', $user->id);
            }
        }

        // Filter by starting date.
        if (! empty($validated['from'])) {
            $query->whereDate(
                'created_at',
                '>=',
                $validated['from']
            );
        }

        // Filter by ending date.
        if (! empty($validated['to'])) {
            $query->whereDate(
                'created_at',
                '<=',
                $validated['to']
            );
        }

        $logs = $query
            ->latest('created_at')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'message' => 'Audit logs retrieved successfully.',
            'data'    => $logs,
        ]);
    }

    /**
     * Show one audit log.
     */
    public function show(Request $request, AuditLog $auditLog)
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        // Apply the same access rules as the list endpoint.
        $allowedLog = $this->applyAccessScope(
            AuditLog::query(),
            $user
        )->whereKey($auditLog->getKey())->exists();

        abort_unless($allowedLog, 404, 'Audit log not found.');

        $auditLog->load([
            'user:id,name,email',
            'tenant:id,name',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Audit log retrieved successfully.',
            'data'    => $auditLog,
        ]);
    }

    /**
     * Return available filter options.
     */
    public function filters(Request $request)
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $query = $this->applyAccessScope(
            AuditLog::query(),
            $user
        );

        $actions = (clone $query)
            ->whereNotNull('action')
            ->where('action', '!=', '')
            ->distinct()
            ->orderBy('action')
            ->pluck('action')
            ->values();

        $entityTypes = (clone $query)
            ->whereNotNull('entity_type')
            ->where('entity_type', '!=', '')
            ->distinct()
            ->orderBy('entity_type')
            ->pluck('entity_type')
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Audit log filters retrieved successfully.',
            'data'    => [
                'actions'      => $actions,
                'entity_types' => $entityTypes,
            ],
        ]);
    }

/**
 * Delete one audit log.
 */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $log = $this->applyAccessScope(
            AuditLog::query(),
            $user
        )->whereKey($id)->first();

        if (! $log) {
            return response()->json([
                'success' => false,
                'message' => 'Audit log not found or access denied.',
            ], 404);
        }

        $log->delete();

        return response()->json([
            'success' => true,
            'message' => 'Audit log deleted successfully.',
        ]);
    }

/**
 * Delete multiple audit logs.
 */
    public function bulkDestroy(Request $request)
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $validated = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $query = $this->applyAccessScope(
            AuditLog::query(),
            $user
        );

        $deletedCount = $query
            ->whereIn('id', $validated['ids'])
            ->delete();

        return response()->json([
            'success' => true,
            'message' => "{$deletedCount} audit log(s) deleted successfully.",
            'deleted_count' => $deletedCount,
        ]);
    }

}
