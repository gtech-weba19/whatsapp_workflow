<?php

namespace App\Http\Controllers;

use App\Models\Bot;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WhatsAppAccount;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminBotController extends Controller
{
    /**
     * Check Super Admin role.
     */
    private function isSuperAdmin(User $user): bool
    {
        if (strtolower((string) $user->role) === 'super_admin') {
            return true;
        }

        return method_exists($user, 'hasRole')
            && $user->hasRole('super_admin');
    }

    /**
     * GET /bots
     * Super Admin: all bots.
     * Normal user: own bots only.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $query = Bot::query()
            ->with([
                'user:id,name,email',
                'workflows:id,user_id,bot_id,name,status,channel',
                'whatsappAccount',
            ])
            ->withCount('workflows');

        if (!$this->isSuperAdmin($user)) {
            $query->where('user_id', $user->id);
        }

        $bots = $query->latest()->get();

        return response()->json([
            'success' => true,
            'message' => 'Bots fetched successfully.',
            'data' => $bots->map(
                fn (Bot $bot) => $this->formatBot($bot)
            )->values(),
        ]);
    }

    /**
     * Create form is handled by React.
     */
    public function create(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Create bot form is handled by frontend.',
        ]);
    }

    /**
     * POST /bots
     *
     * Super Admin can assign a bot to a selected registered user.
     * Normal users can create bots only for themselves.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $isSuperAdmin = $this->isSuperAdmin($user);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => [
                'sometimes',
                Rule::in(['draft', 'active', 'inactive']),
            ],
            'user_id' => [
                'nullable',
                'integer',
                'exists:users,id',
            ],
            'whatsapp_account_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:whatsapp_accounts,id',
            ],
            'workflow_ids' => ['sometimes', 'array'],
            'workflow_ids.*' => [
                'integer',
                'distinct',
                'exists:workflows,id',
            ],
        ]);

        /*
         * Select bot owner.
         * Never trust a normal user's submitted user_id.
         */
        if ($isSuperAdmin) {
            $ownerId = $validated['user_id'] ?? null;

            if (!$ownerId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please select a user for this bot.',
                ], 422);
            }

            // Do not assign bots to another Super Admin.
            $owner = User::query()
                ->whereKey($ownerId)
                ->first();

            if (!$owner || $this->isSuperAdmin($owner)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please select a valid registered user.',
                ], 422);
            }
        } else {
            $ownerId = $user->id;
        }

        $workflowIds = $validated['workflow_ids'] ?? [];
        $accountId = $validated['whatsapp_account_id'] ?? null;

        /*
         * The selected WhatsApp account must belong to the bot owner.
         */
        if ($accountId !== null) {
            $accountExists = WhatsAppAccount::query()
                ->whereKey($accountId)
                ->where('user_id', $ownerId)
                ->exists();

            if (!$accountExists) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'The selected WhatsApp account does not belong to the selected user.',
                ], 422);
            }
        }

        /*
         * Every selected workflow must belong to the bot owner.
         */
        if (!empty($workflowIds)) {
            $validCount = Workflow::query()
                ->where('user_id', $ownerId)
                ->whereIn('id', $workflowIds)
                ->count();

            if ($validCount !== count($workflowIds)) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'One or more workflows do not belong to the selected user.',
                ], 422);
            }

            $alreadyAssigned = Workflow::query()
                ->whereIn('id', $workflowIds)
                ->whereNotNull('bot_id')
                ->exists();

            if ($alreadyAssigned) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'One or more selected workflows are already assigned to a bot.',
                ], 422);
            }
        }

        $bot = DB::transaction(function () use (
            $validated,
            $workflowIds,
            $ownerId,
            $accountId
        ) {
            $bot = Bot::create([
                'user_id' => $ownerId,
                'name' => trim($validated['name']),
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'] ?? 'draft',
                'whatsapp_account_id' => $accountId,
            ]);

            if (!empty($workflowIds)) {
                Workflow::query()
                    ->where('user_id', $ownerId)
                    ->whereIn('id', $workflowIds)
                    ->whereNull('bot_id')
                    ->update([
                        'bot_id' => $bot->id,
                    ]);
            }

            return $bot;
        });

        $bot->load([
            'user:id,name,email',
            'workflows:id,user_id,bot_id,name,status,channel',
            'whatsappAccount',
        ])->loadCount('workflows');

        return response()->json([
            'success' => true,
            'message' => 'Bot assigned to user successfully.',
            'data' => $this->formatBot($bot),
        ], 201);
    }

    /**
     * GET /bots/{bot}
     */
    public function show(Request $request, Bot $bot): JsonResponse
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        if (!$this->canAccessBot($user, $bot)) {
            return $this->forbiddenResponse();
        }

        $bot->load([
            'user:id,name,email',
            'workflows:id,user_id,bot_id,name,status,channel',
            'whatsappAccount',
        ])->loadCount('workflows');

        return response()->json([
            'success' => true,
            'message' => 'Bot fetched successfully.',
            'data' => $this->formatBot($bot),
        ]);
    }

    /**
     * GET /bots/{bot}/edit
     */
    public function edit(Request $request, Bot $bot): JsonResponse
    {
        return $this->show($request, $bot);
    }

    /**
     * PUT/PATCH /bots/{bot}
     * The existing bot owner cannot be changed here.
     */
    public function update(Request $request, Bot $bot): JsonResponse
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        if (!$this->canAccessBot($user, $bot)) {
            return $this->forbiddenResponse();
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
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
            'workflow_ids' => ['sometimes', 'array'],
            'workflow_ids.*' => [
                'integer',
                'distinct',
                'exists:workflows,id',
            ],
        ]);

        $ownerId = $bot->user_id;

        $accountIdProvided = array_key_exists(
            'whatsapp_account_id',
            $validated
        );

        $accountId = $validated['whatsapp_account_id'] ?? null;

        if ($accountIdProvided && $accountId !== null) {
            $accountExists = WhatsAppAccount::query()
                ->whereKey($accountId)
                ->where('user_id', $ownerId)
                ->exists();

            if (!$accountExists) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'The selected WhatsApp account does not belong to the bot owner.',
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
                ->where('user_id', $ownerId)
                ->whereIn('id', $workflowIds)
                ->count();

            if ($validCount !== count($workflowIds)) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'One or more workflows do not belong to the bot owner.',
                ], 422);
            }

            $assignedElsewhere = Workflow::query()
                ->whereIn('id', $workflowIds)
                ->whereNotNull('bot_id')
                ->where('bot_id', '!=', $bot->id)
                ->exists();

            if ($assignedElsewhere) {
                return response()->json([
                    'success' => false,
                    'message' =>
                        'One or more selected workflows are already assigned to another bot.',
                ], 422);
            }
        }

        DB::transaction(function () use (
            $bot,
            $validated,
            $workflowIdsProvided,
            $workflowIds,
            $ownerId
        ) {
            // Ownership cannot be changed through normal update data.
            $botData = collect($validated)
                ->except([
                    'workflow_ids',
                    'user_id',
                    'tenant_id',
                ])
                ->all();

            $bot->update($botData);

            if ($workflowIdsProvided) {
                Workflow::query()
                    ->where('bot_id', $bot->id)
                    ->update(['bot_id' => null]);

                if (!empty($workflowIds)) {
                    Workflow::query()
                        ->where('user_id', $ownerId)
                        ->whereIn('id', $workflowIds)
                        ->whereNull('bot_id')
                        ->update(['bot_id' => $bot->id]);
                }
            }
        });

        $bot->refresh()
            ->load([
                'user:id,name,email',
                'workflows:id,user_id,bot_id,name,status,channel',
                'whatsappAccount',
            ])
            ->loadCount('workflows');

        return response()->json([
            'success' => true,
            'message' => 'Bot updated successfully.',
            'data' => $this->formatBot($bot),
        ]);
    }

    /**
     * DELETE /bots/{bot}
     */
    public function destroy(Request $request, Bot $bot): JsonResponse
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        if (!$this->canAccessBot($user, $bot)) {
            return $this->forbiddenResponse();
        }

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
     * PATCH /bots/{bot}/status
     */
    public function status(Request $request, Bot $bot): JsonResponse
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        if (!$this->canAccessBot($user, $bot)) {
            return $this->forbiddenResponse();
        }

        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in(['draft', 'active', 'inactive']),
            ],
        ]);

        $bot->update([
            'status' => $validated['status'],
        ]);

        $bot->load([
            'user:id,name,email',
            'workflows:id,user_id,bot_id,name,status,channel',
            'whatsappAccount',
        ])->loadCount('workflows');

        return response()->json([
            'success' => true,
            'message' => 'Bot status updated successfully.',
            'data' => $this->formatBot($bot),
        ]);
    }

    /**
     * GET /bots/clients
     * Super Admin: registered non-admin users.
     * Normal user: their own profile.
     */
    public function clients(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $query = User::query()
            ->select('id', 'name', 'email', 'role')
            ->orderBy('name');

        if ($this->isSuperAdmin($user)) {
            $query->where(function ($q) {
                $q->whereNull('role')
                    ->orWhereRaw(
                        'LOWER(role) != ?',
                        ['super_admin']
                    );
            });
        } else {
            $query->whereKey($user->id);
        }

        return response()->json([
            'success' => true,
            'message' => 'Users fetched successfully.',
            'data' => $query->get(),
        ]);
    }

    /**
     * GET /bots/workflows?user_id=123
     * Super Admin can load workflows for the selected user.
     */
    public function workflows(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $validated = $request->validate([
            'user_id' => ['sometimes', 'integer', 'exists:users,id'],
            'bot_id' => ['sometimes', 'integer', 'exists:bots,id'],
        ]);

        $targetUserId = $user->id;

        if (
            $this->isSuperAdmin($user)
            && isset($validated['user_id'])
        ) {
            $targetUserId = (int) $validated['user_id'];
        }

        $query = Workflow::query()
            ->where('user_id', $targetUserId);

        if (isset($validated['bot_id'])) {
            $bot = Bot::find($validated['bot_id']);

            if (
                !$bot ||
                (
                    !$this->isSuperAdmin($user)
                    && (int) $bot->user_id !== (int) $user->id
                )
            ) {
                return $this->forbiddenResponse();
            }

            $query->where(function ($q) use ($bot) {
                $q->whereNull('bot_id')
                    ->orWhere('bot_id', $bot->id);
            });
        } else {
            $query->where(function ($q) {
                $q->whereNull('bot_id')
                    ->orWhereHas('bot', function ($botQuery) {
                        $botQuery->where('user_id', auth()->id());
                    });
            });


            if ($this->isSuperAdmin($user)) {
                $query->where(function ($q) use ($targetUserId) {
                    $q->whereNull('bot_id')
                        ->orWhereHas('bot', function ($botQuery) use ($targetUserId) {
                            $botQuery->where('user_id', $targetUserId);
                        });
                });
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Workflows fetched successfully.',
            'data' => $query->orderBy('name')->get([
                'id',
                'name',
                'user_id',
                'bot_id',
                'status',
                'channel',
            ]),
        ]);
    }

    /**
     * Check Bot access.
     */
    private function canAccessBot(User $user, Bot $bot): bool
    {
        return $this->isSuperAdmin($user)
            || (int) $bot->user_id === (int) $user->id;
    }

    /**
     * Standard 403 response.
     */
    private function forbiddenResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Unauthorized. You do not have permission to access this bot.',
        ], 403);
    }

    /**
     * Format Bot response for React.
     */
    private function formatBot(Bot $bot): array
    {
        $workflows = $bot->relationLoaded('workflows')
            ? $bot->workflows
            : collect();

        $account = $bot->relationLoaded('whatsappAccount')
            ? $bot->whatsappAccount
            : null;

        return [
            'id' => $bot->id,
            'user_id' => $bot->user_id,
            'name' => $bot->name,
            'status' => $bot->status,
            'whatsapp_account_id' => $bot->whatsapp_account_id,

            'user' => $bot->relationLoaded('user') && $bot->user
                ? [
                    'id' => $bot->user->id,
                    'name' => $bot->user->name,
                    'email' => $bot->user->email,
                ]
                : null,

            'whatsapp_account' => $account,

            'workflows' => $workflows->map(fn ($workflow) => [
                'id' => $workflow->id,
                'name' => $workflow->name,
                'user_id' => $workflow->user_id,
                'bot_id' => $workflow->bot_id,
                'status' => $workflow->status,
                'channel' => $workflow->channel,
            ])->values(),

            'workflow_ids' => $workflows->pluck('id')->values(),

            'workflows_count' => $bot->workflows_count
                ?? $workflows->count(),

            'created_at' => $bot->created_at?->toISOString(),
            'updated_at' => $bot->updated_at?->toISOString(),
        ];
    }
}
