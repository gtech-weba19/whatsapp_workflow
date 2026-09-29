<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class WorkflowEdge extends Model {
 protected $fillable=['workflow_id','edge_id','source','target','source_handle','label','configuration'];
 protected $casts=['configuration'=>'array'];
 public function workflow(){return $this->belongsTo(Workflow::class);}
}