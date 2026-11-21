<?php

namespace App\Http\Controllers;

use App\Models\Workflow;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Bot;


class WorkflowController extends Controller
{

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

    // Filter workflows for dashboard: exclude workflows belonging to inactive users or inactive/disconnected WhatsApp accounts
    if ($request->boolean('dashboard_only') || $request->input('scope') === 'dashboard') {
        $query->whereHas('user', function ($uq) {
            $uq->whereNotIn(\Illuminate\Support\Facades\DB::raw("LOWER(COALESCE(status, 'active'))"), [
                'inactive',
                'suspended',
                'blocked',
                'disabled',
                'banned',
            ]);
        });

        $query->where(function ($wq) {
            $wq->whereHas('whatsappAccount', function ($aq) {
                $aq->whereNotIn(\Illuminate\Support\Facades\DB::raw("LOWER(COALESCE(status, ''))"), [
                    'disconnected',
                    'inactive',
                    'blocked',
                    'rejected',
                    'failed',
                    'disabled',
                ])->whereIn(\Illuminate\Support\Facades\DB::raw('LOWER(status)'), [
                    'active',
                    'connected',
                    'approved',
                    'verified',
                    'pending',
                ]);
            })->orWhereHas('bot.whatsappAccount', function ($baq) {
                $baq->whereNotIn(\Illuminate\Support\Facades\DB::raw("LOWER(COALESCE(status, ''))"), [
                    'disconnected',
                    'inactive',
                    'blocked',
                    'rejected',
                    'failed',
                    'disabled',
                ])->whereIn(\Illuminate\Support\Facades\DB::raw('LOWER(status)'), [
                    'active',
                    'connected',
                    'approved',
                    'verified',
                    'pending',
                ]);
            });
        });
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
// public function store(Request $request)
// {
//     $data = $request->validate([
//         'name'        => 'required|string|max:150',
//         'description' => 'nullable|string',
//         'channel'     => 'nullable|string',
//         'bot_id'      => 'nullable|integer',
//         'whatsapp_account_id'  => 'nullable|integer|exists:whatsapp_accounts,id',
//     ]);

//     $user = $request->user() ?? auth()->user();

//     if (!$user) {
//         return response()->json([
//             'message' => 'Unauthenticated.',
//         ], 401);
//     }

//     $data['user_id'] = $user->id;

//     $workflow = Workflow::create($data);

//     return response()->json(
//         $workflow->load(['nodes', 'edges']),
//         201
//     );
// }


public function store(Request $request)
{
    $user = $request->user() ?? auth()->user();

    if (!$user) {
        return response()->json([
            'message' => 'Unauthenticated.',
        ], 401);
    }

    $data = $request->validate([
        'name'        => 'required|string|max:150',
        'description' => 'nullable|string',
        'channel'     => 'nullable|string',
        'bot_id'      => 'required|integer|exists:bots,id',
    ]);


    $bot = Bot::query()
        ->where('id', $data['bot_id'])
        ->where('user_id', $user->id)
        ->first();

    if (!$bot) {
        return response()->json([
            'message' => 'Selected bot does not belong to your account.',
        ], 403);
    }


    $data['user_id'] = $user->id;
    $data['whatsapp_account_id'] = $bot->whatsapp_account_id;

    $workflow = Workflow::create($data);

    return response()->json(
        $workflow->load(['user', 'bot', 'whatsappAccount', 'nodes', 'edges']),
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
            'whatsapp_account_id'  => 'nullable|integer|exists:whatsapp_accounts,id',
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

    // Save frontend edges first.
    foreach ($data['edges'] as $edge) {
        $workflow->edges()->create([
            'edge_id' => $edge['id'] ?? uniqid('edge-', true),
            'source' => $edge['source'],
            'target' => $edge['target'],
            'source_handle' => $edge['sourceHandle'] ?? null,
            'label' => $edge['label'] ?? null,
            'configuration' => $edge,
        ]);
    }

    // Automatically create missing Reply-button edges.
    $nodes = $data['nodes'] ?? $workflow->nodes()
        ->get()
        ->map(fn ($node) => [
            'id' => $node->node_id,
            'type' => $node->node_type,
            'data' => is_array($node->configuration)
                ? $node->configuration
                : json_decode($node->configuration ?? '{}', true),
        ])
        ->all();

    foreach ($nodes as $node) {
        if (($node['type'] ?? '') !== 'button') {
            continue;
        }

        $nodeId = $node['id'] ?? null;
        $config = $node['data'] ?? [];

        $extraButtons = $config['extraButtons'] ?? [];

        if (!$nodeId || empty($extraButtons)) {
            continue;
        }

        // Find the existing default connection.
        $defaultEdge = collect($data['edges'])->first(
            fn ($edge) =>
                ($edge['source'] ?? null) === $nodeId
                && ($edge['sourceHandle'] ?? null) === 'source-bottom'
        );

        if (!$defaultEdge) {
            continue;
        }

        foreach ($extraButtons as $index => $button) {
            if (strtolower($button['type'] ?? 'reply') !== 'reply') {
                continue;
            }

            // Keep the same index convention as the existing engine.
            $handle = 'source-option-' . ($index + 1);

            $alreadyExists = collect($data['edges'])->contains(
                fn ($edge) =>
                    ($edge['source'] ?? null) === $nodeId
                    && ($edge['sourceHandle'] ?? null) === $handle
            );

            if ($alreadyExists) {
                continue;
            }

            $workflow->edges()->create([
                'edge_id' => uniqid('edge-', true),
                'source' => $nodeId,
                'target' => $defaultEdge['target'],
                'source_handle' => $handle,
                'label' => $button['text'] ?? null,
                'configuration' => [
                    'source' => $nodeId,
                    'target' => $defaultEdge['target'],
                    'sourceHandle' => $handle,
                    'label' => $button['text'] ?? null,
                    'auto_generated' => true,
                ],
            ]);
        }
    }
}


            // if (array_key_exists('edges', $data)) {
            //     $workflow->edges()->delete();
            //     foreach ($data['edges'] as $edge) {
            //         $workflow->edges()->create([
            //             'edge_id' => $edge['id'],
            //             'source' => $edge['source'],
            //             'target' => $edge['target'],
            //             'source_handle' => $edge['sourceHandle'] ?? null,
            //             'label' => $edge['label'] ?? null,
            //             'configuration' => $edge,
            //         ]);
            //     }
            // }
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


public function checkTrigger(Request $request)
{
    $request->validate([
        'triggerText' => ['required', 'string', 'max:255'],
        'whatsapp_account_id' => ['required', 'integer'],
        'workflow_id' => ['nullable', 'integer'],
    ]);

    $user = $request->user();

    $account = WhatsAppAccount::where('id', $request->whatsapp_account_id)
        ->where('user_id', $user->id)
        ->first();

    if (!$account) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid WhatsApp account.',
        ], 403);
    }

