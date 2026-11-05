<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class RegistrationStepAdminMail extends Mailable
{
    use Queueable, SerializesModels;

    public array $details;
    public int $step;
    public bool $registrationCompleted;
    public string $stepName;
    public string $continueUrl;
    public ?string $verificationUrl;

    public function __construct(
        array $details,
        int $step,
        bool $registrationCompleted = false,
        ?string $verificationUrl = null
    ) {
        $this->details = $details;
        $this->step = $step;
        $this->registrationCompleted = $registrationCompleted;
        $this->verificationUrl = $verificationUrl;

        $this->stepName = match ($step) {
            1 => 'Create Account',
            2 => 'Business Profile',
            3 => 'Meta Account',
            4 => 'Get Started / WhatsApp Setup',
            default => 'Registration Progress',
        };

$frontendUrl = 'http://localhost:5173';

$email = strtolower(trim($this->details['email'] ?? ''));

$nextStep = $registrationCompleted
    ? 4
    : min(4, $step + 1);

$this->continueUrl = $frontendUrl
    . '/register?step='
    . $nextStep
    . '&email='
    . urlencode($email);
    }

    public function build(): static
    {
        $subject = $this->registrationCompleted
            ? 'Registration Completed - WABA Bot Automation'
            : 'Registration Update - Step '
                . $this->step
                . ': '
                . $this->stepName;

        return $this->subject($subject)
            ->view('emails.registration-step-admin')
            ->with([
                'details' => $this->details,
                'step' => $this->step,
                'stepName' => $this->stepName,
                'registrationCompleted' => $this->registrationCompleted,
                'continueUrl' => $this->continueUrl,
                'verificationUrl' => $this->verificationUrl,
            ]);
    }
}
