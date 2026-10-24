<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Tenant;
use App\Models\Role;
use App\Models\BusinessProfile;

use App\Mail\RegistrationCompletedMail;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use App\Mail\RegistrationStepAdminMail;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Illuminate\Database\QueryException;

use Throwable;

class AdminAuthController extends Controller
{

/**
 * Login
 */
public function login(Request $request)
{
    $data = $request->validate([
        'email' => ['required', 'email'],
        'password' => ['required', 'string'],
    ]);

    $email = strtolower(trim($data['email']));

    $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

    // 1. Check email and password
    if (
        !$user ||
        !Hash::check($data['password'], $user->password)
    ) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid email or password.',
        ], 401);
    }

    // 2. Check email verification
    if ($user->email_verified_at === null) {
        return response()->json([
            'success' => false,
            'email_verified' => false,
            'message' => 'Please verify your email address before logging in.',
            'email' => $user->email,
        ], 403);
    }

    // 3. Create Sanctum token
    $token = $user->createToken(
        'react',
        ['*'],
        now()->addHours(24)
    )->plainTextToken;

    $user = $user->fresh();

    return response()->json([
        'success' => true,
        'message' => 'Login successful.',
        'token' => $token,
        'user' => $this->formatAuthUser($user),
        'tenant' => $user->tenant ?? null,
    ]);
}

/**
 * Register / Signup
 */

/**
 * Register / Signup - WABA Bot Automation
 */
public function register(Request $request)
{
    $data = $request->validate([
        // Basic Details
        'name' => ['required', 'string', 'max:255'],
        'company_name' => ['required', 'string', 'max:190'],

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

        // Business Profile
        'business_type' => ['nullable', 'string', 'max:100'],
        'industry' => ['nullable', 'string', 'max:120'],
        'country' => ['nullable', 'string', 'max:100'],
        'website' => ['nullable', 'string', 'max:255'],
        'gstin' => ['nullable', 'string', 'max:30'],
        'city' => ['nullable', 'string', 'max:120'],
        'address' => ['nullable', 'string', 'max:10000'],

        // Additional registration fields from React form
        'meta_account_type' => ['nullable', 'string', 'max:100'],
        'onboarding_preference' => ['nullable', 'string', 'max:100'],
        'number_setup_type' => ['nullable', 'string', 'max:100'],
        'document_note' => ['nullable', 'string', 'max:2000'],
        'document_consent' => ['nullable'],
        'utility_bill' => ['nullable', 'file', 'max:5120'],
        'gst_document' => ['nullable', 'file', 'max:5120'],
    ]);

    try {
        /*
         * 1. Create user and business profile.
         * Database changes are committed together.
         */
        $user = DB::transaction(function () use ($data) {
            $role = Role::where('slug', 'client')->first();

            if (!$role) {
                throw new \RuntimeException(
                    'Client role not found in the roles table.'
                );
            }

            // Normalize Indian mobile number.
            $mobile = '91' . $data['mobile'];

            $userData = [
                    'name' => $data['name'],
                    'mobile' => $mobile,
                    'email' => $data['email'],
                    'password' => Hash::make($data['password']),
                    'status' => 'active',
                    'onboarding_step' => 'choose_plan',
                    'email_verified_at' => null,
                ];

            if (Schema::hasColumn('users', 'role_id')) {
                $userData['role_id'] = $role->id;
            } elseif (Schema::hasColumn('users', 'role')) {
                $userData['role'] = $role->slug;
            } else {
                throw new \RuntimeException(
                    'The users table has neither role_id nor role column.'
                );
            }

            $user = User::create($userData);

        $profileData = [
            'user_id' => $user->id,
            'business_name' => $data['company_name'],
            'business_type' => $data['business_type'] ?? null,
            'industry' => $data['industry'] ?? null,
            'country' => $data['country'] ?? 'India',
            'website' => $data['website'] ?? null,
            'gstin' => $data['gstin'] ?? null,
            'city' => $data['city'] ?? null,
            'address' => $data['address'] ?? null,
        ];

            BusinessProfile::create($profileData);

            return $user;
        });

        /*
         * 2. Send registration details email.
         * Email failure must not undo the saved registration.
         */
        $registrationEmailSent = false;

        try {
            $businessProfile = BusinessProfile::where(
                'user_id',
                $user->id
            )->first();

            $details = [
                'name' => $user->name,
                'email' => $user->email,
                'mobile' => $user->mobile,
                 'company_name' => $businessProfile?->business_name
                 ?? $data['company_name'],
                'business_type' => $businessProfile->business_type
                    ?? ($data['business_type'] ?? 'Not provided'),
                'industry' => $businessProfile->industry
                    ?? ($data['industry'] ?? 'Not provided'),
                'country' => $businessProfile->country
                    ?? ($data['country'] ?? 'India'),
                'city' => $businessProfile->city
                    ?? ($data['city'] ?? 'Not provided'),
                'website' => $businessProfile->website
                    ?? ($data['website'] ?? 'Not provided'),
                'gstin' => $businessProfile->gstin
                    ?? ($data['gstin'] ?? 'Not provided'),
                'address' => $businessProfile->address
                    ?? ($data['address'] ?? 'Not provided'),

                // Additional registration form values
                'meta_account_type' => $data['meta_account_type']
                    ?? 'Not provided',
                'onboarding_preference' => $data['onboarding_preference']
                    ?? 'Not provided',
                'number_setup_type' => $data['number_setup_type']
                    ?? 'Not provided',
                'document_note' => $data['document_note']
                    ?? 'Not provided',
            ];

            Mail::to($user->email)->send(
                new RegistrationCompletedMail($details)
            );

            $registrationEmailSent = true;
        } catch (Throwable $mailException) {
            Log::error(
                'WABA Bot registration details email failed',
                [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $mailException->getMessage(),
                ]
            );
        }

        /*
         * 3. Send Laravel email verification notification.
         */
        $verificationEmailSent = false;

        try {
            $user->sendEmailVerificationNotification();
            $verificationEmailSent = true;
        } catch (Throwable $mailException) {
            Log::error(
                'WABA Bot verification email failed',
                [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $mailException->getMessage(),
                ]
            );
        }

        /*
         * 4. Return success without automatically logging in.
         */
        $message = 'Registration successful. Please log in after verifying your email address.';

        if (!$verificationEmailSent) {
            $message = 'Registration successful, but the verification email could not be sent. Please contact support or try resending the verification email.';
        } elseif (!$registrationEmailSent) {
            $message = 'Registration successful and verification email sent. The registration confirmation email could not be sent.';
        }

        return response()->json([
            'success' => true,
            'email_verification_required' => true,
            'verification_email_sent' => $verificationEmailSent,
            'registration_email_sent' => $registrationEmailSent,
            'message' => $message,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ], 201);

    } catch (QueryException $e) {
        Log::error('WABA Bot registration database error', [
            'email' => $data['email'] ?? null,
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Registration database error.',
            'error' => config('app.debug')
                ? $e->getMessage()
                : 'Please check storage/logs/laravel.log.',
        ], 500);

    } catch (Throwable $e) {
        Log::error('WABA Bot registration error', [
            'email' => $data['email'] ?? null,
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Something went wrong during registration.',
            'error' => config('app.debug')
                ? $e->getMessage()
                : 'Please check storage/logs/laravel.log.',
        ], 500);
    }
}



