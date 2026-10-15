<?php

namespace App\Http\Controllers;

use App\Models\Bot;
use App\Models\Tenant;
use App\Models\Workflow;
use App\Models\WhatsAppAccount;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminBotController extends Controller
{
    /**
     * List all bots.
     */
    public function index(Request $request): JsonResponse
    {
        $bots = Bot::with('tenant')
            ->with('workflows:id,tenant_id,bot_id,name,status,channel')
            ->withCount('workflows')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Bots fetched successfully.',
            'data' => $bots->map(
                fn ($bot) => $this->formatBot($bot)
            )->values(),
        ]);
    }

    /**
     * Frontend handles the create form.
     */
    public function create(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Create bot form is handled by frontend.',
        ]);
    }

    /**
     * Create bot and optionally assign existing workflows.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => [
                'required',
                'integer',
                'exists:tenants,id',
            ],
            'name' => [
                'required',
                'string',
                'max:255',
            ],
            'description' => [
                'nullable',
                'string',
            ],
            'status' => [
                'nullable',
                Rule::in(['draft', 'active', 'inactive']),
            ],
            'whatsapp_account_id' => [
                'nullable',
                'integer',
                'exists:whatsapp_accounts,id',
            ],
            'workflow_ids' => [
                'sometimes',
                'array',
            ],
            'workflow_ids.*' => [
                'integer',
                'distinct',
                'exists:workflows,id',
            ],
        ]);

        $tenant = Tenant::find($validated['tenant_id']);

        if (!$tenant || $tenant->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Selected client does not exist or is not active.',
            ], 422);
        }

        // Validate the WhatsApp account belongs to this client.
        if (!empty($validated['whatsapp_account_id'])) {
            $account = WhatsAppAccount::query()
                ->where('id', $validated['whatsapp_account_id'])
                ->where('tenant_id', $tenant->id)
                ->first();

            if (!$account) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected WhatsApp account does not belong to this client.',
                ], 422);
            }
        }

        $workflowIds = $validated['workflow_ids'] ?? [];

        // All selected workflows must belong to the selected client.
        if (!empty($workflowIds)) {
            $validCount = Workflow::query()
                ->where('tenant_id', $tenant->id)
                ->whereIn('id', $workflowIds)
                ->count();

            if ($validCount !== count($workflowIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'One or more workflows do not belong to the selected client.',
                ], 422);
            }
        }

        $bot = DB::transaction(function () use (
            $validated,
            $workflowIds
        ) {
            $bot = Bot::create([
                'tenant_id' => $validated['tenant_id'],
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'] ?? 'draft',
                'whatsapp_account_id' =>
                    $validated['whatsapp_account_id'] ?? null,
            ]);

            if (!empty($workflowIds)) {
                // Assign existing workflows through workflows.bot_id.
                // Do not silently take workflows from another bot.
                $alreadyAssigned = Workflow::query()
                    ->whereIn('id', $workflowIds)
                    ->whereNotNull('bot_id')
                    ->exists();

                if ($alreadyAssigned) {
                    throw new \RuntimeException(
                        'One or more selected workflows are already assigned to a bot.'
                    );
                }

                Workflow::query()
                    ->where('tenant_id', $bot->tenant_id)
                    ->whereIn('id', $workflowIds)
                    ->update([
                        'bot_id' => $bot->id,
                    ]);
            }

            return $bot;
        });

        $bot->load('tenant', 'workflows')
            ->loadCount('workflows');

        return response()->json([
            'success' => true,
            'message' => 'Bot created successfully.',
            'data' => $this->formatBot($bot),
        ], 201);
    }

    /**
     * Show a bot.
     */
    public function show(Bot $bot): JsonResponse
    {
        $bot->load('tenant', 'workflows')
            ->loadCount('workflows');

        return response()->json([
            'success' => true,
            'message' => 'Bot fetched successfully.',
            'data' => $this->formatBot($bot),
        ]);
    }

    /**
     * Get bot edit data.
     */
    public function edit(Bot $bot): JsonResponse
    {
        $bot->load('tenant', 'workflows')
            ->loadCount('workflows');

        return response()->json([
            'success' => true,
            'message' => 'Bot edit data fetched successfully.',
            'data' => $this->formatBot($bot),
        ]);
    }

    /**
     * Update bot and optionally replace workflow assignments.
     */
    public function update(Request $request, Bot $bot): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:tenants,id',
            ],
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],
            'description' => [
                'sometimes',
                'nullable',
                'string',
            ],
            'status' => [
                'sometimes',
                Rule::in(['draft', 'active', 'inactive']),
            ],
            'whatsapp_account_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:whatsapp_accounts,id',
            ],
            'workflow_ids' => [
                'sometimes',
                'array',
            ],
            'workflow_ids.*' => [
                'integer',
                'distinct',
                'exists:workflows,id',
            ],
        ]);

        $tenantId = $validated['tenant_id'] ?? $bot->tenant_id;

        $tenant = Tenant::find($tenantId);

        if (!$tenant || $tenant->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Selected client does not exist or is not active.',
            ], 422);
        }

        if (!empty($validated['whatsapp_account_id'])) {
            $account = WhatsAppAccount::query()
                ->where('id', $validated['whatsapp_account_id'])
                ->where('tenant_id', $tenantId)
                ->first();

            if (!$account) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected WhatsApp account does not belong to this client.',
                ], 422);
            }
        }

        $workflowIdsProvided = array_key_exists(
            'workflow_ids',
            $validated
        );

        $workflowIds = $validated['workflow_ids'] ?? [];

        if ($workflowIdsProvided && !empty($workflowIds)) {
            $validCount = Workflow::query()
                ->where('tenant_id', $tenantId)
                ->whereIn('id', $workflowIds)
                ->count();

            if ($validCount !== count($workflowIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'One or more workflows do not belong to the selected client.',
                ], 422);
            }

            // Prevent taking workflows assigned to another bot.
            $assignedElsewhere = Workflow::query()
                ->whereIn('id', $workflowIds)
                ->whereNotNull('bot_id')
                ->where('bot_id', '!=', $bot->id)
                ->exists();

            if ($assignedElsewhere) {
                return response()->json([
                    'success' => false,
                    'message' => 'One or more workflows are already assigned to another bot.',
                ], 422);
            }
        }

        DB::transaction(function () use (
            $bot,
            $validated,
            $tenantId,
            $workflowIdsProvided,
            $workflowIds
        ) {
            $botData = collect($validated)
                ->except('workflow_ids')
                ->all();

            $bot->update($botData);

            if ($workflowIdsProvided) {
                // Unassign this bot's previous workflows.
                Workflow::query()
                    ->where('bot_id', $bot->id)
                    ->update(['bot_id' => null]);

                // Assign the newly selected workflows.
                if (!empty($workflowIds)) {
                    Workflow::query()
                        ->where('tenant_id', $tenantId)
                        ->whereIn('id', $workflowIds)
                        ->update(['bot_id' => $bot->id]);
                }
            } else {
                // If tenant changes, clear assignments that no longer
                // belong to the bot's selected client.
                Workflow::query()
                    ->where('bot_id', $bot->id)
                    ->where('tenant_id', '!=', $tenantId)
                    ->update(['bot_id' => null]);
            }
        });

        $bot->refresh()
            ->load('tenant', 'workflows')
            ->loadCount('workflows');

        return response()->json([
            'success' => true,
            'message' => 'Bot updated successfully.',
            'data' => $this->formatBot($bot),
        ]);
    }

    /**
     * Delete bot without deleting its workflows.
     */
    public function destroy(Bot $bot): JsonResponse
    {
        DB::transaction(function () use ($bot) {
            Workflow::query()
                ->where('bot_id', $bot->id)
                ->update(['bot_id' => null]);

            $bot->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Bot deleted successfully. Workflows were retained.',
        ]);
    }

    /**
     * Update bot status.
     */
    public function status(Request $request, Bot $bot): JsonResponse
    {
        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in(['draft', 'active', 'inactive']),
            ],
        ]);

        $bot->update([
            'status' => $validated['status'],
        ]);

        $bot->load('tenant', 'workflows')
            ->loadCount('workflows');

        return response()->json([
            'success' => true,
            'message' => 'Bot status updated successfully.',
            'data' => $this->formatBot($bot),
        ]);
    }

    /**
     * List active clients.
     */
    public function clients(): JsonResponse
    {
        $clients = Tenant::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'status']);

        return response()->json([
            'success' => true,
            'message' => 'Clients fetched successfully.',
            'data' => $clients,
        ]);
    }

    /**
     * List workflows for a selected client.
     */
    public function workflows(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => [
                'required',
                'integer',
                'exists:tenants,id',
            ],
        ]);

        $workflows = Workflow::query()
            ->where('tenant_id', $validated['tenant_id'])
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'tenant_id',
                'bot_id',
                'status',
                'channel',
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Client workflows fetched successfully.',
            'data' => $workflows,
        ]);
    }

    /**
     * Format bot response.
     */
    private function formatBot(Bot $bot): array
    {
        return [
            'id' => $bot->id,
            'tenant_id' => $bot->tenant_id,
            'name' => $bot->name,
            'description' => $bot->description,
            'status' => $bot->status,
            'whatsapp_account_id' => $bot->whatsapp_account_id,

            'client' => $bot->relationLoaded('tenant') && $bot->tenant
                ? [
                    'id' => $bot->tenant->id,
                    'name' => $bot->tenant->name,
                    'status' => $bot->tenant->status,
                ]
                : null,

            'workflows' => $bot->relationLoaded('workflows')
                ? $bot->workflows->map(fn ($workflow) => [
                    'id' => $workflow->id,
                    'name' => $workflow->name,
                    'tenant_id' => $workflow->tenant_id,
                    'bot_id' => $workflow->bot_id,
                    'status' => $workflow->status,
                    'channel' => $workflow->channel,
                ])->values()
                : [],

            'workflow_ids' => $bot->relationLoaded('workflows')
                ? $bot->workflows->pluck('id')->values()
                : [],

            'workflows_count' => isset($bot->workflows_count)
                ? (int) $bot->workflows_count
                : 0,

            'created_at' => $bot->created_at?->toISOString(),
            'updated_at' => $bot->updated_at?->toISOString(),
        ];
    }
}
