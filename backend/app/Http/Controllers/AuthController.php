<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request; use Illuminate\Support\Facades\Hash; use App\Models\User;
class AuthController extends Controller {
 public function login(Request $r){$data=$r->validate(['email'=>'required|email','password'=>'required']);$u=User::where('email',$data['email'])->first();if(!$u||!Hash::check($data['password'],$u->password))return response()->json(['message'=>'Invalid credentials'],422);$token=$u->createToken('react')->plainTextToken;return response()->json(['token'=>$token,'user'=>$u]);}
 public function logout(Request $r){$r->user()->currentAccessToken()?->delete();return response()->json(['message'=>'Logged out']);}
 public function me(Request $r){return response()->json($r->user());}
}