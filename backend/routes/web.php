<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'app' => 'WhatsApp Workflow Builder',
        'status' => 'ok'
    ]);
});

// Load API routes
Route::prefix('api')->group(base_path('routes/api.php'));