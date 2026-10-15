<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\WorkflowController;
use App\Http\Controllers\WhatsAppWebhookController;
use App\Http\Controllers\AdminBotSessionController;
use App\Http\Controllers\AdminMediaUploadController;
use App\Http\Controllers\AdminBotController;
use App\Http\Controllers\AdminClientController;
use App\Http\Controllers\AdminClientUserController;
use App\Http\Controllers\AdminWhatsAppAccountController;
use App\Http\Controllers\AdminUsageController;
use App\Http\Controllers\AdminWhatsAppNumberController;
use App\Http\Controllers\AdminAuditLogController;
use App\Http\Controllers\AdminFailedWorkflowController;
use App\Http\Controllers\AdminContactController;
use App\Http\Controllers\AdminTemplateController;
use App\Http\Controllers\AdminPlatformSettingController;
use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\AdminProfileController;
use App\Http\Controllers\AdminPlanController;





Route::post('/login', [ AdminAuthController::class,'login']);
Route::post('/register', [ AdminAuthController::class,'register']);

Route::post('/check-email', [AdminAuthController::class, 'checkEmail']);

// Route::get('/webhooks/whatsapp', [WhatsAppWebhookController::class,'verify']);
Route::post('/webhooks/whatsapp', [WhatsAppWebhookController::class,'handle']);
Route::post('/webhooks/whatsapp/reset', [WhatsAppWebhookController::class,'reset']);
Route::get('/webhooks/whatsapp/journeys', [WhatsAppWebhookController::class,'journeys']);
// Route::get('/webhooks/whatsapp/{account}',[WhatsAppWebhookController::class, 'verifyAccount'])->whereNumber('account');
// Route::post('/webhooks/whatsapp/{account}',[WhatsAppWebhookController::class, 'handleAccount'])->whereNumber('account');

Route::middleware('auth:sanctum')->group(function () {
Route::post('/plans/select', [AdminPlanController::class, 'selectPlan'])
        ->name('plans.select');
Route::post('/logout', [AdminAuthController::class,'logout']);
Route::get('/me', [AdminAuthController::class,'me']);
Route::apiResource('workflows',WorkflowController::class);
Route::get('/bots/clients', [AdminBotController::class, 'clients']);
Route::get('/bots/workflows', [AdminBotController::class, 'workflows']);
Route::patch('/bots/{bot}/status', [AdminBotController::class, 'status']);
Route::apiResource('bots', AdminBotController::class);
Route::patch('/clients/{client}/status',[AdminClientController::class, 'status']);
Route::apiResource('clients',AdminClientController::class);
Route::post('/workflows/{workflow}/publish',[WorkflowController::class, 'publish']);
Route::post('/workflows/{workflow}/duplicate',[WorkflowController::class, 'duplicate']);
Route::get('/sessions', [AdminBotSessionController::class,'index']);
Route::get('/sessions/{session}', [AdminBotSessionController::class,'show']);
Route::post('/upload/media', [AdminMediaUploadController::class,'upload'])->name('upload.media');
Route::patch('/client-users/{client_user}/status',[AdminClientUserController::class, 'status']);
Route::apiResource('client-users',AdminClientUserController::class);
Route::patch('/whatsapp-accounts/{whatsapp_account}/status', [AdminWhatsAppAccountController::class, 'status']);
Route::apiResource('whatsapp-accounts', AdminWhatsAppAccountController::class);
Route::get('/usage', [AdminUsageController::class, 'index']);
Route::get('/whatsapp-numbers/accounts', [AdminWhatsAppNumberController::class,'accounts',]);
Route::apiResource('whatsapp-numbers',AdminWhatsAppNumberController::class);
Route::get('/audit-logs', [AdminAuditLogController::class, 'index']);
Route::get('/audit-logs/filters', [AdminAuditLogController::class, 'filters']);

Route::delete('/audit-logs/bulk-delete', [
    AdminAuditLogController::class,
    'bulkDestroy',
]);

Route::get('/audit-logs/{auditLog}', [
    AdminAuditLogController::class,
    'show',
]);

Route::delete('/audit-logs/{id}', [
    AdminAuditLogController::class,
    'destroy',
]);

Route::get('/failed-workflows', [AdminFailedWorkflowController::class,'index',]);
Route::get('/failed-workflows/{id}', [AdminFailedWorkflowController::class,'show',])->whereNumber('id');
Route::post('/failed-workflows/{id}/retry', [AdminFailedWorkflowController::class,'retry',])->whereNumber('id');
Route::apiResource('contacts', AdminContactController::class);
Route::get('/templates', [AdminTemplateController::class,'index',]);

Route::get('/templates/{id}', [AdminTemplateController::class,'show',]);
   Route::get('/platform-settings', [
        AdminPlatformSettingController::class,
        'index',
    ]);

    Route::put('/platform-settings', [
        AdminPlatformSettingController::class,
        'update',
    ]);

    Route::get('/platform-settings/whatsapp-tenants', [
        AdminPlatformSettingController::class,
        'whatsappTenants',
    ]);

    Route::post('/platform-settings/whatsapp-tenants', [
        AdminPlatformSettingController::class,
        'storeWhatsAppTenant',
    ]);

    Route::put('/platform-settings/whatsapp-tenants/{whatsappTenant}', [
        AdminPlatformSettingController::class,
        'updateWhatsAppTenant',
    ]);

    Route::patch('/platform-settings/whatsapp-tenants/{whatsappTenant}/status', [
        AdminPlatformSettingController::class,
        'toggleWhatsAppTenant',
    ]);

    Route::delete('/platform-settings/whatsapp-tenants/{whatsappTenant}', [
        AdminPlatformSettingController::class,
        'destroyWhatsAppTenant',
    ]);


    Route::get('/dashboard', [AdminDashboardController::class,'index',]);
     Route::get('/profile', [AdminProfileController::class, 'index']);
    Route::put('/profile', [AdminProfileController::class, 'update']);
    Route::put('/change-password', [AdminProfileController::class, 'changePassword']);






    // Client Route
//     Route::prefix('client')->group(function () {
//     Route::post('/login', [ClientAuthController::class, 'login']);

//     Route::middleware('auth:sanctum')->group(function () {
//         Route::get('/me', [ClientAuthController::class, 'me']);
//         Route::post('/logout', [ClientAuthController::class, 'logout']);
//     });
// });


});
