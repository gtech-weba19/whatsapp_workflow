<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - WABA.TODAY</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background-color:#f4f6f9; padding:35px 15px;">
        <tr>
            <td align="center">

                <table width="100%" cellpadding="0" cellspacing="0" border="0"
                       style="max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden;">

                    <tr>
                        <td align="center"
                            style="background-color:#15803d; padding:30px 20px;">

                            <h1 style="margin:0; color:#ffffff; font-size:27px;">
                                WABA.TODAY
                            </h1>

                            <p style="margin:8px 0 0; color:#dcfce7; font-size:13px;">
                                WhatsApp Business Automation Platform
                            </p>

                        </td>
                    </tr>

                    <tr>
                        <td style="padding:40px 35px 30px; color:#334155;">

                            <h2 style="color:#0f172a;">Reset Your Password</h2>

                            <p>Hello {{ $user->name ?? 'User' }},</p>

                            <p>
                                We received a request to reset the password associated
                                with your WABA.TODAY account.
                            </p>

                            <p>Click the button below to create a new password.</p>

                            <table cellpadding="0" cellspacing="0" border="0" align="center">
                                <tr>
                                    <td align="center" bgcolor="#15803d" style="border-radius:7px;">
                                        <a href="{!! $url !!}"
                                           target="_blank"
                                           style="display:inline-block; padding:15px 32px; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700;">
                                            Reset My Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin-top:28px;">
                                For security reasons, this password reset link will
                                expire in <strong>60 minutes</strong>.
                            </p>

                            <p>
                                Regards,<br>
                                <strong>WABA.TODAY Team</strong>
                            </p>

                        </td>
                    </tr>

                    <tr>
                        <td align="center"
                            style="background-color:#f8fafc; padding:22px 20px; border-top:1px solid #e2e8f0;">

                            <p style="color:#64748b; font-size:12px;">
                                © {!! date('Y') !!} WABA.TODAY. All rights reserved.
                            </p>

                            <p style="color:#94a3b8; font-size:11px;">
                                This is an automated email. Please do not reply.
                            </p>

                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
