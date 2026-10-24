<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - WABA Bot</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f7fb; font-family:Arial,Helvetica,sans-serif; color:#1e293b;">

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
           style="background-color:#f4f7fb; padding:35px 12px;">
        <tr>
            <td align="center">

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                       style="max-width:600px; background:#ffffff; border-radius:16px; overflow:hidden;">



                    {{-- Main content --}}
                    <tr>
                        <td style="padding:36px 32px 20px;">

                            <h1 style="margin:0 0 18px; font-size:26px; line-height:1.35; color:#0f172a; text-align:center;">
                                Verify Your Email Address
                            </h1>

                            <p style="margin:0 0 16px; font-size:15px; line-height:1.8; color:#475569;">
                                Hello,
                            </p>

                            <p style="margin:0 0 24px; font-size:15px; line-height:1.8; color:#475569;">
                                Welcome to <strong style="color:#2563eb;">WABA Bot</strong>!
                                Please verify your email address to continue creating your
                                WhatsApp Business automation account.
                            </p>

                            {{-- Verification button --}}
                            <table role="presentation" cellspacing="0" cellpadding="0"
                                   align="center" style="margin:0 auto 26px;">
                                <tr>
                                    <td align="center" bgcolor="#2563eb" style="border-radius:8px;">
                                        <a
                                            href="{{ $verificationUrl }}"
                                            target="_blank"
                                            style="display:inline-block; padding:15px 32px; color:#ffffff; font-size:15px; font-weight:bold; text-decoration:none; border-radius:8px;"
                                        >
                                            Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 12px; font-size:14px; line-height:1.8; color:#64748b;">
                                For your security, this verification link will expire in
                                <strong>30 minutes</strong>.
                            </p>

                            <p style="margin:0 0 12px; font-size:14px; line-height:1.8; color:#64748b;">
                                If the button doesn't work, copy and paste this link into your browser:
                            </p>


                            <div style="padding:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
                                <p style="margin:0; font-size:13px; line-height:1.7; color:#64748b;">
                                    <strong>Didn't request this email?</strong><br>
                                    You can safely ignore this message. Your email address will not be
                                    verified unless the verification link is opened.
                                </p>
                            </div>

                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="padding:24px 24px 30px; background:#f8fafc; text-align:center;">

                            <p style="margin:0 0 8px; font-size:14px; font-weight:bold; color:#334155;">
                                WABA Bot
                            </p>

                            <p style="margin:0 0 12px; font-size:12px; line-height:1.7; color:#94a3b8;">
                                WhatsApp Business Automation Platform
                            </p>

                            <p style="margin:0; font-size:12px; color:#94a3b8;">
                                &copy; {{ date('Y') }} WABA Bot. All rights reserved.
                            </p>

                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
