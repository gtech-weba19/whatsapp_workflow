<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BotSession extends Model
{
    protected $fillable = ['workflow_id','whatsapp_account_id', 'channel', 'user_identifier', 'current_node_id', 'status', 'variables', 'last_message_at'];

    protected $casts = ['variables' => 'array', 'last_message_at' => 'datetime'];

    public function workflow()
    {
        return $this->belongsTo(Workflow::class);
    }

    public function messages()
    {
        return $this->hasMany(BotMessage::class);
    }
}
