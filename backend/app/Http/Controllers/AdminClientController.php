<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Bot;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminClientController extends Controller
{
    /**
     * Fetch all users with optional business profile details.
     * Existing route remains /clients.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        // Start from users so users without a business profile are included.
        $query = User::query()->with('businessProfile');

        if ($request->filled('search')) {
            $search = trim($request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%")
                    ->orWhere('role', 'like', "%{$search}%")
                    ->orWhere('status', 'like', "%{$search}%")
                    ->orWhere('onboarding_step', 'like', "%{$search}%")
                    ->orWhereHas('businessProfile', function ($business) use ($search) {
                        $business->where('business_name', 'like', "%{$search}%")
                            ->orWhere('business_type', 'like', "%{$search}%")
                            ->orWhere('industry', 'like', "%{$search}%")
                            ->orWhere('city', 'like', "%{$search}%")
                            ->orWhere('country', 'like', "%{$search}%")
                            ->orWhere('website', 'like', "%{$search}%")
                            ->orWhere('gstin', 'like', "%{$search}%");
                    });
            });
        }

        $users = $query
            ->orderByDesc('users.id')
            ->paginate($request->integer('per_page', 10));

        $users->getCollection()->transform(function (User $user) {
            return $this->formatUser($user);
        });

        return response()->json([
            'success' => true,
            'message' => 'Users fetched successfully.',
            'data' => $users,
        ]);
    }

    /**
     * Show one user with business profile details.
     */
    public function show(User $client): JsonResponse
    {
        $client->load('businessProfile');

        return response()->json([
            'success' => true,
            'message' => 'User details fetched successfully.',
            'data' => $this->formatUser($client),
        ]);
    }

    /**
     * Create a business profile for an existing user.
     *
     * The existing apiResource route still calls this method via POST /clients.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => [
                'required',
                'integer',
                'exists:users,id',
                Rule::unique('business_profiles', 'user_id'),
            ],
            'business_name' => ['required', 'string', 'max:190'],
            'business_type' => ['nullable', 'string', 'max:100'],
            'industry' => ['nullable', 'string', 'max:120'],
            'country' => ['required', 'string', 'max:100'],
            'website' => ['nullable', 'url', 'max:255'],
            'gstin' => ['nullable', 'string', 'max:30'],
            'city' => ['nullable', 'string', 'max:120'],
            'address' => ['nullable', 'string'],
        ]);

        $profile = DB::transaction(function () use ($validated) {
            return \App\Models\BusinessProfile::create([
                'user_id' => $validated['user_id'],
                'business_name' => $validated['business_name'],
                'business_type' => $validated['business_type'] ?? null,
                'industry' => $validated['industry'] ?? null,
                'country' => $validated['country'],
                'website' => $validated['website'] ?? null,
                'gstin' => $validated['gstin'] ?? null,
                'city' => $validated['city'] ?? null,
                'address' => $validated['address'] ?? null,
            ]);
        });

        $user = User::with('businessProfile')->findOrFail($validated['user_id']);

        return response()->json([
            'success' => true,
            'message' => 'User business profile created successfully.',
            'data' => $this->formatUser($user),
        ], 201);
    }

    /**
     * Update user information and/or business profile.
     */
    public function update(Request $request, User $client): JsonResponse
    {
        $validated = $request->validate([
            // users table
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($client->id),
            ],
            'mobile' => ['sometimes', 'nullable', 'string', 'max:20'],
            'status' => [
                'sometimes',
                'required',
                Rule::in(['active', 'inactive', 'suspended']),
            ],
            'role' => ['sometimes', 'required', 'string', 'max:50'],
            'role_id' => ['sometimes', 'nullable', 'integer'],

            // business_profiles table
            'business_name' => ['sometimes', 'required', 'string', 'max:190'],
            'business_type' => ['sometimes', 'nullable', 'string', 'max:100'],
            'industry' => ['sometimes', 'nullable', 'string', 'max:120'],
            'country' => ['sometimes', 'required', 'string', 'max:100'],
            'website' => ['sometimes', 'nullable', 'url', 'max:255'],
            'gstin' => ['sometimes', 'nullable', 'string', 'max:30'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'address' => ['sometimes', 'nullable', 'string'],
        ]);

        DB::transaction(function () use ($validated, $client) {
            // Update users table.
            $userFields = [
                'name',
                'email',
                'mobile',
                'status',
                'role',
                'role_id',
            ];

            $userData = [];

            foreach ($userFields as $field) {
                if (array_key_exists($field, $validated)) {
                    $userData[$field] = $validated[$field];
                }
            }

            if ($userData !== []) {
                $client->update($userData);
            }

            // Update business profile only when one already exists.
            $businessFields = [
                'business_name',
                'business_type',
                'industry',
                'country',
                'website',
                'gstin',
                'city',
                'address',
            ];

            $businessData = [];

            foreach ($businessFields as $field) {
                if (array_key_exists($field, $validated)) {
                    $businessData[$field] = $validated[$field];
                }
            }

            if ($businessData !== []) {
                $profile = $client->businessProfile()->first();

                if (!$profile) {
                    abort(422, 'This user does not have a business profile. Create the business profile first.');
                }

                $profile->update($businessData);
            }
        });

        $client->refresh()->load('businessProfile');

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully.',
            'data' => $this->formatUser($client),
        ]);
    }

    /**
     * Delete a user account.
     *
     * This deletes the user, not just their business profile.
     */
    public function destroy(User $client): JsonResponse
    {
        DB::transaction(function () use ($client) {
            // Delete the associated business profile first.
            $client->businessProfile()->delete();

            // Delete the user account.
            $client->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully.',
        ]);
    }

    /**
     * Update user status.
     * Matches the existing PATCH /clients/{client}/status route.
     */
    public function status(Request $request, User $client): JsonResponse
    {
        $validated = $request->validate([
            'status' => [
                'required',
                Rule::in(['active', 'inactive', 'suspended']),
            ],
        ]);

        $client->update([
            'status' => $validated['status'],
        ]);

        $client->load('businessProfile');

        return response()->json([
            'success' => true,
            'message' => 'User status updated successfully.',
            'data' => $this->formatUser($client),
        ]);
    }

    /**
     * Format the user and related business details.
     */
    private function formatUser(User $user): array
    {
        $profile = $user->businessProfile;

        return [
            // User details
            'id' => $user->id,
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'status' => $user->status,
            'role' => $user->role,
            'role_id' => $user->role_id,
            'onboarding_step' => $user->onboarding_step,
            'email_verified_at' => $user->email_verified_at,
            'onboarding_completed_at' => $user->onboarding_completed_at,

            // Business profile (nullable if not created yet)
            'business_profile_id' => $profile?->id,
            'business_name' => $profile?->business_name,
            'business_type' => $profile?->business_type,
            'industry' => $profile?->industry,
            'country' => $profile?->country,
            'website' => $profile?->website,
            'gstin' => $profile?->gstin,
            'city' => $profile?->city,
            'address' => $profile?->address,

            // Counts
            'bots_count' => Bot::where('user_id', $user->id)->count(),
            'has_business_profile' => $profile !== null,

            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];
    }
}
