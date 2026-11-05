<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workflow extends Model
{
    protected $fillable = [
        'user_id',
        'bot_id',
        'name',
        'description',
        'channel',
        'status',
        'version',
        'created_by',
        'whatsapp_account_id',
        'published_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'bot_id' => 'integer',
        'whatsapp_account_id' => 'integer',
        'published_at' => 'datetime',
    ];

    /**
     * User who owns this workflow.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Bot connected to this workflow.
     */
    public function bot(): BelongsTo
    {
        return $this->belongsTo(Bot::class, 'bot_id');
    }

    /**
     * WhatsApp account connected to this workflow.
     */
    public function whatsappAccount(): BelongsTo
    {
        return $this->belongsTo(
            WhatsAppAccount::class,
            'whatsapp_account_id'
        );
    }

    /**
     * Workflow nodes.
     */
    public function nodes(): HasMany
    {
        return $this->hasMany(WorkflowNode::class, 'workflow_id');
    }

    /**
     * Workflow edges.
     */
    public function edges(): HasMany
    {
        return $this->hasMany(WorkflowEdge::class, 'workflow_id');
    }

    /**
     * Customer sessions belonging to this workflow.
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(BotSession::class, 'workflow_id');
    }

    /**
     * Alias for sessions.
     */
    public function botSessions(): HasMany
    {
        return $this->hasMany(BotSession::class, 'workflow_id');
    }

    /**
     * Workflow execution history.
     */
    public function workflowExecutions(): HasMany
    {
        return $this->hasMany(
            WorkflowExecution::class,
            'workflow_id'
        );
    }
}
