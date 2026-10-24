<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WhatsAppAccountApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $businessName
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'WhatsApp Account Approved - Create Your Bot'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.whatsapp-account-approved'
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
