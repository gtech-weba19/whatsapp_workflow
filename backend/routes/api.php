<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\WorkflowController;
use App\Http\Controllers\WhatsAppWebhookController;
use App\Http\Controllers\BotSessionController;
use App\Http\Controllers\MediaUploadController;


/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/

Route::post('/login', [
    AuthController::class,
    'login'
]);



/*
|--------------------------------------------------------------------------
| META WEBHOOK VERIFICATION
|--------------------------------------------------------------------------
*/

Route::get('/webhooks/whatsapp', [
    WhatsAppWebhookController::class,
    'verify'
]);




Route::post('/webhooks/whatsapp', [
    WhatsAppWebhookController::class,
    'handle'
]);


/*
|--------------------------------------------------------------------------
| SIMULATOR RESET
|--------------------------------------------------------------------------
*/

Route::post('/webhooks/whatsapp/reset', [
    WhatsAppWebhookController::class,
    'reset'
]);


/*
|--------------------------------------------------------------------------
| SIMULATOR JOURNEYS
|--------------------------------------------------------------------------
*/

Route::get('/webhooks/whatsapp/journeys', [
    WhatsAppWebhookController::class,
    'journeys'
]);


/*
|--------------------------------------------------------------------------
| AUTHENTICATED API
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | AUTH
    |--------------------------------------------------------------------------
    */

    Route::post('/logout', [
        AuthController::class,
        'logout'
    ]);

    Route::get('/me', [
        AuthController::class,
        'me'
    ]);


    /*
    |--------------------------------------------------------------------------
    | WORKFLOWS
    |--------------------------------------------------------------------------
    */

    Route::apiResource(
        'workflows',
        WorkflowController::class
    );


    /*
    |--------------------------------------------------------------------------
    | PUBLISH WORKFLOW
    |--------------------------------------------------------------------------
    */

    Route::post(
        '/workflows/{workflow}/publish',
        [WorkflowController::class, 'publish']
    );


    /*
    |--------------------------------------------------------------------------
    | DUPLICATE WORKFLOW
    |--------------------------------------------------------------------------
    */

    Route::post(
        '/workflows/{workflow}/duplicate',
        [WorkflowController::class, 'duplicate']
    );


    /*
    |--------------------------------------------------------------------------
    | BOT SESSIONS
    |--------------------------------------------------------------------------
    */

    Route::get('/sessions', [
        BotSessionController::class,
        'index'
    ]);

    Route::get('/sessions/{session}', [
        BotSessionController::class,
        'show'
    ]);


       Route::post('/upload/media', [
        MediaUploadController::class,
        'upload'
    ])->name('upload.media');
});
