<?php

namespace App\Http\Controllers;

use App\Mail\VerifyEmailMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Carbon\Carbon;

class EmailVerificationController extends Controller
{
    /**
     * Send verification email to a registered user.
     */
    public function sendVerificationLink(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = strtolower(trim($validated['email']));

        // Find the registered user.
        $user = DB::table('users')
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No account found with this email address. Please register first.',
            ], 404);
        }

        // Already verified.
        if ($user->email_verified_at !== null) {
            return response()->json([
                'success' => true,
                'email_verified' => true,
                'message' => 'Your email is already verified. Please log in.',
            ]);
        }

        // Generate a secure verification token.
        $token = Str::random(64);

        // Store only the hashed token.
        DB::table('email_verifications')->updateOrInsert(
            ['email' => $email],
            [
                'token_hash' => hash('sha256', $token),
                'expires_at' => now()->addMinutes(30),
                'verified_at' => null,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        $frontendUrl = rtrim(
            config(
                'app.frontend_url',
                env('FRONTEND_URL', 'http://localhost:5173')
            ),
            '/'
        );

        // The frontend will confirm this token with the API.
       $verificationUrl = $frontendUrl
            . '/?email_verification_token=' . urlencode($token)
            . '&email=' . urlencode($user->email);

        try {

            Mail::to($email)->send(
                new VerifyEmailMail($verificationUrl)
            );
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Unable to send the verification email. Please try again.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'email_verified' => false,
            'message' => 'Verification link sent successfully. Please check your inbox.',
        ]);
    }

    /**
     * Confirm verification token and update users.email_verified_at.
     */
    public function confirmVerification(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'token' => ['required', 'string', 'size:64'],
        ]);

        $email = strtolower(trim($validated['email']));

        return DB::transaction(function () use ($email, $validated) {

            // Find the registered user.
            $user = DB::table('users')
                ->whereRaw('LOWER(email) = ?', [$email])
                ->lockForUpdate()
                ->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'verified' => false,
                    'message' => 'User account not found.',
                ], 404);
            }

            // Check the actual users table first.
            if ($user->email_verified_at !== null) {
                return response()->json([
                    'success' => true,
                    'verified' => true,
                    'email_verified_at' => $user->email_verified_at,
                    'message' => 'Email already verified.',
                ]);
            }

            // Find the verification request.
            $verification = DB::table('email_verifications')
                ->where('email', $email)
                ->lockForUpdate()
                ->first();

            if (!$verification) {
                return response()->json([
                    'success' => false,
                    'verified' => false,
                    'message' => 'Verification request not found. Please request a new link.',
                ], 422);
            }

            // Validate the token before checking expiry.
            $submittedHash = hash('sha256', $validated['token']);

            if (!hash_equals(
                $verification->token_hash,
                $submittedHash
            )) {
                return response()->json([
                    'success' => false,
                    'verified' => false,
                    'message' => 'Invalid verification link.',
                ], 422);
            }

            // Check expiry.
            if (
                !$verification->expires_at ||
                now()->greaterThan(
                    Carbon::parse($verification->expires_at)
                )
            ) {
                return response()->json([
                    'success' => false,
                    'verified' => false,
                    'message' => 'Verification link has expired. Please request a new one.',
                ], 422);
            }

            $verifiedAt = now();

            // Update users.email_verified_at.
            DB::table('users')
                ->where('id', $user->id)
                ->update([
                    'email_verified_at' => $verifiedAt,
                    'updated_at' => $verifiedAt,
                ]);

            // Mark the verification request as completed.
            DB::table('email_verifications')
                ->where('email', $email)
                ->update([
                    'verified_at' => $verifiedAt,
                    'token_hash' => hash(
                        'sha256',
                        Str::random(64)
                    ),
                    'updated_at' => $verifiedAt,
                ]);

            return response()->json([
                'success' => true,
                'verified' => true,
                'email_verified_at' => $verifiedAt->toDateTimeString(),
                'message' => 'Email verified successfully. You can now log in.',
            ]);
        });
    }
}
