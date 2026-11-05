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
     * Get logged-in user's wallet balance.
     */
    public function balance(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $wallet = $this->walletService->getWallet($user);

            return response()->json([
                'success' => true,
                'message' => 'Wallet balance fetched successfully.',
                'data' => [
                    'wallet_id' => $wallet->id,
                    'user_id' => $user->id,
                    'balance' => (float) $wallet->balance,
                    'currency' => $wallet->currency ?? 'INR',
                    'message_rate' => $this->walletService->getUserRate($user),
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
