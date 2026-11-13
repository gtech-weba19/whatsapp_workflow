<?php

namespace App\Observers;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class GlobalAuditObserver
{
    private array $excludedKeys = [
        'password',
        'password_confirmation',
        'current_password',
        'token',
        'access_token',
        'api_token',
        'refresh_token',
        'client_secret',
        'secret',
        'authorization',
        'otp',
        'otp_code',
    ];

    public function created(Model $model): void
    {
        $this->record(
            $model,
            'created',
            [],
            $model->getAttributes()
        );
    }

    public function updated(Model $model): void
    {
        $changes = $model->getChanges();

        unset(
            $changes['updated_at'],
            $changes['last_used_at'],
            $changes['remember_token']
        );

        if (empty($changes)) {
            return;
        }

        $oldValues = [];

        foreach (array_keys($changes) as $key) {
            $oldValues[$key] = $model->getRawOriginal($key);
        }

        $this->record(
            $model,
            'updated',
            $oldValues,
            $changes
        );
    }

    public function deleted(Model $model): void
    {
        $this->record(
            $model,
            'deleted',
            $model->getAttributes(),
            []
        );
    }

    private function record(
        Model $model,
        string $action,
        array $oldValues,
        array $newValues
    ): void {
        // Exclude system/internal models that should never generate audit noise
        $ignoredClasses = [
            AuditLog::class,
            \App\Models\PersonalAccessToken::class,
            \Laravel\Sanctum\PersonalAccessToken::class,
            \App\Models\BotMessage::class,
            \App\Models\AdminNotification::class,
            \App\Models\EmailVerification::class,
        ];

        foreach ($ignoredClasses as $ignored) {
            if ($model instanceof $ignored) {
                return;
            }
        }

        $user = Auth::user();

        $tenantId = $model->getAttribute('tenant_id')
            ?? $user?->getAttribute('tenant_id');

        $entityType = class_basename($model);
        $entityId = is_numeric($model->getKey())
            ? (int) $model->getKey()
            : null;
        $userId = $user?->getAuthIdentifier();

        // Prevent duplicate audit logs created within 5 seconds for the same action/entity
        $isDuplicate = AuditLog::where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->where('action', $action)
            ->where('user_id', $userId)
            ->where('created_at', '>=', now()->subSeconds(5))
            ->exists();

        if ($isDuplicate) {
            return;
        }

        AuditLog::create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_values' => $this->filterValues($oldValues),
            'new_values' => $this->filterValues($newValues),
            'ip_address' => app()->runningInConsole()
                ? null
                : request()->ip(),
            'user_agent' => app()->runningInConsole()
                ? null
                : substr(
                    (string) request()->userAgent(),
                    0,
                    2000
                ),
        ]);
    }

    private function filterValues(array $values): array
    {
        foreach ($values as $key => $value) {
            $key = strtolower((string) $key);

            if (
                in_array($key, $this->excludedKeys, true)
                || str_contains($key, 'password')
                || str_contains($key, 'secret')
                || str_contains($key, 'token')
                || str_contains($key, 'otp')
            ) {
                unset($values[$key]);
            }
        }

        return $values;
    }
}
