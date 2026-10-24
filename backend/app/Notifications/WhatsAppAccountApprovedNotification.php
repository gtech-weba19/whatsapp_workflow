<?php

namespace App\Notifications;

use App\Models\WhatsAppAccount;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class WhatsAppAccountApprovedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public WhatsAppAccount $account,
        public string $businessName
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'whatsapp_account_approved',
            'title' => 'WhatsApp Account Approved',
            'message' => $this->businessName
                . ' has been approved. You can now create your bot.',
            'account_id' => $this->account->id,
            'action_label' => 'Create Your Bot',
            'action_url' => '/bots',
        ];
    }
}
