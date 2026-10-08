<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Str;
use Illuminate\Validation\Rule;

class ClientController extends Controller
{
    /**
     * GET /api/admin/clients
     */
    public function index(Request $request): JsonResponse
    {
        $query = Tenant::query();

        if ($request->filled('search')) {
            $search = trim($request->search);

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where(
                'status',
                $request->status
            );
        }

        $clients = $query
            ->withCount([
                'users',
                'bots',
            ])
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Clients fetched successfully.',
            'data' => $clients->map(
                fn ($client) => $this->formatClient($client)
            ),
        ]);
    }

    /**
     * GET /api/admin/clients/{client}
     */
    public function show(Tenant $client): JsonResponse
    {
        $client->loadCount([
            'users',
            'bots',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Client fetched successfully.',
            'data' => $this->formatClient($client),
        ]);
    }

    /**
     * POST /api/admin/clients
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'slug' => [
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                'unique:tenants,slug',
            ],

            'email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'mobile' => [
                'nullable',
                'string',
                'max:20',
            ],

            'status' => [
                'nullable',
                Rule::in([
                    'active',
                    'inactive',
                    'suspended',
                ]),
            ],
        ]);

        $name = trim($validated['name']);

        $slug = !empty($validated['slug'])
            ? Str::slug($validated['slug'])
            : Str::slug($name);

        /*
         * Ensure slug is unique even when
         * generated automatically.
         */
        $originalSlug = $slug;
        $counter = 1;

        while (
            Tenant::where('slug', $slug)->exists()
        ) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        $client = Tenant::create([
            'name' => $name,
            'slug' => $slug,
            'email' => $validated['email'] ?? null,
            'mobile' => $validated['mobile'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        $client->loadCount([
            'users',
            'bots',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Client created successfully.',
            'data' => $this->formatClient($client),
        ], 201);
    }

    /**
     * PUT/PATCH /api/admin/clients/{client}
     */
    public function update(
        Request $request,
        Tenant $client
    ): JsonResponse {
        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('tenants', 'slug')
                    ->ignore($client->id),
            ],

            'email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'mobile' => [
                'nullable',
                'string',
                'max:20',
            ],

            'status' => [
                'sometimes',
                Rule::in([
                    'active',
                    'inactive',
                    'suspended',
                ]),
            ],
        ]);

        if (isset($validated['name'])) {
            $validated['name'] = trim(
                $validated['name']
            );
        }

        if (isset($validated['slug'])) {
            $validated['slug'] = Str::slug(
                $validated['slug']
            );
        }

        $client->update($validated);

        $client->loadCount([
            'users',
            'bots',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Client updated successfully.',
            'data' => $this->formatClient($client),
        ]);
    }

    /**
     * PATCH /api/admin/clients/{client}/status
     */
    public function status(
        Request $request,
        Tenant $client
    ): JsonResponse {
        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in([
                    'active',
                    'inactive',
                    'suspended',
                ]),
            ],
        ]);

        $client->update([
            'status' => $validated['status'],
        ]);

        $client->loadCount([
            'users',
            'bots',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Client status updated successfully.',
            'data' => $this->formatClient($client),
        ]);
    }

    /**
     * DELETE /api/admin/clients/{client}
     */
    public function destroy(Tenant $client): JsonResponse
    {
        /*
         * Prevent accidental deletion when
         * client still has users or bots.
         */
        if (
            $client->users()->exists() ||
            $client->bots()->exists()
        ) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Client cannot be deleted because it has users or bots.',
            ], 422);
        }

        $client->delete();

        return response()->json([
            'success' => true,
            'message' => 'Client deleted successfully.',
        ]);
    }

    /**
     * Format client response.
     */
    private function formatClient(Tenant $client): array
    {
        return [
            'id' => $client->id,

            'name' => $client->name,

            'slug' => $client->slug,

            'email' => $client->email,

            'mobile' => $client->mobile,

            'status' => $client->status,

            'users_count' => isset($client->users_count)
                ? (int) $client->users_count
                : 0,

            'bots_count' => isset($client->bots_count)
                ? (int) $client->bots_count
                : 0,

            'created_at' => $client->created_at
                ? $client->created_at->toISOString()
                : null,

            'updated_at' => $client->updated_at
                ? $client->updated_at->toISOString()
                : null,
        ];
    }
}
