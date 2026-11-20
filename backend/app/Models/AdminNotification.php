<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AdminNotification extends Model
{
    use HasFactory;

    protected $table = 'notifications';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $guarded = [];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }

            // Ensure notifiable_type and notifiable_id are populated
            if (empty($model->notifiable_type)) {
                $model->notifiable_type = User::class;
            }
            if (empty($model->notifiable_id)) {
                $superAdmin = User::where('role', 'super_admin')->first();
                $model->notifiable_id = $superAdmin ? $superAdmin->id : 1;
            }

            // Merge virtual attributes into JSON data column
            $existingData = is_array($model->data)
                ? $model->data
                : (json_decode($model->data ?? '[]', true) ?: []);

            $data = array_merge([
                'title' => $model->getAttribute('title') ?? $existingData['title'] ?? 'Notification',
                'message' => $model->getAttribute('message') ?? $existingData['message'] ?? '',
                'type' => $model->getAttribute('type') ?? $existingData['type'] ?? 'admin_notification',
                'user_id' => $model->getAttribute('user_id') ?? $existingData['user_id'] ?? null,
                'action_url' => $model->getAttribute('action_url') ?? $existingData['action_url'] ?? '/plans?tab=alerts',
            ], $existingData);

            $model->data = $data;

            // Remove non-column virtual fields before raw insert
            unset($model->attributes['user_id']);
            unset($model->attributes['title']);
            unset($model->attributes['message']);
            unset($model->attributes['is_read']);
            unset($model->attributes['action_url']);
        });
    }

    public function getTitleAttribute(): string
    {
        return $this->data['title'] ?? 'Notification';
    }

    public function getMessageAttribute(): string
    {
        return $this->data['message'] ?? '';
    }

    public function getUserIdAttribute()
    {
        return $this->data['user_id'] ?? null;
    }

    public function getActionUrlAttribute(): string
    {
        return $this->data['action_url'] ?? '/plans?tab=alerts';
    }

    public function getIsReadAttribute(): bool
    {
        return !is_null($this->read_at);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'notifiable_id');
    }
}
