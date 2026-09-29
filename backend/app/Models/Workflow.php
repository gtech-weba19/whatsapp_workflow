<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Workflow extends Model
{
    protected $fillable = ['name', 'description', 'channel', 'status', 'version', 'created_by', 'published_at'];

    protected $casts = ['published_at' => 'datetime'];

    public function nodes()
    {
        return $this->hasMany(WorkflowNode::class);
    }

    public function edges()
    {
        return $this->hasMany(WorkflowEdge::class);
    }

    public function sessions()
    {
        return $this->hasMany(BotSession::class);
    }
}
