<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class WorkflowNode extends Model {
 protected $fillable=['workflow_id','node_id','node_type','label','configuration','position_x','position_y'];
 protected $casts=['configuration'=>'array','position_x'=>'float','position_y'=>'float'];
 public function workflow(){return $this->belongsTo(Workflow::class);}
}