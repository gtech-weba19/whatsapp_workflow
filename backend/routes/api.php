<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\WorkflowController;
use App\Http\Controllers\WhatsAppWebhookController;
use App\Http\Controllers\BotSessionController;

Route::post('/login', [AuthController::class, 'login']);

Route::post('/webhooks/whatsapp', [
    WhatsAppWebhookController::class,
    'handle'
]);

Route::post('/webhooks/whatsapp/reset', [
    WhatsAppWebhookController::class,
    'reset'
]);

Route::get('/webhooks/whatsapp/journeys', [
    WhatsAppWebhookController::class,
    'journeys'
]);



Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [
        AuthController::class,
        'logout'
    ]);

    Route::get('/me', [
        AuthController::class,
        'me'
    ]);

    Route::apiResource('workflows', WorkflowController::class);

    Route::post(
        '/workflows/{workflow}/publish',
        [WorkflowController::class, 'publish']
    );

    Route::post(
        '/workflows/{workflow}/duplicate',
        [WorkflowController::class, 'duplicate']
    );

    Route::get('/sessions', [
        BotSessionController::class,
        'index'
    ]);

    Route::get('/sessions/{session}', [
        BotSessionController::class,
        'show'
    ]);
});
