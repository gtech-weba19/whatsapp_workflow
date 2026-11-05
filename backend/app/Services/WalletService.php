<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\UserMessageRate;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Illuminate\Support\Facades\Log;

class WalletService
{
    /**
     * Initialize wallet with signup bonus.
     */
    public function initializeWallet(
        User $user,
        float $bonusAmount = 100,
        float $defaultRate = 0.50
    ): Wallet {
        return DB::transaction(function () use ($user, $bonusAmount, $defaultRate) {

            $wallet = Wallet::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'balance' => 0,
                    'currency' => 'INR',
                ]
            );

            // Signup bonus only once.
            $bonusExists = WalletTransaction::where('wallet_id', $wallet->id)
                ->where('transaction_type', 'signup_bonus')
                ->exists();

            if (!$bonusExists && $bonusAmount > 0) {
                $balanceBefore = (float) $wallet->balance;
                $balanceAfter = $balanceBefore + $bonusAmount;

                $wallet->balance = $balanceAfter;
                $wallet->save();

                WalletTransaction::create([
                    'wallet_id'       => $wallet->id,
                    'user_id'         => $user->id,
                    'type'            => 'credit',
                    'transaction_type' => 'signup_bonus',
                    'amount'          => $bonusAmount,
                    'balance_before'  => $balanceBefore,
                    'balance_after'   => $balanceAfter,
                    'description'     => 'Welcome signup bonus',
                    'reference_id'    => (string) Str::uuid(),
                ]);
            }

            // Set default message rate if not already configured.
            UserMessageRate::firstOrCreate(
                ['user_id' => $user->id],
                ['rate_per_message' => $defaultRate]
            );

            return $wallet->fresh();
        });
    }

    /**
     * Get user's wallet.
     */
    public function getWallet(User $user): Wallet
    {
        return Wallet::firstOrCreate(
            ['user_id' => $user->id],
            [
                'balance' => 0,
                'currency' => 'INR',
            ]
        );
    }

    /**
     * Get wallet balance.
     */
    public function getBalance(User $user): float
    {
        return (float) $this->getWallet($user)->balance;
    }

    /**
     * Get user's WhatsApp message rate.
     */
    public function getUserRate(User $user): float
    {
        $rate = UserMessageRate::where('user_id', $user->id)->first();

        return (float) ($rate?->rate_per_message ?? 0.50);
    }

    /**
     * Update user's WhatsApp message rate.
     */
    public function setUserRate(User $user, float $rate): UserMessageRate
    {
        if ($rate < 0) {
            throw new RuntimeException('Message rate cannot be negative.');
        }

        return UserMessageRate::updateOrCreate(
            ['user_id' => $user->id],
            ['rate_per_message' => $rate]
        );
    }

    /**
     * Check wallet balance.
     */
    public function hasSufficientBalance(
        User $user,
        ?float $amount = null
    ): bool {
        $amount = $amount ?? $this->getUserRate($user);

        return $this->getBalance($user) >= $amount;
    }

    /**
     * Add money to wallet.
     */
    public function addCredit(
        User $user,
        float $amount,
        string $description = 'Wallet recharge',
        ?string $referenceId = null,
        ?int $whatsappAccountId = null
    ): WalletTransaction {
        if ($amount <= 0) {
            throw new RuntimeException('Credit amount must be greater than zero.');
        }

        return DB::transaction(function () use (
            $user,
            $amount,
            $description,
            $referenceId,
            $whatsappAccountId
        ) {
            $wallet = Wallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (!$wallet) {
                $wallet = Wallet::create([
                    'user_id' => $user->id,
                    'balance' => 0,
                    'currency' => 'INR',
                ]);

                $wallet = Wallet::whereKey($wallet->id)
                    ->lockForUpdate()
                    ->first();
            }

            $before = (float) $wallet->balance;
            $after = $before + $amount;

            $wallet->balance = $after;
            $wallet->save();

            return WalletTransaction::create([
                'wallet_id'        => $wallet->id,
                'user_id'          => $user->id,
                'whatsapp_account_id' => $whatsappAccountId,
                'type'             => 'credit',
                'transaction_type' => 'wallet_recharge',
                'amount'           => $amount,
                'balance_before'   => $before,
                'balance_after'    => $after,
                'description'      => $description,
                'reference_id'     => $referenceId ?? (string) Str::uuid(),
            ]);
        });
    }


