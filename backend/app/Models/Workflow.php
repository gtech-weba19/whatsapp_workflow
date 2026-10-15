<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workflow extends Model
{
protected $fillable = [
    'tenant_id',
    'bot_id',
    'name',
    'description',
    'channel',
    'status',
    'version',
    'created_by',
    'published_at',
];

    protected $casts = [
        'tenant_id' => 'integer',
        'bot_id' => 'integer',
        'published_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function bot(): BelongsTo
    {
        return $this->belongsTo(Bot::class, 'bot_id');
    }

    public function nodes(): HasMany
    {
        return $this->hasMany(WorkflowNode::class);
    }

    public function edges(): HasMany
    {
        return $this->hasMany(WorkflowEdge::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(BotSession::class);
    }
}
