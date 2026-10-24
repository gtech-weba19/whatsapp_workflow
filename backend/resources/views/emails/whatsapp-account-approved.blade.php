<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>WhatsApp Account Approved</title>
</head>
<body style="font-family: Arial, sans-serif; color: #222; line-height: 1.6;">
    <h2>Congratulations, {{ $user->name }}!</h2>

    <p>
        Your WhatsApp account
        <strong>{{ $businessName }}</strong>
        has been approved.
    </p>

    <p>You can now create your WhatsApp bot and start building your customer journey.</p>

    {{-- <p>
        <a href="{{ rtrim(config('app.frontend_url', config('app.url')), '/') }}/bots"
           style="display:inline-block;padding:12px 22px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
            Create Your Bot
        </a>
    </p> --}}

    <p>If you have any questions, please contact our support team.</p>

    <p>Regards,<br>GTech Bot Automation Team</p>
</body>
</html>
