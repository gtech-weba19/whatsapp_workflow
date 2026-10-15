<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        $query = Tenant::query();

        if (!empty($validated['search'])) {
            $search = trim($validated['search']);

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $clients = $query
            ->withCount(['users', 'bots'])
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Clients fetched successfully.',
            'data' => $clients->map(
                fn (Tenant $client) => $this->formatClient($client)
            )->values(),
        ]);
    }


    public function show(Tenant $client): JsonResponse
    {
        $client->loadCount(['users', 'bots']);

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

            'slug' => [
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                'unique:tenants,slug',
            ],

            'email' => [
                'nullable',
                'email:rfc',
                'max:255',
                'unique:tenants,email',
            ],

            'mobile' => [
                'nullable',
                'regex:/^[6-9][0-9]{9}$/',
                'unique:tenants,mobile',
            ],

            'status' => [
                'sometimes',
                'required',
                Rule::in(['active', 'inactive', 'suspended']),
            ],
        ]);

        $name = trim($validated['name']);

        if (mb_strlen($name) < 2) {
            return response()->json([
                'success' => false,
                'message' => 'Client name must contain at least 2 characters.',
                'errors' => [
                    'name' => ['Client name must contain at least 2 characters.'],
                ],
            ], 422);
        }

        $slugInput = trim((string) ($validated['slug'] ?? ''));

        $originalSlug = Str::slug(
            $slugInput !== '' ? $slugInput : $name
        );

        if ($originalSlug === '') {
            return response()->json([
                'success' => false,
                'message' => 'Please provide a name that can generate a valid slug.',
                'errors' => [
                    'slug' => ['A valid slug could not be generated.'],
                ],
            ], 422);
        }


        $slug = $originalSlug;
        $counter = 1;

        while (Tenant::where('slug', $slug)->exists()) {
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

        $client->loadCount(['users', 'bots']);

        return response()->json([
            'success' => true,
            'message' => 'Client created successfully.',
            'data' => $this->formatClient($client),
        ], 201);
    }


    public function update(
        Request $request,
        Tenant $client
    ): JsonResponse {

        $input = $request->all();

        if (isset($input['slug']) && is_string($input['slug'])) {
            $input['slug'] = Str::slug(trim($input['slug']));
        }

        if (isset($input['name']) && is_string($input['name'])) {
            $input['name'] = trim($input['name']);
        }

        $request->replace($input);

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'min:2',
                'max:255',
            ],

            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('tenants', 'slug')->ignore($client->id),
            ],

            'email' => [
                'sometimes',
                'nullable',
                'email:rfc',
                'max:255',
                Rule::unique('tenants', 'email')->ignore($client->id),
            ],

            'mobile' => [
                'sometimes',
                'nullable',
                'regex:/^[6-9][0-9]{9}$/',
                Rule::unique('tenants', 'mobile')->ignore($client->id),
            ],

            'status' => [
                'sometimes',
                'required',
                Rule::in(['active', 'inactive', 'suspended']),
            ],
        ]);

        if (isset($validated['slug']) && $validated['slug'] === '') {
            return response()->json([
                'success' => false,
                'message' => 'Slug cannot be empty.',
                'errors' => [
                    'slug' => ['Slug cannot be empty.'],
                ],
            ], 422);
        }

        $client->update($validated);

        $client->loadCount(['users', 'bots']);

        return response()->json([
            'success' => true,
            'message' => 'Client updated successfully.',
            'data' => $this->formatClient($client),
        ]);
    }


    public function status(
        Request $request,
        Tenant $client
    ): JsonResponse {
        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in(['active', 'inactive', 'suspended']),
            ],
        ]);

        $client->update([
            'status' => $validated['status'],
        ]);

        $client->loadCount(['users', 'bots']);

        return response()->json([
            'success' => true,
            'message' => 'Client status updated successfully.',
            'data' => $this->formatClient($client),
        ]);
    }


    public function destroy(Tenant $client): JsonResponse
    {

        if (
            $client->users()->exists() ||
            $client->bots()->exists()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Client cannot be deleted because it has users or bots.',
            ], 422);
        }

        $client->delete();

        return response()->json([
            'success' => true,
            'message' => 'Client deleted successfully.',
        ]);
    }


    private function formatClient(Tenant $client): array
    {
        return [
            'id' => $client->id,
            'name' => $client->name,
            'slug' => $client->slug,
            'email' => $client->email,
            'mobile' => $client->mobile,
            'status' => $client->status,

            'users_count' => (int) ($client->users_count ?? 0),
            'bots_count' => (int) ($client->bots_count ?? 0),

            'created_at' => $client->created_at?->toISOString(),
            'updated_at' => $client->updated_at?->toISOString(),
        ];
    }
}
