<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class WorkflowExecution extends Model {
 protected $fillable=['workflow_id','bot_session_id','node_id','status','input_payload','output_payload','error_message','started_at','finished_at'];
 protected $casts=['input_payload'=>'array','output_payload'=>'array','started_at'=>'datetime','finished_at'=>'datetime'];
}