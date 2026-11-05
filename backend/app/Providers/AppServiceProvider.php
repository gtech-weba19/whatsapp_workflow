<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\AuditLog;
use App\Observers\GlobalAuditObserver;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\File;
use Illuminate\Auth\Notifications\ResetPassword;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        /*
        |--------------------------------------------------------------------------
        | Password Reset Link - React Frontend
        |--------------------------------------------------------------------------
        */

        ResetPassword::createUrlUsing(function ($user, string $token) {

            $frontendUrl = rtrim(
                config('app.frontend_url', 'http://localhost:5173'),
                '/'
            );

            return $frontendUrl . '/reset-password?token='
                . $token
                . '&email=' . urlencode(
                    $user->getEmailForPasswordReset()
                );
        });

        /*
        |--------------------------------------------------------------------------
        | Global Audit Observer
        |--------------------------------------------------------------------------
        */

        $modelsPath = app_path('Models');

        foreach (File::allFiles($modelsPath) as $file) {

            $relativePath = str_replace(
                [DIRECTORY_SEPARATOR, '.php'],
                ['\\', ''],
                $file->getRelativePathname()
            );

            $class = 'App\\Models\\' . $relativePath;

            if (
                !class_exists($class)
                || $class === AuditLog::class
                || !is_subclass_of($class, Model::class)
            ) {
                continue;
            }

            $class::observe(GlobalAuditObserver::class);
        }
    }
}
