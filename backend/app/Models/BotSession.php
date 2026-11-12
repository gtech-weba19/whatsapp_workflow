<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BotSession extends Model
{
    protected $fillable = [
        'user_id',
        'bot_id',
        'workflow_id',
        'whatsapp_account_id',
        'channel',
        'user_identifier',
        'current_node_id',
        'status',
        'variables',
        'last_message_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'bot_id' => 'integer',
        'workflow_id' => 'integer',
        'whatsapp_account_id' => 'integer',
        'variables' => 'array',
        'last_message_at' => 'datetime',
    ];

    /**
     * User who owns this session.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Bot associated with this session.
     */
    public function bot(): BelongsTo
    {
        return $this->belongsTo(Bot::class, 'bot_id');
    }

    /**
     * Workflow associated with this session.
     */
    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class, 'workflow_id');
    }

    /**
     * WhatsApp account associated with this session.
     */
    public function whatsappAccount(): BelongsTo
    {
        return $this->belongsTo(
            WhatsAppAccount::class,
            'whatsapp_account_id'
        );
    }

    /**
     * Messages exchanged in this session.
     */
    public function messages(): HasMany
    {
        return $this->hasMany(BotMessage::class, 'bot_session_id');
    }

    /**
     * Executions associated with this session.
     */
    public function workflowExecutions(): HasMany
    {
        return $this->hasMany(
            WorkflowExecution::class,
            'bot_session_id'
        );
    }
}
