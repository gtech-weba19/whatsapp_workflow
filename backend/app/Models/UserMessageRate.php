<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserMessageRate extends Model
{
    protected $table = 'user_message_rates';

    protected $fillable = [
        'user_id',
        'rate_per_message',
    ];
}
