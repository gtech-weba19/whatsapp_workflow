<?php
namespace App\Services;
use Illuminate\Support\Facades\Http;
class WhatsAppService {
 public function sendText(string $to,string $text): array {
  $url=config('services.whatsapp.url'); $token=config('services.whatsapp.token'); $phone=config('services.whatsapp.phone_number_id');
  if(!$url||!$token||!$phone) return ['ok'=>false,'mock'=>true,'to'=>$to,'text'=>$text];
  $res=Http::withToken($token)->post(rtrim($url,'/').'/'.$phone.'/messages',['messaging_product'=>'whatsapp','to'=>$to,'type'=>'text','text'=>['body'=>$text]]);
  return ['ok'=>$res->successful(),'status'=>$res->status(),'body'=>$res->json()];
 }
}