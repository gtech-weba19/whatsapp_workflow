<?php

namespace App\Mail;

use App\Models\User;
use App\Models\WhatsAppAccount;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class WhatsAppAccountPendingMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public WhatsAppAccount $account,
        public User $owner
    ) {}

    public function build()
    {
        return $this->subject(
            'WhatsApp Account Connected - Pending Approval'
        )->view('emails.whatsapp-account-pending');
    }
}
