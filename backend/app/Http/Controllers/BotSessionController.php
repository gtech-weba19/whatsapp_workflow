<?php
namespace App\Http\Controllers;
use App\Models\BotSession; use Illuminate\Http\Request;
class BotSessionController extends Controller { public function index(){return BotSession::with('workflow')->latest()->paginate(30);} public function show(BotSession $session){return $session->load('workflow','messages');} }