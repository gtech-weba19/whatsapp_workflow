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
use App\Http\Controllers\AdminRoleController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\WalletBillingController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\LoginVisitController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\RazorpayPaymentController;
use App\Http\Controllers\ImpersonationController;
use App\Http\Controllers\AdminMessageLogController;




// Public Auth Routes
Route::post('/login', [AdminAuthController::class, 'login']);
Route::post('/register', [AdminAuthController::class, 'register']);

Route::get('/login-visit', [LoginVisitController::class, 'check']);

Route::post('/check-email', [AdminAuthController::class, 'checkEmail']);
Route::post(
    '/email/send-verification-link',
    [EmailVerificationController::class, 'sendVerificationLink']
);

Route::post(
    '/email/confirm-verification',
    [EmailVerificationController::class, 'confirmVerification']
);

Route::post(
    '/registration-progress',
    [AdminAuthController::class, 'saveRegistrationProgress']
)->middleware('throttle:10,1');




Route::post('/forgot-password', [PasswordResetController::class, 'forgotPassword']);
Route::post('/reset-password', [PasswordResetController::class, 'resetPassword'])->name('password.reset');


// Authenticated Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/plans/select', [AdminPlanController::class, 'selectPlan'])->name('plans.select');
    Route::post('/logout', [AdminAuthController::class, 'logout']);
    Route::get('/me', [AdminAuthController::class, 'me']);
    Route::get('/dashboard', [AdminDashboardController::class, 'index']);

    Route::post('/admin/users/{user}/impersonate',[ImpersonationController::class, 'start']);
    Route::post('/admin/impersonation/stop',[ImpersonationController::class, 'stop'] );


    // Webhook Routes
        Route::post('/webhooks/whatsapp', [WhatsAppWebhookController::class, 'handle']);
        Route::post('/webhooks/whatsapp/reset', [WhatsAppWebhookController::class, 'reset']);
        Route::get('/webhooks/whatsapp/journeys', [WhatsAppWebhookController::class, 'journeys']);


     // Wallet & Plans Billing

       Route::get('/wallet', [WalletController::class, 'balance']);
    Route::get('/wallet/transactions', [WalletController::class, 'transactions']);


      // Razorpay Payment Gateway Routes
    Route::post('/razorpay/create-order', [RazorpayPaymentController::class, 'createOrder']);
    Route::post('/razorpay/verify-payment', [RazorpayPaymentController::class, 'verifyPayment']);


    Route::get('/user-wallet', [WalletBillingController::class, 'getWallet']);
    Route::get('/user-wallet/transactions', [WalletBillingController::class, 'getTransactions']);
    Route::get('/plans', [WalletBillingController::class, 'getPlans']);
    Route::get('/pricing-config', [AdminPlatformSettingController::class, 'pricingConfig']);
    Route::post('/plans/recharge', [WalletBillingController::class, 'rechargePlan']);
    Route::get('/admin/client-subscriptions', [WalletBillingController::class, 'adminGetClients']);
    Route::post('/admin/set-user-rate', [WalletBillingController::class, 'adminSetUserRate']);
    Route::post('/admin/adjust-user-wallet', [WalletBillingController::class, 'adminAdjustUserWallet']);
    Route::get('/admin/notifications', [WalletBillingController::class, 'getAdminNotifications']);
    Route::post('/admin/notifications/{id}/read', [WalletBillingController::class, 'markNotificationRead']);
    Route::post('/admin/notifications/read-all', [WalletBillingController::class, 'markAllNotificationsRead']);



    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);



    Route::get('/profile', [AdminProfileController::class, 'index']);
    Route::put('/profile', [AdminProfileController::class, 'update']);
    Route::get('/auth/profile', [AdminProfileController::class, 'index']);
    Route::put('/auth/profile', [AdminProfileController::class, 'update']);
    Route::post('/auth/profile', [AdminProfileController::class, 'update']);
    Route::put('/change-password', [AdminProfileController::class, 'changePassword']);
    Route::post('/upload/media', [AdminMediaUploadController::class, 'upload'])->name('upload.media');

    // Roles & Permissions Management
    Route::get('/permissions', [AdminRoleController::class, 'permissions']);
    Route::post('/permissions', [AdminRoleController::class, 'storePermission']);
    Route::put('/permissions/{permission}', [AdminRoleController::class, 'updatePermission']);
    Route::delete('/permissions/{permission}', [AdminRoleController::class, 'destroyPermission']);
    Route::apiResource('roles', AdminRoleController::class);

    // Clients
    Route::middleware('permission:clients.view')->group(function () {
        Route::patch('/clients/{client}/status', [AdminClientController::class, 'status']);
        Route::apiResource('clients', AdminClientController::class);
    });



    // WhatsApp Accounts & Numbers
    Route::middleware('permission:whatsapp_accounts.view')->group(function () {
        Route::patch('/whatsapp-accounts/{whatsapp_account}/status', [AdminWhatsAppAccountController::class, 'status']);
        Route::apiResource('whatsapp-accounts', AdminWhatsAppAccountController::class);
        Route::get('/whatsapp-numbers/accounts', [AdminWhatsAppNumberController::class, 'accounts']);
        Route::apiResource('whatsapp-numbers', AdminWhatsAppNumberController::class);
    });

    // Bots & Sessions
    Route::middleware('permission:bots.view')->group(function () {
        Route::get('/bots/clients', [AdminBotController::class, 'clients']);
        Route::get('/bots/workflows', [AdminBotController::class, 'workflows']);
        Route::patch('/bots/{bot}/status', [AdminBotController::class, 'status']);
        Route::apiResource('bots', AdminBotController::class);
        Route::get('/sessions', [AdminBotSessionController::class, 'index']);
        Route::get('/sessions/{session}', [AdminBotSessionController::class, 'show']);
    });

    // Workflows
    Route::middleware('permission:workflows.view')->group(function () {
         Route::get('/workflows/check-trigger', [WorkflowController::class, 'checkTrigger']);
        Route::post('/workflows/{workflow}/publish', [WorkflowController::class, 'publish']);
        Route::post('/workflows/{workflow}/duplicate', [WorkflowController::class, 'duplicate']);
        Route::apiResource('workflows', WorkflowController::class);
    });

    // Usage
    Route::get('/usage', [AdminUsageController::class, 'index'])
        ->middleware('permission:usage.view');

    // Message Logs & Live Preview Reporting
    Route::middleware('permission:usage.view,bots.view,workflows.view')->group(function () {
        Route::get('/message-logs/filters', [AdminMessageLogController::class, 'filters']);
        Route::get('/message-logs/conversations', [AdminMessageLogController::class, 'conversations']);
        Route::get('/message-logs/conversations/{session}', [AdminMessageLogController::class, 'show'])->whereNumber('session');
        Route::get('/message-logs/conversations/{session}/export', [AdminMessageLogController::class, 'exportConversation'])->whereNumber('session');
        Route::get('/message-logs/export', [AdminMessageLogController::class, 'export']);
    });

    // System Logs
    Route::middleware('permission:system_logs.view')->group(function () {
        Route::get('/audit-logs', [AdminAuditLogController::class, 'index']);
        Route::get('/audit-logs/filters', [AdminAuditLogController::class, 'filters']);
        Route::delete('/audit-logs/bulk-delete', [AdminAuditLogController::class, 'bulkDestroy'])
            ->middleware('permission:system_logs.delete');
        Route::get('/audit-logs/{auditLog}', [AdminAuditLogController::class, 'show']);
        Route::delete('/audit-logs/{id}', [AdminAuditLogController::class, 'destroy'])
            ->middleware('permission:system_logs.delete');
    });

    // Failed Workflows
    Route::middleware('permission:failed_workflows.view')->group(function () {
        Route::get('/failed-workflows', [AdminFailedWorkflowController::class, 'index']);
        Route::get('/failed-workflows/{id}', [AdminFailedWorkflowController::class, 'show'])->whereNumber('id');
        Route::post('/failed-workflows/{id}/retry', [AdminFailedWorkflowController::class, 'retry'])->whereNumber('id')
            ->middleware('permission:failed_workflows.retry');
    });

    // Contacts
    Route::apiResource('contacts', AdminContactController::class)
        ->middleware('permission:contacts.view');

    // Templates
    Route::middleware('permission:templates.view')->group(function () {
        Route::get('/templates', [AdminTemplateController::class, 'index']);
        Route::get('/templates/{id}', [AdminTemplateController::class, 'show']);
    });

    // Platform Settings
    Route::middleware('permission:platform_settings.view')->group(function () {
        Route::get('/platform-settings', [AdminPlatformSettingController::class, 'index']);
        Route::put('/platform-settings', [AdminPlatformSettingController::class, 'update']);
        Route::get('/platform-settings/whatsapp-tenants', [AdminPlatformSettingController::class, 'whatsappTenants']);
        Route::post('/platform-settings/whatsapp-tenants', [AdminPlatformSettingController::class, 'storeWhatsAppTenant']);
        Route::put('/platform-settings/whatsapp-tenants/{whatsappTenant}', [AdminPlatformSettingController::class, 'updateWhatsAppTenant']);
        Route::patch('/platform-settings/whatsapp-tenants/{whatsappTenant}/status', [AdminPlatformSettingController::class, 'toggleWhatsAppTenant']);
        Route::delete('/platform-settings/whatsapp-tenants/{whatsappTenant}', [AdminPlatformSettingController::class, 'destroyWhatsAppTenant']);
    });
});
