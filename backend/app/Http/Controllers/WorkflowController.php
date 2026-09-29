<?php

namespace App\Http\Controllers;

use App\Models\Workflow;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkflowController extends Controller
{
    public function index(Request $r)
    {
        return Workflow::withCount('nodes')->latest()->paginate(20);
    }

    public function store(Request $r)
    {
        $d = $r->validate(['name' => 'required|string|max:150', 'description' => 'nullable|string', 'channel' => 'nullable|string']);
        $d['created_by'] = $r->user()->id;
        $w = Workflow::create($d);

        return response()->json($w->load(['nodes', 'edges']), 201);
    }

    public function show(Workflow $workflow)
    {
        return response()->json($workflow->load(['nodes', 'edges']));
    }

    public function update(Request $r, Workflow $workflow)
    {
        $d = $r->validate(['name' => 'sometimes|required|string|max:150', 'description' => 'nullable|string', 'channel' => 'nullable|string', 'status' => 'nullable|in:draft,published,archived', 'nodes' => 'sometimes|array', 'edges' => 'sometimes|array']);
        DB::transaction(function () use ($workflow, $d) {
            $workflow->update(collect($d)->except(['nodes', 'edges'])->all());
            if (array_key_exists('nodes', $d)) {
                $workflow->nodes()->delete();
                foreach ($d['nodes'] as $n) {
                    $workflow->nodes()->create(['node_id' => $n['id'], 'node_type' => $n['type'], 'label' => $n['data']['label'] ?? $n['type'], 'configuration' => $n['data'] ?? [], 'position_x' => $n['position']['x'] ?? 0, 'position_y' => $n['position']['y'] ?? 0]);
                }
            }if (array_key_exists('edges', $d)) {
                $workflow->edges()->delete();
                foreach ($d['edges'] as $e) {
                    $workflow->edges()->create(['edge_id' => $e['id'], 'source' => $e['source'], 'target' => $e['target'], 'source_handle' => $e['sourceHandle'] ?? null, 'label' => $e['label'] ?? null, 'configuration' => $e]);
                }
            }
        });

        return $workflow->fresh()->load(['nodes', 'edges']);
    }

    public function destroy(Workflow $workflow)
    {
        $workflow->delete();

        return response()->noContent();
    }

    public function publish(Workflow $workflow)
    {
        $workflow->update(['status' => 'published', 'published_at' => now(), 'version' => $workflow->version + 1]);

        return $workflow->fresh();
    }

    public function duplicate(Workflow $workflow)
    {
        $copy = $workflow->replicate(['id']);
        $copy->name = $workflow->name.' Copy';
        $copy->status = 'draft';
        $copy->created_by = request()->user()->id;
        $copy->save();
        foreach ($workflow->nodes as $n) {
            $copy->nodes()->create($n->only(['node_id', 'node_type', 'label', 'configuration', 'position_x', 'position_y']));
        }foreach ($workflow->edges as $e) {
            $copy->edges()->create($e->only(['edge_id', 'source', 'target', 'source_handle', 'label', 'configuration']));
        }

return response()->json($copy->load(['nodes', 'edges']), 201);
    }
}