    $normalize = fn ($value) => mb_strtolower(
        preg_replace('/\s+/', ' ', trim($value))
    );

    $requestedTrigger = $normalize($request->triggerText);

    $workflows = Workflow::where('user_id', $user->id)
        ->where('whatsapp_account_id', $account->id)
        ->where('channel', 'whatsapp')
        ->when(
            $request->workflow_id,
            fn ($query) => $query->where('id', '!=', $request->workflow_id)
        )
        ->with([
            'nodes' => fn ($query) => $query->where('node_type', 'start'),
        ])
        ->get();

    foreach ($workflows as $workflow) {
        foreach ($workflow->nodes as $node) {
            $config = $node->config ?? [];

            if (is_string($config)) {
                $config = json_decode($config, true) ?? [];
            }

            $existingTrigger = $config['trigger']
                ?? $config['triggerText']
                ?? $config['trigger_message']
                ?? '';

            if (
                $existingTrigger !== '' &&
                $normalize($existingTrigger) === $requestedTrigger
            ) {
                return response()->json([
                    'success' => true,
                    'available' => false,
                    'message' => 'This trigger message is already used in another journey.',
                    'workflow_name' => $workflow->name,
                ]);
            }
        }
    }

    return response()->json([
        'success' => true,
        'available' => true,
        'message' => 'Trigger message is available.',
    ]);
}


}
