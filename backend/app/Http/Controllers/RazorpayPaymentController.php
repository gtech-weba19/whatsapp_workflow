<?php

namespace App\Http\Controllers;

use App\Models\AdminNotification;
use App\Models\PackagePlan;
use App\Models\User;
use App\Models\UserSubscription;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class RazorpayPaymentController extends Controller
{
    public function __construct(
        protected WalletService $walletService
    ) {}

    /**
     * Create Razorpay Order
     */
    public function createOrder(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'plan_id' => ['nullable'],
            'plan_name' => ['nullable', 'string', 'max:150'],
        ]);

        $key = config('services.razorpay.key', env('RAZORPAY_KEY', 'rzp_test_SuOPCHwupVAzCH'));
        $secret = config('services.razorpay.secret', env('RAZORPAY_SECRET', 'Jnf1K3IbJQqpKN5ZbgUY1asa'));

        $amountInRupees = (float) $validated['amount'];
        $amountInPaise = (int) round($amountInRupees * 100);
        $receipt = 'rcpt_' . $user->id . '_' . time();

        try {
            $response = Http::withBasicAuth($key, $secret)
                ->timeout(20)
                ->post('https://api.razorpay.com/v1/orders', [
                    'amount' => $amountInPaise,
                    'currency' => 'INR',
                    'receipt' => $receipt,
                    'notes' => [
                        'user_id' => (string) $user->id,
                        'user_email' => (string) $user->email,
                        'user_name' => (string) $user->name,
                        'plan_id' => (string) ($validated['plan_id'] ?? ''),
                        'plan_name' => (string) ($validated['plan_name'] ?? 'Plan Recharge'),
                    ],
                ]);

            if (!$response->successful()) {
                Log::error('Razorpay Create Order Failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'user_id' => $user->id,
                ]);

                $errData = $response->json();
                $errMsg = $errData['error']['description'] ?? 'Unable to create Razorpay order.';

                return response()->json([
                    'success' => false,
                    'message' => $errMsg,
                ], 400);
            }

            $order = $response->json();

            return response()->json([
                'success' => true,
                'order_id' => $order['id'],
                'amount' => $order['amount'],
                'currency' => $order['currency'] ?? 'INR',
                'key' => $key,
                'receipt' => $receipt,
                'user' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone ?? $user->mobile ?? '',
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Razorpay Order Exception', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Payment gateway error: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verify Razorpay Payment Signature & Activate Plan
     */
    public function verifyPayment(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $validated = $request->validate([
            'razorpay_order_id' => ['required', 'string'],
            'razorpay_payment_id' => ['required', 'string'],
            'razorpay_signature' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'plan_id' => ['nullable'],
            'plan_name' => ['nullable', 'string'],
        ]);

        $secret = config('services.razorpay.secret', env('RAZORPAY_SECRET', 'Jnf1K3IbJQqpKN5ZbgUY1asa'));

        $orderId = $validated['razorpay_order_id'];
        $paymentId = $validated['razorpay_payment_id'];
        $signature = $validated['razorpay_signature'];
        $amount = (float) $validated['amount'];
        $planName = $validated['plan_name'] ?? 'Plan Recharge';
        $planId = $validated['plan_id'] ? (int) $validated['plan_id'] : null;

        // Verify HMAC-SHA256 signature
        $expectedSignature = hash_hmac('sha256', $orderId . '|' . $paymentId, $secret);

        if (!hash_equals($expectedSignature, $signature)) {
            Log::warning('Razorpay signature mismatch', [
                'user_id' => $user->id,
                'order_id' => $orderId,
                'payment_id' => $paymentId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Payment signature verification failed. Invalid transaction.',
            ], 400);
        }

        // Prevent duplicate processing of the same payment_id
        $existingTx = WalletTransaction::where('reference_id', $paymentId)->first();
        if ($existingTx) {
            return response()->json([
                'success' => true,
                'message' => 'Payment has already been processed.',
                'new_balance' => (float) $this->walletService->getBalance($user),
            ]);
        }

        try {
            // 1. Add credits to user wallet
            $description = "Plan Activated: {$planName} (Razorpay: {$paymentId})";
            $walletTx = $this->walletService->addCredit(
                user: $user,
                amount: $amount,
                description: $description,
                referenceId: $paymentId
            );

            // 2. Mark previous subscriptions as expired and create new active subscription
            UserSubscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->update(['status' => 'expired']);

            $subscription = UserSubscription::create([
                'user_id' => $user->id,
                'package_plan_id' => $planId ?? 2,
                'amount_paid' => $amount,
                'currency' => 'INR',
                'credits_granted' => (int) $amount,
                'credits_remaining' => (int) $amount,
                'starts_at' => now(),
                'expires_at' => null,
                'status' => 'active',
            ]);

            // 3. Notify Admin
            try {
                AdminNotification::create([
                    'user_id' => $user->id,
                    'type' => 'plan_subscription',
                    'title' => "Payment Received: ₹" . number_format($amount, 2),
                    'message' => "Client {$user->name} ({$user->email}) successfully paid ₹" . number_format($amount, 2) . " via Razorpay ({$paymentId}) for {$planName}.",
                    'data' => [
                        'user_id' => $user->id,
                        'user_name' => $user->name,
                        'user_email' => $user->email,
                        'payment_id' => $paymentId,
                        'order_id' => $orderId,
                        'amount' => $amount,
                        'plan_id' => $planId,
                        'plan_name' => $planName,
                        'action_url' => '/plans?tab=alerts',
                        'new_wallet_balance' => (float) $this->walletService->getBalance($user),
                    ],
                    'is_read' => false,
                ]);
            } catch (\Throwable $e) {
                // Non-fatal if notification table doesn't support field
                Log::warning('Admin notification error: ' . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => "Payment of ₹" . number_format($amount, 2) . " successful! {$planName} is now active.",
                'payment_id' => $paymentId,
                'order_id' => $orderId,
                'new_balance' => (float) $this->walletService->getBalance($user),
                'subscription' => $subscription,
            ]);
        } catch (\Throwable $e) {
            Log::error('Payment processing failed after verification', [
                'user_id' => $user->id,
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error applying plan to wallet: ' . $e->getMessage(),
            ], 500);
        }
    }
}