public function saveRegistrationProgress(Request $request)
{
    $validator = Validator::make($request->all(), [
        'step' => ['required', 'integer', 'between:1,4'],
        'form' => ['required', 'array'],
        'form.email' => ['required', 'email', 'max:255'],
        'registration_completed' => ['sometimes', 'boolean'],
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid progress data.',
            'errors' => $validator->errors(),
        ], 422);
    }

    $step = (int) $request->input('step');
    $form = $request->input('form');
    $email = strtolower(trim($form['email']));

    $allowedFields = [
        'name',
        'email',
        'mobile',
        'company_name',
        'business_type',
        'industry',
        'country',
        'website',
        'gstin',
        'city',
        'meta_account_type',
        'onboarding_preference',
        'number_setup_type',
        'document_note',
        'document_consent',
    ];

    $safeForm = [];

    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $form)) {
            $value = $form[$field];

            if (is_scalar($value) || $value === null) {
                $safeForm[$field] = $value;
            }
        }
    }

    // Step 4 is considered completed only when explicitly confirmed.
    $registrationCompleted = $step === 4
        && $request->boolean('registration_completed');

    try {
        // Save registration progress.
        $progress = DB::transaction(function () use (
            $email,
            $step,
            $safeForm,
            $registrationCompleted
        ) {
            $record = DB::table('registration_progress')
                ->where('email', $email)
                ->first();

            $oldData = $record && $record->form_data
                ? (json_decode($record->form_data, true) ?? [])
                : [];

            $mergedData = array_merge($oldData, $safeForm);

            $completedSteps = $record && $record->completed_steps
                ? (json_decode($record->completed_steps, true) ?? [])
                : [];

            if (!in_array($step, $completedSteps, true)) {
                $completedSteps[] = $step;
            }

            sort($completedSteps);

            $values = [
                'current_step' => $step,
                'completed_steps' => json_encode($completedSteps),
                'form_data' => json_encode($mergedData),
                'registration_completed' => $registrationCompleted,
                'updated_at' => now(),
            ];

            if ($record) {
                DB::table('registration_progress')
                    ->where('id', $record->id)
                    ->update($values);
            } else {
                $values['email'] = $email;
                $values['created_at'] = now();

                DB::table('registration_progress')
                    ->insert($values);
            }

            return $mergedData;
        });

        // Send progress email to the registering user, not the admin.
        Mail::to($email)->send(
            new RegistrationStepAdminMail(
                $progress,
                $step,
                $registrationCompleted
            )
        );

        return response()->json([
            'success' => true,
            'progress_saved' => true,
            'progress_email_sent' => true,
            'step' => $step,
            'registration_completed' => $registrationCompleted,
            'message' => $registrationCompleted
                ? 'Registration completed successfully. Confirmation email sent.'
                : 'Registration progress saved. Progress email sent to your email address.',
        ]);

    } catch (Throwable $e) {
        Log::error('Registration progress save/email failed', [
            'email' => $email,
            'step' => $step,
            'error' => $e->getMessage(),
        ]);

        return response()->json([
            'success' => false,
            'progress_saved' => false,
            'progress_email_sent' => false,
            'message' => 'Could not save registration progress or send the email. Please try again.',
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
            'user' => $this->formatAuthUser($user),
            'tenant' => $user->tenant ?? null,
        ]);
    }

/**
 * Helper to format authenticated user with permissions
 */
private function formatAuthUser(User $user): array
{
    $userData = $user->toArray();

    $userData['is_super_admin'] = $user->isSuperAdmin();

    $userData['role_name'] =
        $user->roleRelation?->name ?? ucfirst($user->role ?? '');

    // Always fetch the current permissions from the backend
    $userData['permissions'] = $user->getAllPermissions();

    return $userData;
}
}
