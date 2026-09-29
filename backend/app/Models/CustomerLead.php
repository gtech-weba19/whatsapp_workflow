<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerLead extends Model
{
    protected $table = 'customer_leads';

    protected $fillable = [
        'workflow_id',
        'session_id',
        'mobile',
        'status',
        'details',
    ];

    protected $casts = [
        'details' => 'array',
    ];

    public function workflow()
    {
        return $this->belongsTo(
            Workflow::class,
            'workflow_id'
        );
    }

    public function session()
    {
        return $this->belongsTo(
            BotSession::class,
            'session_id'
        );
    }
}
