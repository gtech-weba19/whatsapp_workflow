<?php

namespace App\Http\Controllers;

use App\Models\AdminNotification;
use App\Models\CreditTransaction;
use App\Models\CreditWallet;
use App\Models\PackagePlan;
use App\Models\User;
use App\Models\UserSubscription;
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

        // Ensure wallet initialized
        $wallet = CreditWallet::where('user_id', $user->id)->first();
        if (!$wallet) {
            $wallet = $this->walletService->initializeWallet($user);
        }

        $balance = (float) $wallet->available_credits;
        $rate = $this->walletService->getUserRate($user->id);

        // Fetch active subscription with package plan
        $activeSubscription = UserSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->with('plan')
            ->orderByDesc('id')
            ->first();

        $hasUsedTrial = UserSubscription::where('user_id', $user->id)
            ->where('package_plan_id', 1)
            ->exists();

        return response()->json([
            'success' => true,
            'balance' => $balance,
            'rate' => $rate,
            'currency' => $wallet->currency ?? 'INR',
            'user_id' => $user->id,
            'estimated_messages' => $rate > 0 ? (int) floor($balance / $rate) : 0,
            'active_subscription' => $activeSubscription,
            'active_plan_id' => $activeSubscription?->package_plan_id,
            'has_used_trial' => $hasUsedTrial,
        ]);
    }

    /**
     * Get transaction passbook history for current user
     */
    public function getTransactions(Request $request): JsonResponse
    {
        $user = $request->user();

        $transactions = CreditTransaction::where('user_id', $user->id)
            ->with(['subscription.plan'])
            ->orderByDesc('id')
            ->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $transactions,
        ]);
    }

    /**
     * Get all active Package Plans (₹100, ₹1000, ₹10000, ₹100000)
     */
    public function getPlans(): JsonResponse
    {
        $plans = PackagePlan::where('is_active', 1)
            ->orderBy('sort_order', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'plans' => $plans,
        ]);
    }

    /**
     * Recharge/Subscribe current user to a package plan
     */
    public function rechargePlan(Request $request): JsonResponse
    {
        $request->validate([
            'plan_id' => ['required', 'integer', 'exists:package_plans,id'],
        ]);

        $user = $request->user();

        try {
            $result = $this->walletService->subscribeToPlan($user->id, (int) $request->plan_id);

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'new_balance' => $result['new_balance'],
                'subscription' => $result['subscription'],
                'plan' => $result['plan'],
            ]);
        } catch (\Throwable $e) {
            Log::error('Plan recharge failed', [
                'user_id' => $user->id,
                'plan_id' => $request->plan_id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to activate plan: ' . $e->getMessage(),
            ], 500);
        }
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
            'channel' => ['sometimes', 'string', 'in:whatsapp,sms,rcs,other'],
        ]);

        $rateRecord = $this->walletService->setUserRate(
            (int) $validated['user_id'],
            (float) $validated['rate'],
            $admin->id,
            $validated['channel'] ?? 'whatsapp'
        );

        return response()->json([
            'success' => true,
            'message' => 'User message rate updated successfully.',
            'rate' => (float) $rateRecord->rate,
            'channel' => $rateRecord->channel,
            'user_id' => $rateRecord->user_id,
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

        $userId = (int) $validated['user_id'];
        $amount = (float) $validated['amount'];
        $notes = $validated['notes'] ?? ('Admin manual adjustment by ' . $admin->name);

        if ($validated['type'] === 'credit') {
            $wallet = $this->walletService->addCredit(
                $userId,
                $amount,
                'manual_adjustment',
                'ADJ-' . time(),
                $notes,
                $admin->id
            );

            return response()->json([
                'success' => true,
                'message' => "Credited ₹" . number_format($amount, 2) . " successfully.",
                'new_balance' => (float) $wallet->available_credits,
            ]);
        } else {
            $result = $this->walletService->deductCredit(
                $userId,
                $amount,
                'manual_adjustment',
                'ADJ-' . time(),
                $notes
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' => "Debited ₹" . number_format($amount, 2) . " successfully.",
                'new_balance' => (float) $result['balance_after'],
            ]);
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
            ->with([
                'creditWallet:id,user_id,available_credits,currency',
                'activeSubscription.plan:id,name,selling_price,message_credits,validity_days',
            ])
            ->orderByDesc('id')
            ->get();

        $data = $users->map(function ($u) {
            $rate = $this->walletService->getUserRate($u->id);
            $walletBalance = $u->creditWallet ? (float) $u->creditWallet->available_credits : 0.00;
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'wallet_balance' => $walletBalance,
                'rate' => $rate,
                'active_plan' => $u->activeSubscription ? [
                    'id' => $u->activeSubscription->package_plan_id,
                    'name' => $u->activeSubscription->plan?->name ?? 'Custom Plan',
                    'amount_paid' => (float) $u->activeSubscription->amount_paid,
                    'credits_granted' => $u->activeSubscription->credits_granted,
                    'starts_at' => $u->activeSubscription->starts_at?->format('Y-m-d H:i'),
                    'expires_at' => $u->activeSubscription->expires_at?->format('Y-m-d H:i'),
                    'status' => $u->activeSubscription->status,
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

        $notifications = AdminNotification::with('user:id,name,email')
            ->orderByDesc('id')
            ->take(30)
            ->get();

        $unreadCount = AdminNotification::where('is_read', false)->count();

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
            'is_read' => true,
            'read_at' => now(),
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

        AdminNotification::where('is_read', false)->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read.',
        ]);
    }
}
