<?php

namespace App\Services;

use App\Models\AdminNotification;
use App\Models\AuditLog;
use App\Models\CreditTransaction;
use App\Models\CreditWallet;
use App\Models\PackagePlan;
use App\Models\User;
use App\Models\UserMessageRate;
use App\Models\UserSubscription;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WalletService
{
    /**
     * Initialize wallet for a new user with ₹100 Welcome Bonus and ₹0.50 default rate
     */
    public function initializeWallet(User $user, float $bonusAmount = 100.00, float $defaultRate = 0.50): CreditWallet
    {
        return DB::transaction(function () use ($user, $bonusAmount, $defaultRate) {
            $wallet = CreditWallet::where('user_id', $user->id)->lockForUpdate()->first();

            if (!$wallet) {
                $wallet = CreditWallet::create([
                    'user_id' => $user->id,
                    'available_credits' => $bonusAmount,
                    'currency' => 'INR',
                ]);

                // Create initial transaction record
                CreditTransaction::create([
                    'user_id' => $user->id,
                    'subscription_id' => null,
                    'transaction_type' => 'credit',
                    'credits' => $bonusAmount,
                    'balance_after' => $bonusAmount,
                    'reference_type' => 'signup_bonus',
                    'reference_id' => 'BONUS-' . $user->id . '-' . strtoupper(Str::random(6)),
                    'idempotency_key' => 'signup-bonus-' . $user->id,
                    'notes' => 'Registration Welcome Bonus ₹' . number_format($bonusAmount, 2),
                    'created_by' => null,
                    'created_at' => now(),
                ]);
            }

            // Ensure active rate exists (default ₹0.50)
            $existingRate = UserMessageRate::where('user_id', $user->id)
                ->where('channel', 'whatsapp')
                ->where('status', 'active')
                ->first();

            if (!$existingRate) {
                UserMessageRate::create([
                    'user_id' => $user->id,
                    'channel' => 'whatsapp',
                    'message_category' => 'unknown',
                    'rate' => $defaultRate,
                    'currency' => 'INR',
                    'effective_from' => now(),
                    'effective_to' => null,
                    'status' => 'active',
                    'created_by' => null,
                ]);
            }

            return $wallet;
        });
    }

    /**
     * Get user's available wallet balance
     */
    public function getBalance(int $userId): float
    {
        $wallet = CreditWallet::where('user_id', $userId)->first();
        return $wallet ? (float) $wallet->available_credits : 0.00;
    }

    /**
     * Get user's effective message rate (defaults to 0.50)
     */
    public function getUserRate(int $userId, string $channel = 'whatsapp'): float
    {
        $rate = UserMessageRate::where('user_id', $userId)
            ->where('channel', $channel)
            ->where('status', 'active')
            ->orderByDesc('id')
            ->value('rate');

        return $rate !== null ? (float) $rate : 0.50;
    }

    /**
     * Admin sets a custom message rate for a user
     */
    public function setUserRate(int $userId, float $rate, ?int $adminId = null, string $channel = 'whatsapp'): UserMessageRate
    {
        return DB::transaction(function () use ($userId, $rate, $adminId, $channel) {
            // Deactivate older active rates for this user and channel
            UserMessageRate::where('user_id', $userId)
                ->where('channel', $channel)
                ->where('status', 'active')
                ->update([
                    'status' => 'inactive',
                    'effective_to' => now(),
                ]);

            // Create new active rate
            return UserMessageRate::create([
                'user_id' => $userId,
                'channel' => $channel,
                'message_category' => 'unknown',
                'rate' => $rate,
                'currency' => 'INR',
                'effective_from' => now(),
                'effective_to' => null,
                'status' => 'active',
                'created_by' => $adminId,
            ]);
        });
    }

    /**
     * Add credit to user's wallet
     */
    public function addCredit(
        int $userId,
        float $amount,
        string $referenceType = 'recharge',
        ?string $referenceId = null,
        ?string $notes = null,
        ?int $createdBy = null,
        ?int $subscriptionId = null
    ): CreditWallet {
        return DB::transaction(function () use ($userId, $amount, $referenceType, $referenceId, $notes, $createdBy, $subscriptionId) {
            $wallet = CreditWallet::firstOrCreate(
                ['user_id' => $userId],
                ['available_credits' => 0.0000, 'currency' => 'INR']
            );

            // Reload with lock
            $wallet = CreditWallet::where('id', $wallet->id)->lockForUpdate()->first();

            $balanceAfter = (float) $wallet->available_credits + $amount;
            $wallet->available_credits = $balanceAfter;
            $wallet->save();

            CreditTransaction::create([
                'user_id' => $userId,
                'subscription_id' => $subscriptionId,
                'transaction_type' => 'credit',
                'credits' => $amount,
                'balance_after' => $balanceAfter,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'idempotency_key' => 'tx-' . $userId . '-' . time() . '-' . Str::random(8),
                'notes' => $notes ?? ('Wallet credited ₹' . number_format($amount, 2)),
                'created_by' => $createdBy,
                'created_at' => now(),
            ]);

            return $wallet;
        });
    }

    /**
     * Deduct credit from user's wallet for message or action
     */
    public function deductCredit(
        int $userId,
        float $amount,
        string $referenceType = 'usage',
        ?string $referenceId = null,
        ?string $notes = null
    ): array {
        return DB::transaction(function () use ($userId, $amount, $referenceType, $referenceId, $notes) {
            $wallet = CreditWallet::where('user_id', $userId)->lockForUpdate()->first();

            if (!$wallet || (float) $wallet->available_credits < $amount) {
                $currentBal = $wallet ? (float) $wallet->available_credits : 0.00;
                return [
                    'success' => false,
                    'message' => 'Insufficient wallet balance. Required: ₹' . number_format($amount, 2) . ', Available: ₹' . number_format($currentBal, 2),
                    'balance' => $currentBal,
                ];
            }

            $balanceAfter = (float) $wallet->available_credits - $amount;
            $wallet->available_credits = $balanceAfter;
            $wallet->save();

            // Link active subscription if available and decrement credits_remaining
            $activeSub = UserSubscription::where('user_id', $userId)
                ->where('status', 'active')
                ->where(function ($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->orderByDesc('id')
                ->first();

            if ($activeSub && isset($activeSub->credits_remaining) && (int) $activeSub->credits_remaining > 0) {
                $activeSub->decrement('credits_remaining', 1);
            }

            CreditTransaction::create([
                'user_id' => $userId,
                'subscription_id' => $activeSub?->id,
                'transaction_type' => 'debit',
                'credits' => -$amount,
                'balance_after' => $balanceAfter,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'idempotency_key' => 'deduct-' . $userId . '-' . time() . '-' . Str::random(8),
                'notes' => $notes ?? ('Message sent (Rate: ₹' . number_format($amount, 2) . ')'),
                'created_by' => null,
                'created_at' => now(),
            ]);

            return [
                'success' => true,
                'message' => 'Deduction successful',
                'balance_after' => $balanceAfter,
                'deducted' => $amount,
            ];
        });
    }

    /**
     * Subscribe user to a Package Plan (e.g. ₹100, ₹1000, ₹10000, ₹100000)
     */
    public function subscribeToPlan(int $userId, int $planId): array
    {
        return DB::transaction(function () use ($userId, $planId) {
            $plan = PackagePlan::where('is_active', 1)->findOrFail($planId);

            $startsAt = now();
            $expiresAt = $plan->validity_days ? now()->addDays($plan->validity_days) : null;

            // Mark previous active subscriptions for this user as completed/expired
            UserSubscription::where('user_id', $userId)
                ->where('status', 'active')
                ->update(['status' => 'expired']);

            // Create new subscription
            $subscription = UserSubscription::create([
                'user_id' => $userId,
                'package_plan_id' => $plan->id,
                'amount_paid' => $plan->selling_price,
                'currency' => $plan->currency ?? 'INR',
                'credits_granted' => $plan->message_credits,
                'credits_remaining' => $plan->message_credits,
                'starts_at' => $startsAt,
                'expires_at' => $expiresAt,
                'status' => 'active',
            ]);

            // Top up wallet with plan selling price / credit amount
            $wallet = $this->addCredit(
                $userId,
                (float) $plan->selling_price,
                'plan_recharge',
                'SUB-' . $subscription->id,
                "Plan Activated: {$plan->name} (₹" . number_format($plan->selling_price, 2) . ")",
                null,
                $subscription->id
            );

            // Fetch user info for notification
            $user = User::find($userId);
            $userName = $user ? $user->name : "User #{$userId}";
            $userEmail = $user ? $user->email : '';
            $currentRate = $this->getUserRate($userId);

            // Create notification for admin
            try {
                AdminNotification::create([
                    'user_id' => $userId,
                    'type' => 'plan_subscription',
                    'title' => "Plan Activated: {$plan->name}",
                    'message' => "Client {$userName} ({$userEmail}) just subscribed to {$plan->name} for ₹" . number_format($plan->selling_price, 2) . ". Current rate: ₹" . number_format($currentRate, 4) . "/msg. Please review and set their per-message rate if needed.",
                    'data' => [
                        'user_id' => $userId,
                        'user_name' => $userName,
                        'user_email' => $userEmail,
                        'plan_id' => $plan->id,
                        'plan_name' => $plan->name,
                        'amount_paid' => (float) $plan->selling_price,
                        'credits_granted' => (int) $plan->message_credits,
                        'current_rate' => $currentRate,
                        'validity_days' => $plan->validity_days,
                        'wallet_balance' => (float) $wallet->available_credits,
                    ],
                    'is_read' => false,
                ]);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('AdminNotification log skipped: ' . $e->getMessage());
            }

            // Optional audit log
            try {
                AuditLog::create([
                    'user_id' => $userId,
                    'action' => 'plan_subscribed',
                    'entity_type' => 'user_subscription',
                    'entity_id' => $subscription->id,
                    'old_values' => null,
                    'new_values' => [
                        'plan_id' => $plan->id,
                        'plan_name' => $plan->name,
                        'amount_paid' => $plan->selling_price,
                    ],
                ]);
            } catch (\Throwable $e) {
                // silently proceed if audit log table structure differs
            }

            return [
                'success' => true,
                'message' => "Successfully activated {$plan->name}!",
                'subscription' => $subscription,
                'plan' => $plan,
                'new_balance' => (float) $wallet->available_credits,
            ];
        });
    }
}
