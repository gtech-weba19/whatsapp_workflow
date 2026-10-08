<?php

namespace App\Http\Controllers;

use App\Models\Bot;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class BotController extends Controller
{
    /**
     * Display a listing of bots.
     */
    public function index(Request $request): JsonResponse
    {
        $bots = Bot::with('tenant')
            ->withCount('workflows')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Bots fetched successfully.',
            'data' => $bots->map(function ($bot) {
                return $this->formatBot($bot);
            }),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Create bot form is handled by frontend.',
        ]);
    }

    /**
     * Store a newly created bot.
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
                Rule::in([
                    'draft',
                    'active',
                    'inactive',
                ]),
            ],

            'whatsapp_account_id' => [
                'nullable',
                'integer',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Check Client
        |--------------------------------------------------------------------------
        */

        $tenant = Tenant::find($validated['tenant_id']);

        if (!$tenant) {
            return response()->json([
                'success' => false,
                'message' => 'Client not found.',
            ], 404);
        }

        if ($tenant->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Selected client is not active.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Create Bot
        |--------------------------------------------------------------------------
        */

        $bot = Bot::create([
            'tenant_id' => $validated['tenant_id'],
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'draft',
            'whatsapp_account_id' => $validated['whatsapp_account_id'] ?? null,
        ]);

        $bot->load('tenant');

        return response()->json([
            'success' => true,
            'message' => 'Bot created successfully.',
            'data' => $this->formatBot($bot),
        ], 201);
    }

    /**
     * Display the specified bot.
     */
    public function show(Bot $bot): JsonResponse
    {
        $bot->load('tenant')
            ->loadCount('workflows');

        return response()->json([
            'success' => true,
            'message' => 'Bot fetched successfully.',
            'data' => $this->formatBot($bot),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Bot $bot): JsonResponse
    {
        $bot->load('tenant')
            ->loadCount('workflows');

        return response()->json([
            'success' => true,
            'message' => 'Bot edit data fetched successfully.',
            'data' => $this->formatBot($bot),
        ]);
    }

    /**
     * Update the specified bot.
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
                'nullable',
                'string',
            ],

            'status' => [
                'sometimes',
                Rule::in([
                    'draft',
                    'active',
                    'inactive',
                ]),
            ],

            'whatsapp_account_id' => [
                'nullable',
                'integer',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Check Client
        |--------------------------------------------------------------------------
        */

        if (array_key_exists('tenant_id', $validated)) {

            $tenant = Tenant::find($validated['tenant_id']);

            if (!$tenant) {
                return response()->json([
                    'success' => false,
                    'message' => 'Client not found.',
                ], 404);
            }

            if ($tenant->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected client is not active.',
                ], 422);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Update Bot
        |--------------------------------------------------------------------------
        */

        $bot->update($validated);

        $bot->load('tenant')
            ->loadCount('workflows');

        return response()->json([
            'success' => true,
            'message' => 'Bot updated successfully.',
            'data' => $this->formatBot($bot),
        ]);
    }

    /**
     * Remove the specified bot.
     */
    public function destroy(Bot $bot): JsonResponse
    {
        $bot->delete();

        return response()->json([
            'success' => true,
            'message' => 'Bot deleted successfully.',
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
                Rule::in([
                    'draft',
                    'active',
                    'inactive',
                ]),
            ],
        ]);

        $bot->update([
            'status' => $validated['status'],
        ]);

        $bot->load('tenant')
            ->loadCount('workflows');

        return response()->json([
            'success' => true,
            'message' => 'Bot status updated successfully.',
            'data' => $this->formatBot($bot),
        ]);
    }

    /**
     * Get active clients.
     */
    public function clients(): JsonResponse
    {
        $clients = Tenant::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'status',
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Clients fetched successfully.',
            'data' => $clients,
        ]);
    }

    /**
     * Format bot response.
     *
     * This replaces BotResource.
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

            'workflows_count' => isset($bot->workflows_count)
                ? (int) $bot->workflows_count
                : 0,

            'created_at' => $bot->created_at?->toISOString(),

            'updated_at' => $bot->updated_at?->toISOString(),
        ];
    }
}
