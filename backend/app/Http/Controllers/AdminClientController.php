<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => [
                'sometimes',
                'nullable',
                Rule::in(['active', 'inactive', 'suspended']),
            ],
        ]);

        $query = User::query()
            ->where('role', '!=', 'super_admin');

        if (!empty($validated['search'])) {
            $search = trim($validated['search']);

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $clients = $query
            ->withCount('bots')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Clients fetched successfully.',
            'data' => $clients->map(
                fn (User $client) => $this->formatClient($client)
            )->values(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $client = User::withCount('bots')->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Client fetched successfully.',
            'data' => $this->formatClient($client),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'min:2',
                'max:255',
            ],
            'email' => [
                'required',
                'email:rfc',
                'max:255',
                'unique:users,email',
            ],
            'mobile' => [
                'nullable',
                'string',
                'max:20',
            ],
            'status' => [
                'sometimes',
                'required',
                Rule::in(['active', 'inactive', 'suspended']),
            ],
        ]);

        $name = trim($validated['name']);

        $client = User::create([
            'name' => $name,
            'email' => $validated['email'],
            'mobile' => $validated['mobile'] ?? null,
            'password' => Hash::make(Str::random(16)),
            'role' => 'client',
            'status' => $validated['status'] ?? 'active',
        ]);

        // Initialize wallet for new client
        try {
            app(WalletService::class)->initializeWallet($client);
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => 'Client created successfully.',
            'data' => $this->formatClient($client),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $client = User::findOrFail($id);

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'min:2',
                'max:255',
            ],
            'email' => [
                'sometimes',
                'required',
                'email:rfc',
                'max:255',
                Rule::unique('users', 'email')->ignore($client->id),
            ],
            'mobile' => [
                'sometimes',
                'nullable',
                'string',
                'max:20',
            ],
            'status' => [
                'sometimes',
                'required',
                Rule::in(['active', 'inactive', 'suspended']),
            ],
        ]);

        if (array_key_exists('name', $validated)) {
            $client->name = trim($validated['name']);
        }

        if (array_key_exists('email', $validated)) {
            $client->email = $validated['email'];
        }

        if (array_key_exists('mobile', $validated)) {
            $client->mobile = $validated['mobile'];
        }

        if (array_key_exists('status', $validated)) {
            $client->status = $validated['status'];
        }

        $client->save();

        return response()->json([
            'success' => true,
            'message' => 'Client updated successfully.',
            'data' => $this->formatClient($client),
        ]);
    }

    public function status(Request $request, int $id): JsonResponse
    {
        $client = User::findOrFail($id);

        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in(['active', 'inactive', 'suspended']),
            ],
        ]);

        $client->status = $validated['status'];
        $client->save();

        return response()->json([
            'success' => true,
            'message' => 'Client status updated successfully.',
            'data' => $this->formatClient($client),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $client = User::findOrFail($id);

        if ($client->bots()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Client cannot be deleted because it has active bots.',
            ], 422);
        }

        $client->delete();

        return response()->json([
            'success' => true,
            'message' => 'Client deleted successfully.',
        ]);
    }

    private function formatClient(User $client): array
    {
        return [
            'id' => $client->id,
            'name' => $client->name,
            'slug' => Str::slug($client->name),
            'email' => $client->email,
            'mobile' => $client->mobile,
            'status' => $client->status ?? 'active',
            'users_count' => 1,
            'bots_count' => (int) ($client->bots_count ?? $client->bots()->count()),
            'message_rate' => (float) app(WalletService::class)->getUserRate($client->id),
            'wallet_balance' => (float) ($client->creditWallet?->available_credits ?? 0),
            'created_at' => $client->created_at?->toISOString(),
            'updated_at' => $client->updated_at?->toISOString(),
        ];
    }
}
