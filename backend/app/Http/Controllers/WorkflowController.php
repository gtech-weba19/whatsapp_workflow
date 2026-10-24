<?php

namespace App\Http\Controllers;

use App\Models\Workflow;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkflowController extends Controller
{
    /**
     * List workflows for the current user.
     * Clients only see their own workflows!
     */
 public function index(Request $request)
{
    $user = $request->user();

    if (!$user) {
        return response()->json([
            'message' => 'Unauthenticated.',
        ], 401);
    }

    $role = strtolower(trim((string) (
        $user->role ?? $user->role_name ?? ''
    )));

    $isSuperAdmin = $role === 'super_admin'
        || (
            method_exists($user, 'isSuperAdmin')
            && $user->isSuperAdmin()
        );

    $query = Workflow::query()
        ->withCount('nodes')
        ->latest();

        if (!$isSuperAdmin) {
            $query->where('user_id', $user->id);
        } elseif ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

    if ($request->filled('bot_id')) {
        $query->where('bot_id', $request->bot_id);
    }

    if ($request->filled('search')) {
        $search = trim($request->search);

        $query->where('name', 'like', "%{$search}%");
    }

    return response()->json($query->paginate(50));
}
/**
 * Store a new workflow assigned strictly to the current user
 */
public function store(Request $request)
{
    $data = $request->validate([
        'name'        => 'required|string|max:150',
        'description' => 'nullable|string',
        'channel'     => 'nullable|string',
        'bot_id'      => 'nullable|integer',
        'whatsapp_account_id'  => 'nullable|integer|exists:whatsapp_accounts,id',
    ]);

    $user = $request->user() ?? auth()->user();

    if (!$user) {
        return response()->json([
            'message' => 'Unauthenticated.',
        ], 401);
    }

    // Save workflow using the logged-in user's ID
    $data['user_id'] = $user->id;
    // $data['created_by'] = $user->id;


    // Do not use tenant_id
    $workflow = Workflow::create($data);

    return response()->json(
        $workflow->load(['nodes', 'edges']),
        201
    );
}
    /**
     * Show a workflow (must belong to current user)
     */
    public function show(Workflow $workflow)
    {
        $this->authorizeWorkflowAccess($workflow);

        return response()->json($workflow->load(['nodes', 'edges']));
    }

    /**
     * Update a workflow (must belong to current user)
     */
    public function update(Request $request, Workflow $workflow)
    {
        $this->authorizeWorkflowAccess($workflow);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'description' => 'nullable|string',
            'channel' => 'nullable|string',
            'status' => 'nullable|in:draft,published,archived',
            'bot_id' => 'nullable|integer',
            'nodes' => 'sometimes|array',
            'edges' => 'sometimes|array',
        ]);

        DB::transaction(function () use ($workflow, $data) {
            $workflow->update(collect($data)->except(['nodes', 'edges'])->all());

            if (array_key_exists('nodes', $data)) {
                $workflow->nodes()->delete();
                foreach ($data['nodes'] as $node) {
                    $workflow->nodes()->create([
                        'node_id' => $node['id'],
                        'node_type' => $node['type'],
                        'label' => $node['data']['label'] ?? $node['type'],
                        'configuration' => $node['data'] ?? [],
                        'position_x' => $node['position']['x'] ?? 0,
                        'position_y' => $node['position']['y'] ?? 0,
                    ]);
                }
            }

            if (array_key_exists('edges', $data)) {
                $workflow->edges()->delete();
                foreach ($data['edges'] as $edge) {
                    $workflow->edges()->create([
                        'edge_id' => $edge['id'],
                        'source' => $edge['source'],
                        'target' => $edge['target'],
                        'source_handle' => $edge['sourceHandle'] ?? null,
                        'label' => $edge['label'] ?? null,
                        'configuration' => $edge,
                    ]);
                }
            }
        });

        return $workflow->fresh()->load(['nodes', 'edges']);
    }

    /**
     * Delete a workflow (must belong to current user)
     */
    public function destroy(Workflow $workflow)
    {
        $this->authorizeWorkflowAccess($workflow);

        $workflow->delete();

        return response()->noContent();
    }

    /**
     * Publish a workflow (must belong to current user)
     */
    public function publish(Workflow $workflow)
    {
        $this->authorizeWorkflowAccess($workflow);

        $workflow->update([
            'status' => 'published',
            'published_at' => now(),
            'version' => $workflow->version + 1,
        ]);

        return $workflow->fresh();
    }

    /**
     * Duplicate a workflow
     */
    public function duplicate(Request $request, Workflow $workflow)
    {
        $this->authorizeWorkflowAccess($workflow);

        $copy = $workflow->replicate(['id']);
        $copy->name = $workflow->name . ' Copy';
        $copy->status = 'draft';
        $copy->user_id = $request->user()->id;
        $copy->created_by = $request->user()->id;
        $copy->save();

        foreach ($workflow->nodes as $node) {
            $copy->nodes()->create(
                $node->only(['node_id', 'node_type', 'label', 'configuration', 'position_x', 'position_y'])
            );
        }

        foreach ($workflow->edges as $edge) {
            $copy->edges()->create(
                $edge->only(['edge_id', 'source', 'target', 'source_handle', 'label', 'configuration'])
            );
        }

        return response()->json($copy->load(['nodes', 'edges']), 201);
    }

    /**
     * Ensure current user owns this workflow or is super admin
     */
   /**
 * Ensure current user owns this workflow or is super admin.
 */
private function authorizeWorkflowAccess(Workflow $workflow): void
{
    $user = request()->user();

    if (!$user) {
        abort(401, 'Unauthenticated.');
    }

    // Check super admin using the actual user role as well.
    $role = strtolower(trim((string) (
        $user->role
        ?? $user->role_name
        ?? ''
    )));

    $isSuperAdmin = $role === 'super_admin';

    if (
        !$isSuperAdmin &&
        method_exists($user, 'isSuperAdmin')
    ) {
        $isSuperAdmin = $user->isSuperAdmin();
    }

    // Super admin can access all workflows.
    if ($isSuperAdmin) {
        return;
    }

    // Normal users can access their own workflows only.
    $ownsWorkflow =
        (int) $workflow->user_id === (int) $user->id
        || (int) $workflow->created_by === (int) $user->id;

    if (!$ownsWorkflow) {
        abort(
            403,
            'Unauthorized. You can only view and manage your own workflows.'
        );
    }
}
}
