<?php

namespace App\Http\Controllers;

use App\Models\AdminNotification;
use App\Models\PackagePlan;
use App\Models\User;
use App\Models\UserMessageRate;
use App\Models\UserSubscription;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WalletBillingController extends Controller
{
    public function __construct(
        protected WalletService $walletService
    ) {}

    /**
     * Get current authenticated user's wallet info
     */
    public function getWallet(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $summary = $this->walletService->getWalletSummary($user);
        $activeSubscription = $summary['active_subscription'];
        $activePlan = $summary['active_plan'];

        $activeSubscriptionData = null;

        if ($activeSubscription) {
            $activeSubscriptionData = $activeSubscription->toArray();
            $activeSubscriptionData['plan'] = $activePlan
                ? $activePlan->toArray()
                : null;
        }

        // Check if user has claimed/used trial
        $hasUsedTrial = UserSubscription::where('user_id', $user->id)
            ->where('package_plan_id', 1)
            ->exists() || WalletTransaction::where('user_id', $user->id)
            ->where('transaction_type', 'signup_bonus')
            ->exists();

        return response()->json([
            'success' => true,
            'balance' => $summary['balance'],
            'remaining_balance' => $summary['remaining_balance'],
            'total_taken' => $summary['total_taken'],
            'total_used' => $summary['total_used'],
            'total_credited' => $summary['total_credited'],
            'total_plan_amount' => $summary['total_plan_amount'],
            'active_plan_amount' => $summary['active_plan_amount'],
            'active_plan_credits' => $summary['active_plan_credits'],
            'usage_percentage' => $summary['usage_percentage'],
            'rate' => $summary['rate'],
            'currency' => $summary['currency'],
            'user_id' => $user->id,
            'estimated_messages' => $summary['estimated_messages'],
            'used_messages' => $summary['used_messages'],
            'total_messages' => $summary['total_messages'],
            'has_active_plan' => $summary['has_active_plan'],
            'active_subscription' => $activeSubscriptionData,
            'active_plan_id' => $summary['active_plan_id'],
            'active_plan_name' => $summary['active_plan_name'],
            'has_used_trial' => $hasUsedTrial,
        ]);
    }

    /**
     * Get transaction passbook history for current user
     */
    public function getTransactions(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $transactions = WalletTransaction::where('user_id', $user->id)
            ->orderByDesc('id')
            ->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $transactions,
        ]);
    }


  public function getPlans(): JsonResponse
{

    $plansList = [
        [
            'id' => 1,
            'name' => 'Free Trial Pack',
            'slug' => 'trial-100',
            'selling_price' => 100,
            'message_credits' => 100,
            'validity_days' => null,
            'description' => 'Free ₹100 Welcome credits for testing WhatsApp workflows & messages.',
        ],
        [
            'id' => 2,
            'name' => 'Starter Pack',
            'slug' => 'starter-1000',
            'selling_price' => 1000,
            'message_credits' => 1000,
            'validity_days' => null,
            'description' => 'Ideal for small businesses to start sending messages and automation.',
        ],
        [
            'id' => 3,
            'name' => 'Business Growth Pack',
            'slug' => 'business-10000',
            'selling_price' => 10000,
            'message_credits' => 10000,
            'validity_days' => null,
            'description' => 'Power pack for growing teams with higher message volumes.',
        ],
        [
            'id' => 4,
            'name' => 'Enterprise Volume Pack',
            'slug' => 'enterprise-100000',
            'selling_price' => 100000,
            'message_credits' => 100000,
            'validity_days' => null,
            'description' => 'Highest volume plan with dedicated support and lowest per-message rates.',
        ],
    ];

    // Attach subscriber information
    foreach ($plansList as &$plan) {

        $planId = (int) $plan['id'];

        $subscriptions = UserSubscription::where('package_plan_id', $planId)
            ->with('user:id,name,email,role')
            ->orderByDesc('id')
            ->get();

        $uniqueSubscribers = [];
        $seenUsers = [];

        foreach ($subscriptions as $sub) {

            if (!in_array($sub->user_id, $seenUsers)) {

                $seenUsers[] = $sub->user_id;

                $uniqueSubscribers[] = [
                    'subscription_id' => $sub->id,
                    'user_id' => $sub->user_id,
                    'user_name' => $sub->user?->name ?? ('User #' . $sub->user_id),
                    'user_email' => $sub->user?->email ?? '',
                    'user_role' => $sub->user?->role ?? 'client',
                    'amount_paid' => (float) $sub->amount_paid,
                    'status' => $sub->status,
                    'starts_at' => $sub->starts_at?->format('d M Y, h:i A'),
                    'expires_at' => $sub->expires_at?->format('d M Y'),
                ];
            }
        }

        $plan['subscribers_count'] = count($uniqueSubscribers);
        $plan['subscribers'] = $uniqueSubscribers;
        $plan['total_revenue'] = (float) $subscriptions->sum('amount_paid');
    }

    unset($plan);

    return response()->json([
        'success' => true,
        'plans' => $plansList,
    ]);
}

    /**
     * Recharge/Claim Plan directly (for Free Trial) or validate before Razorpay
     */
    public function rechargePlan(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id' => ['required'],
        ]);

        $user = $request->user();
        $planId = (int) $request->plan_id;

        // If it's the Free Trial Plan (ID 1)
        if ($planId === 1) {
            $hasUsedTrial = UserSubscription::where('user_id', $user->id)
                ->where('package_plan_id', 1)
                ->exists();

            if ($hasUsedTrial) {
                return response()->json([
                    'success' => false,
                    'message' => 'You have already claimed your Free Trial.',
                ], 400);
            }

            // Create free trial subscription
            $subscription = UserSubscription::create([
                'user_id' => $user->id,
                'package_plan_id' => 1,
                'amount_paid' => 100.00,
                'currency' => 'INR',
                'credits_granted' => 100,
                'credits_remaining' => 100,
                'starts_at' => now(),
                'expires_at' => null,
                'status' => 'active',
            ]);

            // Top up wallet if not already done by signup bonus
            $hasSignupBonus = WalletTransaction::where('user_id', $user->id)
                ->where('transaction_type', 'signup_bonus')
                ->exists();

            if (!$hasSignupBonus) {
                $this->walletService->addCredit($user, 100.00, 'Welcome Free Trial Pack', 'TRIAL-' . $user->id);
            }

            // try {
            //     AdminNotification::create([
            //         'user_id' => $user->id,
            //         'type' => 'free_trial_claimed',
            //         'title' => "Free Trial Claimed: {$user->name}",
            //         'message' => "Client {$user->name} ({$user->email}) claimed the ₹100 Free Trial Pack.",
            //         'data' => [
            //             'user_id' => $user->id,
            //             'user_name' => $user->name,
            //             'user_email' => $user->email,
            //             'plan_id' => 1,
            //             'plan_name' => 'Free Trial Pack',
            //             'action_url' => '/plans?tab=alerts',
            //         ],
            //         'is_read' => false,
            //     ]);
            // } catch (\Throwable $e) {

            // }

            return response()->json([
                'success' => true,
                'message' => 'Free Trial Pack activated successfully! ₹100 credits available.',
                'new_balance' => (float) $this->walletService->getBalance($user),
                'subscription' => $subscription,
            ]);
        }

        // For paid plans, frontend will initiate Razorpay checkout
        return response()->json([
            'success' => false,
            'requires_payment' => true,
            'message' => 'Please proceed with Razorpay payment to activate this paid plan.',
        ], 402);
    }

    /**
     * Admin: Set custom per-message rate for a user
     */
    public function adminSetUserRate(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->isSuperAdmin() && !$admin->hasPermission('users.manage')) {
            return response()->json(['message' => 'Unauthorized to modify user rates.'], 403);
        }

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'rate' => ['required', 'numeric', 'min:0.0001', 'max:100.0'],
        ]);

        $targetUser = User::findOrFail($validated['user_id']);
        $rateRecord = $this->walletService->setUserRate($targetUser, (float) $validated['rate']);

        return response()->json([
            'success' => true,
            'message' => "Message rate for {$targetUser->name} updated to ₹" . number_format($rateRecord->rate_per_message, 4) . "/msg.",
            'rate' => (float) $rateRecord->rate_per_message,
            'user_id' => $targetUser->id,
        ]);
    }

    /**
     * Admin: Manually adjust/top-up user's wallet
     */
    public function adminAdjustUserWallet(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->isSuperAdmin() && !$admin->hasPermission('users.manage')) {
            return response()->json(['message' => 'Unauthorized to adjust user wallet.'], 403);
        }

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'type' => ['required', 'in:credit,debit'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:1000000'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $targetUser = User::findOrFail($validated['user_id']);
        $amount = (float) $validated['amount'];
        $notes = $validated['notes'] ?? ('Admin adjustment by ' . $admin->name);

        if ($validated['type'] === 'credit') {
            $tx = $this->walletService->addCredit(
                user: $targetUser,
                amount: $amount,
                description: $notes,
                referenceId: 'ADJ-' . time()
            );

            return response()->json([
                'success' => true,
                'message' => "Credited ₹" . number_format($amount, 2) . " successfully.",
                'new_balance' => (float) $this->walletService->getBalance($targetUser),
            ]);
        } else {
            try {
                $tx = $this->walletService->deductCredit(
                    user: $targetUser,
                    amount: $amount,
                    description: $notes,
                    transactionType: 'manual_adjustment',
                    referenceId: 'ADJ-' . time()
                );

                return response()->json([
                    'success' => true,
                    'message' => "Debited ₹" . number_format($amount, 2) . " successfully.",
                    'new_balance' => (float) $this->walletService->getBalance($targetUser),
                ]);
            } catch (\Throwable $e) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }
        }
    }

    /**
     * Admin: Get all clients with wallet balances, active subscriptions, and message rates
     */
    public function adminGetClients(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->isSuperAdmin() && !$admin->hasPermission('users.manage')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $users = User::select('id', 'name', 'email', 'role', 'role_id', 'created_at')
            ->orderByDesc('id')
            ->get();

        $planNameMap = [
            1 => 'Free Trial Pack (₹100)',
            2 => 'Starter Pack (₹1,000)',
            3 => 'Business Growth Pack (₹10,000)',
            4 => 'Enterprise Volume Pack (₹100,000)',
        ];

        $data = $users->map(function ($u) use ($planNameMap) {
            $rate = $this->walletService->getUserRate($u);
            $walletBalance = $this->walletService->getBalance($u);

            $activeSub = UserSubscription::where('user_id', $u->id)
                ->where('status', 'active')
                ->orderByDesc('id')
                ->first();

            $planName = null;
            if ($activeSub) {
                $pId = (int) $activeSub->package_plan_id;
                $planName = $planNameMap[$pId] ?? ('Active Plan #' . $pId);
            }

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'wallet_balance' => $walletBalance,
                'rate' => $rate,
                'active_plan' => $activeSub ? [
                    'id' => $activeSub->package_plan_id,
                    'name' => $planName,
                    'amount_paid' => (float) $activeSub->amount_paid,
                    'credits_granted' => $activeSub->credits_granted,
                    'starts_at' => $activeSub->starts_at?->format('Y-m-d H:i'),
                    'expires_at' => $activeSub->expires_at?->format('Y-m-d H:i'),
                    'status' => $activeSub->status,
                ] : null,
                'created_at' => $u->created_at?->format('Y-m-d H:i'),
            ];
        });

        return response()->json([
            'success' => true,
            'clients' => $data,
        ]);
    }

    /**
     * Admin: Get recent notifications (e.g. plan activations)
     */
    public function getAdminNotifications(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->isSuperAdmin() && !$admin->hasPermission('users.manage')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $notifications = AdminNotification::orderByDesc('id')
            ->take(30)
            ->get();

        $unreadCount = AdminNotification::where('read_at', false)->count();

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Admin: Mark single notification as read
     */
    public function markNotificationRead(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->isSuperAdmin() && !$admin->hasPermission('users.manage')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        AdminNotification::where('id', $id)->update([
            'read_at' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
        ]);
    }

    /**
     * Admin: Mark all notifications as read
     */
    public function markAllNotificationsRead(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin->isSuperAdmin() && !$admin->hasPermission('users.manage')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        AdminNotification::where('read_at', false)->update([
            'read_at' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read.',
        ]);
    }
}