/**
 * Deduct money from wallet.
 */
public function deductCredit(
    User $user,
    float $amount,
    string $description = 'Wallet deduction',
    string $transactionType = 'debit',
    ?string $referenceId = null,
    ?int $whatsappAccountId = null,
    ?int $botMessageId = null
): WalletTransaction {

    if ($amount <= 0) {
        throw new RuntimeException(
            'Deduction amount must be greater than zero.'
        );
    }

    try {

        return DB::transaction(function () use (
            $user,
            $amount,
            $description,
            $transactionType,
            $referenceId,
            $whatsappAccountId,
            $botMessageId
        ) {

            // 1. Lock wallet
            $wallet = Wallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (!$wallet) {
                throw new RuntimeException('Wallet not found.');
            }

            // 2. Check existing transaction
            if ($botMessageId !== null) {

                $existing = WalletTransaction::where(
                    'bot_message_id',
                    $botMessageId
                )
                    ->where('transaction_type', $transactionType)
                    ->first();

                if ($existing) {

                    Log::info('WALLET DUPLICATE DEDUCTION SKIPPED', [
                        'bot_message_id' => $botMessageId,
                        'transaction_id' => $existing->id,
                        'user_id' => $user->id,
                    ]);

                    return $existing;
                }
            }

            // 3. Check balance
            $before = (float) $wallet->balance;

            if ($before < $amount) {
                throw new RuntimeException(
                    'Insufficient wallet balance.'
                );
            }

            // 4. Deduct amount
            $after = $before - $amount;

            $wallet->balance = $after;
            $wallet->save();

            // 5. Create transaction
            $transaction = WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $user->id,
                'whatsapp_account_id' => $whatsappAccountId,
                'bot_message_id' => $botMessageId,
                'type' => 'debit',
                'transaction_type' => $transactionType,
                'amount' => $amount,
                'balance_before' => $before,
                'balance_after' => $after,
                'description' => $description,
                'reference_id' => $referenceId ?? (string) Str::uuid(),
            ]);

            Log::info('WALLET DEDUCTION COMPLETED', [
                'transaction_id' => $transaction->id,
                'user_id' => $user->id,
                'bot_message_id' => $botMessageId,
                'amount' => $amount,
                'balance_before' => $before,
                'balance_after' => $after,
            ]);

            return $transaction;

        }, 3);

    } catch (\Illuminate\Database\QueryException $e) {

        // Handle duplicate unique-index violation.
        if (
            $botMessageId !== null &&
            in_array($e->errorInfo[1] ?? null, [1062, 1555, 2067], true)
        ) {

            $existing = WalletTransaction::where(
                'bot_message_id',
                $botMessageId
            )
                ->where('transaction_type', $transactionType)
                ->first();

            if ($existing) {

                Log::info('WALLET DUPLICATE TRANSACTION RECOVERED', [
                    'bot_message_id' => $botMessageId,
                    'transaction_id' => $existing->id,
                    'user_id' => $user->id,
                ]);

                return $existing;
            }
        }

        throw $e;
    }
}


    /**
     * Deduct WhatsApp message charge.
     */
    // public function deductDeliveredMessage(
    //     User $user,
    //     int $botMessageId,
    //     ?int $whatsappAccountId = null
    // ): WalletTransaction {
    //     $rate = $this->getUserRate($user);

    //     return $this->deductCredit(
    //         user: $user,
    //         amount: $rate,
    //         description: 'WhatsApp delivered message charge',
    //         transactionType: 'whatsapp_message',
    //         referenceId: 'BOT-MESSAGE-' . $botMessageId,
    //         whatsappAccountId: $whatsappAccountId,
    //         botMessageId: $botMessageId
    //     );
    // }

    /**
 * Deduct WhatsApp message charge.
 */
public function deductDeliveredMessage(
    User $user,
    int $botMessageId,
    ?int $whatsappAccountId = null
): WalletTransaction {

    $rate = $this->getUserRate($user);

    if ($rate <= 0) {
        throw new RuntimeException(
            'Invalid WhatsApp message rate.'
        );
    }

    return $this->deductCredit(
        user: $user,
        amount: $rate,
        description: 'WhatsApp delivered message charge',
        transactionType: 'whatsapp_message',
        referenceId: 'BOT-MESSAGE-' . $botMessageId,
        whatsappAccountId: $whatsappAccountId,
        botMessageId: $botMessageId
    );
}
}
