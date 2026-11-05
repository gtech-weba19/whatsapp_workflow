<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;

class PasswordResetController extends Controller
{
    /**
     * Send password reset link to registered email.
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        try {
            $status = Password::sendResetLink(
                $request->only('email')
            );

            if ($status === Password::RESET_LINK_SENT) {
                return response()->json([
                    'success' => true,
                    'message' => 'Password reset link has been sent to your email.',
                ], 200);
            }

            Log::warning('Password reset link could not be sent.', [
                'email' => $request->email,
                'status' => $status,
            ]);

            return response()->json([
                'success' => false,
                'message' => __($status),
                'status' => $status,
            ], 422);

        } catch (\Throwable $e) {

            Log::error('Password reset email exception.', [
                'email' => $request->email,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to send password reset email. Please try again later.',
            ], 500);
        }
    }

    /**
     * Reset password using valid email reset token.
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => [
                'required',
                'string',
                'confirmed',
                PasswordRule::min(8)
                    ->mixedCase()
                    ->numbers(),
            ],
        ]);

        try {
            $status = Password::reset(
                $request->only(
                    'email',
                    'password',
                    'password_confirmation',
                    'token'
                ),
                function ($user, $password) {
                    $user->forceFill([
                        'password' => Hash::make($password),
                        'remember_token' => Str::random(60),
                    ])->save();
                }
            );

            if ($status === Password::PASSWORD_RESET) {
                return response()->json([
                    'success' => true,
                    'message' => 'Your password has been reset successfully.',
                ], 200);
            }

            Log::warning('Password reset failed.', [
                'email' => $request->email,
                'status' => $status,
            ]);

            return response()->json([
                'success' => false,
                'message' => __($status),
                'status' => $status,
            ], 422);

        } catch (\Throwable $e) {

            Log::error('Password reset exception.', [
                'email' => $request->email,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to reset password. Please try again later.',
            ], 500);
        }
    }
}
