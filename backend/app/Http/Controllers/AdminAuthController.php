<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Validator;
use Throwable;


class AdminAuthController extends Controller
{
    /**
     * Login
     */
  public function login(Request $request)
{
    $data = $request->validate([
        'email' => 'required|email',
        'password' => 'required|string',
    ]);

    $user = User::where('email', $data['email'])->first();

    if (
        !$user ||
        !Hash::check($data['password'], $user->password)
    ) {
        return response()->json([
            'message' => 'Invalid credentials',
        ], 422);
    }

    $token = $user->createToken('react')->plainTextToken;

    return response()->json([
        'message' => 'Login successful',
        'token' => $token,
        'user' => $user->fresh(),
        'tenant' => $user->tenant ?? null,
    ]);
}
  /**
 * Register / Signup
 */
public function register(Request $request)
{
    $data = $request->validate([
        'name' => [
            'required',
            'string',
            'max:255',
        ],
        'company_name' => [
            'required',
            'string',
            'max:255',
        ],
        'mobile' => [
            'required',
            'string',
            'digits:10',
            'regex:/^[6-9][0-9]{9}$/',
        ],
        'email' => [
            'required',
            'email',
            'max:255',
            Rule::unique('users', 'email'),
        ],
        'password' => [
            'required',
            'string',
            'min:8',
            'confirmed',
        ],
    ]);

    try {
        $result = DB::transaction(function () use ($data) {

            // Normalize Indian mobile number
            $mobile = '91' . $data['mobile'];

            // Create tenant/company
            $tenant = Tenant::create([
                'name' => $data['company_name'],
                'slug' => Str::slug($data['company_name'])
                    . '-' . Str::lower(Str::random(6)),
                'mobile' => $mobile,
                'email' => $data['email']
            ]);

            // Create user
            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $data['name'],
                'mobile' => $mobile,
                'company_name' => $data['company_name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => 'client',
                'status' => 'active',
            ]);

            // Generate Sanctum token
            $token = $user->createToken('react')->plainTextToken;

            return [
                'user' => $user,
                'tenant' => $tenant,
                'token' => $token,
            ];
        });

        return response()->json([
            'message' => 'Registration successful',
            'token' => $result['token'],
            'user' => $result['user'],
            'tenant' => $result['tenant'],
        ], 201);

    } catch (QueryException $e) {
        Log::error('Registration database error', [
            'email' => $data['email'] ?? null,
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);

        return response()->json([
            'message' => 'Registration database error.',
            'error' => config('app.debug')
                ? $e->getMessage()
                : 'Please check the Laravel logs.',
        ], 500);

    } catch (Throwable $e) {
        Log::error('Registration error', [
            'email' => $data['email'] ?? null,
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);

        return response()->json([
            'message' => 'Something went wrong during registration.',
            'error' => config('app.debug')
                ? $e->getMessage()
                : 'Please check the Laravel logs.',
        ], 500);
    }
}


public function checkEmail(Request $request)
{
    $request->validate([
        'email' => ['required', 'email', 'max:255'],
    ]);

    $email = strtolower(trim($request->input('email')));

    $exists = \App\Models\User::whereRaw(
        'LOWER(email) = ?',
        [$email]
    )->exists();

    return response()->json([
        'available' => !$exists,
        'message' => $exists
            ? 'Email already taken.'
            : 'Email is available.',
    ]);
}
    /**
     * Logout
     */
    public function logout(Request $request)
    {
        $request->user()
            ->currentAccessToken()
            ?->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Authenticated user
     */
 public function me(Request $request)
{
    $user = $request->user()->fresh();

    return response()->json([
        'user' => $user,
        'tenant' => $user->tenant ?? null,
    ]);
}
}
