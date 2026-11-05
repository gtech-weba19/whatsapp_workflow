<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LoginVisitController extends Controller
{
    public function check(Request $request)
    {
        $ip = $request->ip();

        $existing = DB::table('login_visits')
            ->where('ip_address', $ip)
            ->exists();

        if (!$existing) {
            DB::table('login_visits')->insert([
                'ip_address' => $ip,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            DB::table('login_visits')
                ->where('ip_address', $ip)
                ->update(['updated_at' => now()]);
        }

        return response()->json([
            'isReturningUser' => $existing,
        ]);
    }
}
