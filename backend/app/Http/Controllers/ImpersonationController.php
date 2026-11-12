<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\PersonalAccessToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ImpersonationController extends Controller
{
   public function start(Request $request, User $user)
    {
        $admin = $request->user();

        // Only Super Admin can impersonate.
        if (!$admin || !$admin->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Super Admin access required.',
            ], 403);
        }
        $currentToken = $admin->currentAccessToken();

        if (
            $currentToken instanceof PersonalAccessToken &&
            $currentToken->is_impersonation
        ) {
            return response()->json([
                'success' => false,
                'message' => 'You are already impersonating a user.',
            ], 403);
        }

        if ((int) $admin->id === (int) $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot impersonate your own account.',
            ], 422);
        }
        if ($user->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot impersonate another Super Admin.',
            ], 403);
        }

        $result = DB::transaction(function () use ($admin, $user, $request) {
            $newToken = $user->createToken(
                'impersonation-by-admin-' . $admin->id,
                ['*'],
                now()->addMinutes(60)
            );

            $accessToken = $newToken->accessToken;
            $accessToken->forceFill([
                'is_impersonation' => true,
                'impersonator_id' => $admin->id,
            ])->save();
            if (Schema::hasTable('user_impersonation_logs')) {
                DB::table('user_impersonation_logs')->insert([
                    'admin_user_id' => $admin->id,
                    'target_user_id' => $user->id,
                    'token_id' => $accessToken->id,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'started_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return [
                'token' => $newToken->plainTextToken,
                'expires_at' => $accessToken->expires_at,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'User account accessed successfully.',
            'token' => $result['token'],
            'token_type' => 'Bearer',
            'expires_at' => $result['expires_at'],

            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->getAttribute('role'),
            ],

            'impersonation' => [
                'active' => true,
                'admin_id' => $admin->id,
                'target_user_id' => $user->id,
            ],
        ]);
    }


    /**
     * Stop impersonation and revoke the temporary token.
     */
    public function stop(Request $request)
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();

        if (
            !$token instanceof PersonalAccessToken ||
            !$token->is_impersonation
        ) {
            return response()->json([
                'success' => false,
                'message' => 'No active impersonation session found.',
            ], 403);
        }

        DB::transaction(function () use ($token) {
            if (Schema::hasTable('user_impersonation_logs')) {
                DB::table('user_impersonation_logs')
                    ->where('token_id', $token->id)
                    ->whereNull('ended_at')
                    ->update([
                        'ended_at' => now(),
                        'updated_at' => now(),
                    ]);
            }

            $token->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Impersonation stopped successfully.',
        ]);
    }

}
