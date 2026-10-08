<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\WorkflowController;
use App\Http\Controllers\WhatsAppWebhookController;
use App\Http\Controllers\BotSessionController;
use App\Http\Controllers\MediaUploadController;
use App\Http\Controllers\BotController;
use App\Http\Controllers\ClientController;



Route::post('/login', [ AuthController::class,'login']);
Route::get('/webhooks/whatsapp', [WhatsAppWebhookController::class,'verify']);
Route::post('/webhooks/whatsapp', [WhatsAppWebhookController::class,'handle']);
Route::post('/webhooks/whatsapp/reset', [WhatsAppWebhookController::class,'reset']);
Route::get('/webhooks/whatsapp/journeys', [WhatsAppWebhookController::class,'journeys']);

Route::middleware('auth:sanctum')->group(function () {
Route::post('/logout', [AuthController::class,'logout']);
Route::get('/me', [AuthController::class,'me']);
Route::apiResource('workflows',WorkflowController::class);
Route::get('/bots/clients', [BotController::class,'clients']);
Route::patch('/bots/{bot}/status', [BotController::class,'status']);
Route::apiResource('bots',BotController::class);
Route::patch('/clients/{client}/status',[ClientController::class, 'status']);
Route::apiResource('clients',ClientController::class);
Route::post('/workflows/{workflow}/publish',[WorkflowController::class, 'publish']);
Route::post('/workflows/{workflow}/duplicate',[WorkflowController::class, 'duplicate']);
Route::get('/sessions', [BotSessionController::class,'index']);
Route::get('/sessions/{session}', [BotSessionController::class,'show']);
Route::post('/upload/media', [MediaUploadController::class,'upload'])->name('upload.media');

});
