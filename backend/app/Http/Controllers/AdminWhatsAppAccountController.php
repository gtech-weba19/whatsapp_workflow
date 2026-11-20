<?php

namespace App\Http\Controllers;

use App\Models\WhatsAppAccount;
use App\Models\AdminNotification;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Mail\WhatsAppAccountApprovedMail;
use App\Notifications\WhatsAppAccountApprovedNotification;
use Illuminate\Support\Facades\Log;
use App\Services\EmailApiService;


class AdminWhatsAppAccountController extends Controller
{
    /**
     * List WhatsApp accounts with filters and statistics.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->isSuperAdmin();

        $query = WhatsAppAccount::with('user:id,name,email')->latest();

        if ($user && !$isSuperAdmin) {
            $query->where('user_id', $user->id);
        } elseif ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('search')) {
            $term = trim($request->string('search')->toString());

            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('business_name', 'like', "%{$term}%")
                    ->orWhere('waba_id', 'like', "%{$term}%")
                    ->orWhereHas('user', function ($userQuery) use ($term) {
                        $userQuery->where('name', 'like', "%{$term}%")
                            ->orWhere('email', 'like', "%{$term}%");
                    })
                    ->orWhereIn(
                        'user_id',
                        DB::table('business_profiles')
                            ->select('user_id')
                            ->where('business_name', 'like', "%{$term}%")
                    );
            });
        }

        $statsQuery = WhatsAppAccount::query();

        if ($user && !$isSuperAdmin) {
            $statsQuery->where('user_id', $user->id);
        } elseif ($request->filled('user_id')) {
            $statsQuery->where('user_id', $request->integer('user_id'));
        }

        $accounts = $query->get();

        $userIds = $accounts->pluck('user_id')
            ->filter()
            ->unique()
            ->values();

        $businessNames = $userIds->isEmpty()
            ? collect()
            : DB::table('business_profiles')
                ->whereIn('user_id', $userIds)
                ->pluck('business_name', 'user_id');

        return response()->json([
            'success' => true,
            'data' => $accounts->map(function (WhatsAppAccount $account) use ($businessNames) {
                return $this->format(
                    $account,
                    $businessNames->get($account->user_id)
                );
            })->values(),

            'stats' => [
                'total' => (clone $statsQuery)->count(),
                'connected' => (clone $statsQuery)
                    ->where('status', 'connected')->count(),
                'pending' => (clone $statsQuery)
                    ->where('status', 'pending')->count(),
                'disconnected' => (clone $statsQuery)
                    ->whereIn('status', ['disconnected', 'inactive'])->count(),
            ],
        ]);
    }

    /**
     * Authorize access to an account.
     */
    private function authorizeAccount(
        Request $request,
        WhatsAppAccount $account
    ): void {
        $user = $request->user();

        abort_if(!$user, 401, 'Unauthenticated.');

        if (!$user->isSuperAdmin()) {
            abort_if(
                (int) $account->user_id !== (int) $user->id,
                403,
                'Unauthorized. You cannot access this WhatsApp account.'
            );
        }
    }

