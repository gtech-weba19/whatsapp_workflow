<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        if ($user->hasRole($roles)) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'message' => 'Unauthorized. You do not have the required role to access this resource.',
            'required_roles' => $roles,
        ], 403);
    }
}

