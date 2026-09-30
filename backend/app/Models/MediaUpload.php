<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MediaUpload extends Model
{
    protected $table = 'media_uploads';

    protected $fillable = [
        'user_id',
        'media_type',
        'original_name',
        'file_name',
        'mime_type',
        'file_size',
        'path',
        'url',
        'workflow_id',
        'status',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'file_size' => 'integer',
        'workflow_id' => 'integer',
    ];
}
