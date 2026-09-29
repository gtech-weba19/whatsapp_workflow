<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BotMessage extends Model {
 protected $fillable=['bot_session_id','direction','message_type','text','payload','external_message_id'];
 protected $casts=['payload'=>'array'];
 public function session(){return $this->belongsTo(BotSession::class,'bot_session_id');}
}