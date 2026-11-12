<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

class PersonalAccessToken extends SanctumPersonalAccessToken
{
  protected $casts = [
   'abilities' => 'json',
    'is_impersonation' => 'boolean',
    'expires_at' => 'datetime',
];
}