    /**
     * Show one WhatsApp account.
     */
    public function show(
        Request $request,
        WhatsAppAccount $whatsapp_account
    ): JsonResponse {
        $this->authorizeAccount($request, $whatsapp_account);

        $account = $whatsapp_account->load('user:id,name,email');

        $businessName = DB::table('business_profiles')
            ->where('user_id', $account->user_id)
            ->value('business_name');

        return response()->json([
            'success' => true,
            'data' => $this->format($account, $businessName),
        ]);
    }


/**
 * Create a WhatsApp account.
 */
public function store(
    Request $request,
    EmailApiService $emailApiService
): JsonResponse {
    $user = $request->user();

    if (!$user) {
        return response()->json([
            'success' => false,
            'message' => 'Unauthenticated.',
        ], 401);
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate WhatsApp accounts for normal users
    |--------------------------------------------------------------------------
    */

    if (!$user->isSuperAdmin()) {
        $alreadyExists = WhatsAppAccount::where(
            'user_id',
            $user->id
        )->exists();

        if ($alreadyExists) {
            return response()->json([
                'success' => false,
                'code' => 'WHATSAPP_ACCOUNT_LIMIT_REACHED',
                'message' => 'You already have a WhatsApp account. Please update your existing account.',
            ], 422);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Get business name from business_profiles
    |--------------------------------------------------------------------------
    */

    $profileBusinessName = DB::table('business_profiles')
        ->where('user_id', $user->id)
        ->value('business_name');

    $request->merge([
        'name' => $request->input('name')
            ?: ($profileBusinessName ?: 'WhatsApp Business'),
    ]);

    /*
    |--------------------------------------------------------------------------
    | Validate request
    |--------------------------------------------------------------------------
    */

    $data = $request->validate($this->rules());

    /*
    |--------------------------------------------------------------------------
    | Assign account ownership
    |--------------------------------------------------------------------------
    */

    if (!$user->isSuperAdmin()) {
        $data['user_id'] = $user->id;
    }

    $data['business_name'] = $profileBusinessName;

    // Every newly created account must await admin approval.
    $data['status'] = 'pending';

    /*
    |--------------------------------------------------------------------------
    | Normalize WhatsApp number
    |--------------------------------------------------------------------------
    */

    if (filled($data['waba_id'] ?? null)) {
        $data['waba_id'] = $this->normalizePhoneNumber(
            $data['waba_id']
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Create WhatsApp account
    |--------------------------------------------------------------------------
    */

    try {
        $account = WhatsAppAccount::create($data);

        $account->load('user:id,name,email');
    } catch (QueryException $e) {
        if ($this->uniqueViolation($e)) {
            return response()->json([
                'success' => false,
                'message' => 'This WhatsApp mobile number is already assigned to another account.',
            ], 422);
        }

        throw $e;
    }

    /*
    |--------------------------------------------------------------------------
    | Prepare account and business details
    |--------------------------------------------------------------------------
    */

    $businessName = DB::table('business_profiles')
        ->where('user_id', $account->user_id)
        ->value('business_name');

    $businessName = filled($businessName)
        ? $businessName
        : (
            $account->business_name
            ?: ($account->name ?: 'WhatsApp Account')
        );

    $owner = $account->user;

    $emailSent = false;
    $adminEmailSent = false;

    /*
    |--------------------------------------------------------------------------
    | Send pending approval email to the user
    |--------------------------------------------------------------------------
    */

    if ($owner && filled($owner->email)) {
        try {
            $emailBody = view(
                'emails.whatsapp-account-pending',
                [
                    'owner' => $owner,
                    'account' => $account,
                    'businessName' => $businessName,
                ]
            )->render();

            $emailResult = $emailApiService->send(
                $owner->email,
                'WhatsApp Account Submitted – Pending Admin Approval | WABA.TODAY',
                $emailBody,
                $owner->name
            );

            $emailSent = !empty($emailResult['success']);

            if (!$emailSent) {
                Log::error(
                    'WhatsApp pending approval email failed',
                    [
                        'account_id' => $account->id,
                        'user_id' => $owner->id,
                        'email' => $owner->email,
                        'error' => $emailResult['error']
                            ?? $emailResult['message']
                            ?? 'Unknown email API error',
                        'status_code' => $emailResult['status_code'] ?? null,
                    ]
                );
            }
        } catch (\Throwable $e) {
            Log::error(
                'WhatsApp pending approval email exception',
                [
                    'account_id' => $account->id,
                    'user_id' => $owner->id,
                    'email' => $owner->email,
                    'error' => $e->getMessage(),
                ]
            );
        }
    } else {
        Log::warning(
            'WhatsApp pending email skipped: owner email unavailable',
            [
                'account_id' => $account->id,
                'user_id' => $account->user_id,
            ]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Send onboarding approval request email to admin
    |--------------------------------------------------------------------------
    */

    $adminEmail = env('ADMIN_EMAIL');

    if (filled($adminEmail)) {
        try {
            $adminEmailBody = view(
                'emails.whatsapp-account-pending-admin',
                [
                    'user_name' => $owner?->name ?? 'User',
                    'user_email' => $owner?->email ?? 'Not provided',

                    // Adjust these fields to match your users table.
                    'user_phone' => $owner?->phone
                        ?? $owner?->mobile
                        ?? 'Not provided',

                    'business_name' => $businessName,
                    'waba_id' => $account->waba_id
                        ?? 'Not provided',

                    'phone_number_id' => $account->phone_number_id
                        ?? 'Not provided',

                    'registration_date' => $account->created_at
                        ? $account->created_at->format('d M Y, h:i A')
                        : now()->format('d M Y, h:i A'),
                ]
            )->render();

            $adminEmailResult = $emailApiService->send(
                $adminEmail,
                'New User Onboarding Request – WhatsApp Number Approval Required',
                $adminEmailBody,
                'WABA.TODAY'
            );

            $adminEmailSent = !empty($adminEmailResult['success']);

            if (!$adminEmailSent) {
                Log::error(
                    'Admin WhatsApp onboarding email failed',
                    [
                        'account_id' => $account->id,
                        'user_id' => $account->user_id,
                        'admin_email' => $adminEmail,
                        'error' => $adminEmailResult['error']
                            ?? $adminEmailResult['message']
                            ?? 'Unknown email API error',
                        'status_code' => $adminEmailResult['status_code'] ?? null,
                    ]
                );
            }
        } catch (\Throwable $e) {
            Log::error(
                'Admin WhatsApp onboarding email exception',
                [
                    'account_id' => $account->id,
                    'user_id' => $account->user_id,
                    'admin_email' => $adminEmail,
                    'error' => $e->getMessage(),
                ]
            );
        }
    } else {
        Log::warning(
            'Admin onboarding email skipped: ADMIN_EMAIL is not configured',
            [
                'account_id' => $account->id,
            ]
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Send in-app notification to Admin
    |--------------------------------------------------------------------------
    */

    try {
        AdminNotification::create([
            'user_id' => $account->user_id,
            'type' => 'whatsapp_account_submitted',
            'title' => "WhatsApp Verification Request: {$businessName}",
            'message' => "Client " . ($owner?->name ?? 'User') . " (" . ($owner?->email ?? 'No email') . ") submitted WhatsApp account '{$businessName}' for verification.",
            'data' => [
                'account_id' => $account->id,
                'user_id' => $account->user_id,
                'user_name' => $owner?->name ?? 'User',
                'business_name' => $businessName,
                'action_url' => '/whatsapp-accounts',
            ],
        ]);
    } catch (\Throwable $e) {
        Log::warning('WhatsApp account admin notification error: ' . $e->getMessage());
    }

    /*
    |--------------------------------------------------------------------------
    | Return response
    |--------------------------------------------------------------------------
    */

    return response()->json([
        'success' => true,
        'message' => 'WhatsApp account submitted for admin approval.',
        'email_sent' => $emailSent,
        'admin_email_sent' => $adminEmailSent,
        'data' => $this->format($account, $businessName),
    ], 201);
}


    /**
     * Update a WhatsApp account.
     */
    public function update(
        Request $request,
        WhatsAppAccount $whatsapp_account
    ): JsonResponse {
        $this->authorizeAccount($request, $whatsapp_account);

        $data = $request->validate(
            $this->rules($whatsapp_account->id, true)
        );

        $user = $request->user();
        $targetUserId = $whatsapp_account->user_id;

        if ($user->isSuperAdmin() && isset($data['user_id'])) {
            $targetUserId = $data['user_id'];
        } else {
            unset($data['user_id']);
        }

        $data['business_name'] = DB::table('business_profiles')
            ->where('user_id', $targetUserId)
            ->value('business_name');

        if (array_key_exists('waba_id', $data) && filled($data['waba_id'])) {
            $data['waba_id'] = $this->normalizePhoneNumber($data['waba_id']);
        }

        foreach ([
            'access_token',
            'app_secret',
            'webhook_verify_token',
        ] as $secret) {
            if (array_key_exists($secret, $data) && blank($data[$secret])) {
                unset($data[$secret]);
            }
        }

        try {
            $whatsapp_account->update($data);

            if (blank($whatsapp_account->webhook_url)) {
                $whatsapp_account->webhook_url = url(
                    '/api/webhooks/whatsapp/' . $whatsapp_account->id
                );
                $whatsapp_account->save();
            }
        } catch (QueryException $e) {
            if ($this->uniqueViolation($e)) {
                return response()->json([
                    'success' => false,
                    'message' => 'This WhatsApp mobile number is already assigned to another account.',
                ], 422);
            }

            throw $e;
        }

        $account = $whatsapp_account->fresh()
            ->load('user:id,name,email');

        $businessName = DB::table('business_profiles')
            ->where('user_id', $account->user_id)
            ->value('business_name');

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp account updated successfully.',
            'data' => $this->format($account, $businessName),
        ]);
    }


public function status(
    Request $request,
    WhatsAppAccount $whatsapp_account,
    EmailApiService $emailApiService
): JsonResponse {
    $this->authorizeAccount($request, $whatsapp_account);

    $data = $request->validate([
        'status' => [
            'required',
            Rule::in([
                'connected',
                'pending',
                'disconnected',
                'inactive',
            ]),
        ],
    ]);

    $user = $request->user();
    $newStatus = $data['status'];

    // Only Super Admin can approve an account.
    if ($newStatus === 'connected' && !$user->isSuperAdmin()) {
        return response()->json([
            'success' => false,
            'message' => 'Only Super Admin can approve a WhatsApp account.',
        ], 403);
    }

    // Prevent sending duplicate approval emails/notifications.
    $isBeingApproved =
        $newStatus === 'connected'
        && $whatsapp_account->status !== 'connected';

    $updates = [
        'status' => $newStatus,
    ];

    if ($newStatus === 'connected') {
        $updates['last_synced_at'] = now();
    }

    $whatsapp_account->update($updates);

    $account = $whatsapp_account->fresh()
        ->load('user:id,name,email');

    $businessName = DB::table('business_profiles')
        ->where('user_id', $account->user_id)
        ->value('business_name');

    $businessName = filled($businessName)
        ? $businessName
        : ($account->business_name ?: $account->name ?: 'WhatsApp Account');

    $notificationSent = false;
    $emailSent = false;

    // Notify the owner only when the account is newly approved.
    if ($isBeingApproved && $account->user) {
        $owner = $account->user;

        // Dashboard notification.
        try {
            $owner->notify(
                new WhatsAppAccountApprovedNotification(
                    $account,
                    $businessName
                )
            );

            $notificationSent = true;
        } catch (\Throwable $e) {
            Log::error('WhatsApp approval notification failed', [
                'account_id' => $account->id,
                'user_id' => $owner->id,
                'error' => $e->getMessage(),
            ]);
        }

// Approval email through common EmailApiService.
if (filled($owner->email)) {
    try {
            $loginUrl = rtrim(
            env('FRONTEND_URL', 'http://localhost:5173'),
            '/'
        );
        $emailHtml = view('emails.whatsapp-account-approved', [
            'user_name' => $owner->name,
            'user_email' => $owner->email,
            'business_name' => $businessName,
            'waba_id' => $account->waba_id,
            'loginUrl' => $loginUrl,
        ])->render();

        $emailResult = $emailApiService->send(
            $owner->email,
            'Congratulations! Your WhatsApp Account Has Been Approved – WABA.TODAY',
            $emailHtml,
            $owner->name
        );

        $emailSent = !empty($emailResult['success']);

        if (!$emailSent) {
            Log::error('WhatsApp approval API email failed', [
                'account_id' => $account->id,
                'user_id' => $owner->id,
                'email' => $owner->email,
                'error' => $emailResult['error']
                    ?? $emailResult['message']
                    ?? 'Unknown email API error',
                'status_code' => $emailResult['status_code'] ?? null,
            ]);
        }
    } catch (\Throwable $e) {
        Log::error('WhatsApp approval API email exception', [
            'account_id' => $account->id,
            'user_id' => $owner->id,
            'email' => $owner->email,
            'error' => $e->getMessage(),
        ]);
    }
}

    }

    return response()->json([
        'success' => true,
        'message' => $isBeingApproved
            ? 'WhatsApp account approved. Notification and email processing completed.'
            : 'Account status updated successfully.',
        'notification_sent' => $notificationSent,
        'email_sent' => $emailSent,
        'data' => $this->format($account, $businessName),
    ]);
}

    /**
     * Delete a WhatsApp account.
     */
    public function destroy(
        Request $request,
        WhatsAppAccount $whatsapp_account
    ): JsonResponse {
        $this->authorizeAccount($request, $whatsapp_account);

        $whatsapp_account->delete();

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp account deleted successfully.',
        ]);
    }

    /**
     * Validation rules.
     */
    private function rules(
        ?int $id = null,
        bool $updating = false
    ): array {
        $user = request()->user();
        $isSuperAdmin = $user && $user->isSuperAdmin();

        $rules = [
            'name' => ['required', 'string', 'max:150'],

            'provider' => [
                'required',
                Rule::in([
                    'meta',
                    'bsp',
                    'wati',
                    'twilio',
                    'gupshup',
                    'custom',
                ]),
            ],

            'business_name' => ['nullable', 'string', 'max:255'],

            // waba_id is being used by this application to store
            // the normalized WhatsApp mobile number.
            'waba_id' => [
                'nullable',
                'string',
                'max:30',
                Rule::unique('whatsapp_accounts', 'waba_id')
                    ->ignore($id),
            ],

            'access_token' => [
                $updating ? 'sometimes' : 'nullable',
                'nullable',
                'string',
                'max:10000',
            ],

            'api_base_url' => ['nullable', 'url', 'max:500'],
            'sender_name' => ['nullable', 'string', 'max:150'],
            'webhook_dn_id' => ['nullable', 'string', 'max:100'],

            'status' => [
                'sometimes',
                Rule::in([
                    'connected',
                    'pending',
                    'disconnected',
                    'inactive',
                ]),
            ],
        ];

        if ($isSuperAdmin) {
            $rules['user_id'] = [
                $updating ? 'sometimes' : 'required',
                'integer',
                Rule::exists('users', 'id'),
            ];
        }

        return $rules;
    }

    /**
     * Normalize phone number to digits only.
     *
     * Example: +91 98765 43210 => 919876543210
     */
    // private function normalizePhoneNumber(string $number): string
    // {
    //     return preg_replace('/\D+/', '', $number) ?? '';
    // }

    private function normalizePhoneNumber(string $number): string
{
    // Remove +, spaces, -, brackets, etc.
    $number = preg_replace('/\D+/', '', $number) ?? '';

    // Add 91 if 10-digit Indian mobile number.
    if (strlen($number) === 10) {
        return '91' . $number;
    }

    // Remove leading 0 and add 91.
    if (strlen($number) === 11 && str_starts_with($number, '0')) {
        return '91' . substr($number, 1);
    }

    // Already has 91.
    return $number;
}

    /**
     * Format response without exposing credentials.
     */
    private function format(
        WhatsAppAccount $account,
        ?string $profileBusinessName = null
    ): array {
        return [
            'id' => $account->id,

            'user_id' => $account->user_id,
            'client_name' => $account->user?->name,
            'client_email' => $account->user?->email,

            'name' => $account->name,
            'provider' => $account->provider,

            'business_name' => filled($profileBusinessName)
                ? $profileBusinessName
                : $account->business_name,

            // Contains the normalized phone number in this application.
            'waba_id' => $account->waba_id,

            'has_access_token' => filled($account->access_token),
            'api_base_url' => $account->api_base_url,
            'sender_name' => $account->sender_name,
            'webhook_dn_id' => $account->webhook_dn_id,

            'status' => $account->status,
            'last_synced_at' => $account->last_synced_at?->toISOString(),

            'created_at' => $account->created_at?->toISOString(),
            'updated_at' => $account->updated_at?->toISOString(),
        ];
    }

    /**
     * Detect unique constraint violations.
     */
    private function uniqueViolation(QueryException $e): bool
    {
        return in_array(
            (string) ($e->errorInfo[1] ?? ''),
            ['1062', '19', '23505'],
            true
        );
    }
}
