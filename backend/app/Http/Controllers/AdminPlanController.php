<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminPlanController extends Controller
{

    public function selectPlan(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($user->role === 'super_admin') {
            return response()->json([
                'message' => 'Super Admin does not need to select a plan.',
                'onboarding_step' => $user->onboarding_step,
                'redirect' => '/dashboard',
            ]);
        }

        if ($user->role !== 'client') {
            return response()->json([
                'message' => 'You are not authorized to select a plan.',
            ], 403);
        }

        $validated = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
        ]);

        try {
            $plan = DB::table('plans')
                ->where('id', $validated['plan_id'])
                ->where('is_active', 1)
                ->first();

            if (!$plan) {
                return response()->json([
                    'message' => 'Selected plan is unavailable.',
                ], 422);
            }


            $user->onboarding_step = 'connect_whatsapp';
            $user->save();

            return response()->json([
                'message' => 'Plan selected successfully.',
                'onboarding_step' => $user->onboarding_step,
                'plan_id' => $plan->id,
                'redirect' => '/connect-whatsapp',
            ]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Unable to select the plan right now.',
            ], 500);
        }
    }
}
