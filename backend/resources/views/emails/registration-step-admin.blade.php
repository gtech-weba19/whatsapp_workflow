
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Progress - WABA Bot Automation</title>
</head>

<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">

@php
    $fieldLabels = [
        'name' => 'Full Name',
        'email' => 'Email Address',
        'mobile' => 'Mobile Number',
        'company_name' => 'Company Name',
        'business_type' => 'Business Type',
        'industry' => 'Industry',
        'country' => 'Country',
        'city' => 'City',
        'website' => 'Website',
        'gstin' => 'GSTIN',
        'meta_account_type' => 'Meta Account Type',
        'onboarding_preference' => 'Onboarding Preference',
        'number_setup_type' => 'WhatsApp Number Setup',
        'document_note' => 'Document Note',
        'document_consent' => 'Document Consent',
    ];

    $stepNames = [
        1 => 'Create Account',
        2 => 'Business Profile',
        3 => 'Meta Account',
        4 => 'Get Started / WhatsApp Setup',
    ];

    $currentStep = max(1, min(4, (int) $step));

    $progressPercent = $registrationCompleted
        ? 100
        : $currentStep * 25;

    $frontendUrl = rtrim(
        config('services.registration.frontend_url', config('app.url')),
        '/'
    );

    $continueUrl = $frontendUrl
        . '/register?step='
        . min(4, $currentStep + 1)
        . '&email='
        . urlencode($details['email'] ?? '');

    /*
     * This URL must be passed from the Mailable/controller
     * using Laravel's actual email verification route.
     */
    $verificationUrl = $verificationUrl ?? null;
@endphp

<table role="presentation" width="100%" cellspacing="0" cellpadding="0"
       style="background:#f4f6f9;padding:28px 12px;">
    <tr>
        <td align="center">

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                   style="max-width:680px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">

                <!-- Header -->
                <tr>
                    <td style="background:#172554;padding:28px 30px;color:#ffffff;">
                        <h1 style="margin:0;font-size:24px;line-height:1.4;">
                            Your Registration Progress
                        </h1>

                        <p style="margin:8px 0 0;font-size:14px;color:#dbeafe;">
                            WABA Bot Automation
                        </p>
                    </td>
                </tr>

                <!-- Main Content -->
                <tr>
                    <td style="padding:28px 30px;">

                        <p style="margin:0 0 12px;font-size:16px;line-height:1.7;">
                            Hello {{ $details['name'] ?? 'there' }},
                        </p>

                        @if ($registrationCompleted)

                            <h2 style="color:#15803d;font-size:21px;">
                                Congratulations! Registration Completed
                            </h2>

                            <p style="font-size:14px;line-height:1.7;">
                                Your registration has been submitted successfully.
                                Thank you for choosing WABA Bot Automation.
                            </p>

                        @else

                            <p style="font-size:14px;line-height:1.7;">
                                You have reached
                                <strong>Step {{ $currentStep }} of 4</strong>.
                                Continue your registration whenever you are ready.
                            </p>

                        @endif

                        <!-- Progress Bar -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                               style="margin:20px 0 8px;background:#e5e7eb;border-radius:8px;">
                            <tr>
                                <td style="padding:0;">
                                    <div style="height:12px;width:{{ $progressPercent }}%;background:#2563eb;border-radius:8px;font-size:1px;line-height:12px;">
                                        &nbsp;
                                    </div>
                                </td>
                            </tr>
                        </table>

                        <p style="margin:0 0 22px;font-size:13px;color:#475569;">
                            <strong>{{ $progressPercent }}% completed</strong>
                        </p>

                        <!-- Step Checklist -->
                        <h2 style="font-size:18px;color:#111827;margin-bottom:12px;">
                            Your Signup Checklist
                        </h2>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                               style="border-collapse:collapse;margin-bottom:24px;">

                            @foreach ($stepNames as $number => $name)

                                @php
                                    $isDone = $registrationCompleted || $number < $currentStep;
                                    $isCurrent = !$registrationCompleted && $number === $currentStep;
                                @endphp

                                <tr>
                                    <td style="width:38px;padding:13px 10px;border:1px solid #e5e7eb;font-size:17px;text-align:center;">

                                        @if ($isDone)
                                            <span style="color:#15803d;">&#10003;</span>
                                        @elseif ($isCurrent)
                                            <span style="color:#2563eb;">&#9654;</span>
                                        @else
                                            <span style="color:#9ca3af;">&#9675;</span>
                                        @endif

                                    </td>

                                    <td style="padding:13px 12px;border:1px solid #e5e7eb;font-size:14px;">
                                        <strong>Step {{ $number }}</strong><br>
                                        {{ $name }}
                                    </td>

                                    <td style="padding:13px 12px;border:1px solid #e5e7eb;font-size:12px;text-align:right;">

                                        @if ($isDone)
                                            <span style="color:#15803d;font-weight:bold;">
                                                Completed
                                            </span>
                                        @elseif ($isCurrent)
                                            <span style="color:#2563eb;font-weight:bold;">
                                                Current Step
                                            </span>
                                        @else
                                            <span style="color:#6b7280;">
                                                Pending
                                            </span>
                                        @endif

                                    </td>
                                </tr>

                            @endforeach

                        </table>

                        <!-- Continue Registration Button -->
                        @if (!$registrationCompleted)

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                                style="margin:24px 0;">
                                <tr>
                                    <td align="center">

                                        <a href="{{ $continueUrl }}"
                                        style="display:inline-block;background:#2563eb;color:#ffffff;padding:15px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
                                            Continue Registration &rarr;
                                        </a>

                                    </td>
                                </tr>
                            </table>

                        @endif


                        <!-- Email Verification -->
                        @if (!empty($verificationUrl))

                            <div style="margin:24px 0;padding:18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">

                                <h2 style="font-size:17px;color:#1d4ed8;margin:0 0 10px;">
                                    Verify Your Email Address
                                </h2>

                                <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
                                    Please verify your email address to secure your account
                                    and continue with WABA Bot Automation.
                                </p>

                                <a href="{{ $verificationUrl }}"
                                   style="display:inline-block;background:#15803d;color:#ffffff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:bold;">
                                    Verify Email Address
                                </a>

                            </div>

                        @elseif (!($details['email_verified'] ?? false))

                            <p style="font-size:13px;line-height:1.7;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:13px;">
                                Your email verification may still be pending.
                                Please use the separate verification email sent to your inbox.
                            </p>

                        @endif

                        <!-- User Details -->
                        <h2 style="margin:26px 0 14px;font-size:18px;color:#111827;">
                            Your Details
                        </h2>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                               style="border-collapse:collapse;">

                            @foreach ($fieldLabels as $field => $label)

                                @if (isset($details[$field]) && $details[$field] !== '')

                                    <tr>
                                        <td style="width:38%;padding:12px 14px;background:#f8fafc;border:1px solid #e5e7eb;font-size:14px;font-weight:bold;vertical-align:top;">
                                            {{ $label }}
                                        </td>

                                        <td style="padding:12px 14px;border:1px solid #e5e7eb;font-size:14px;line-height:1.6;word-break:break-word;">

                                         {{ is_scalar($details[$field]) ? $details[$field] : 'Provided' }}

                                        </td>
                                    </tr>

                                @endif

                            @endforeach

                        </table>

                        <!-- Footer -->
                        <p style="margin:26px 0 0;font-size:13px;line-height:1.7;color:#6b7280;">
                            This is an automated email from WABA Bot Automation.
                            If you did not start this registration, you can ignore this message.
                        </p>

                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
