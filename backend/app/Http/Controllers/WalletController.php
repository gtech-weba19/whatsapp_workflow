<?php

namespace App\Http\Controllers;

use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WalletController extends Controller
{
    protected WalletService $walletService;

    public function __construct(WalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    /**
     * Get logged-in user's wallet balance and plan breakdown.
     */
    public function balance(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $summary = $this->walletService->getWalletSummary($user);

            return response()->json([
                'success' => true,
                'message' => 'Wallet balance fetched successfully.',
                'data' => [
                    'wallet_id' => $summary['wallet_id'],
                    'user_id' => $summary['user_id'],
                    'balance' => $summary['balance'],
                    'remaining_balance' => $summary['remaining_balance'],
                    'total_taken' => $summary['total_taken'],
                    'total_used' => $summary['total_used'],
                    'total_plan_amount' => $summary['total_plan_amount'],
                    'active_plan_amount' => $summary['active_plan_amount'],
                    'active_plan_credits' => $summary['active_plan_credits'],
                    'usage_percentage' => $summary['usage_percentage'],
                    'used_messages' => $summary['used_messages'],
                    'estimated_messages' => $summary['estimated_messages'],
                    'total_messages' => $summary['total_messages'],
                    'currency' => $summary['currency'],
                    'message_rate' => $summary['message_rate'],
                    'has_active_plan' => $summary['has_active_plan'],
                    'active_plan_id' => $summary['active_plan_id'],
                    'active_plan_name' => $summary['active_plan_name'],
                ],
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Unable to fetch wallet balance.',
            ], 500);
        }
    }

    /**
     * Get logged-in user's transaction history.
     */
    public function transactions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
            'type' => 'nullable|in:credit,debit',
            'whatsapp_account_id' => 'nullable|integer|min:1',
        ]);

        $user = $request->user();

        $query = WalletTransaction::query()
            ->where('user_id', $user->id)
            ->latest('id');

        if (!empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        if (!empty($validated['whatsapp_account_id'])) {
            $query->where(
                'whatsapp_account_id',
                $validated['whatsapp_account_id']
            );
        }

        $transactions = $query->paginate(
            $validated['per_page'] ?? 10
        );

        return response()->json([
            'success' => true,
            'message' => 'Wallet transactions fetched successfully.',
            'data' => $transactions->items(),
            'pagination' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

}
