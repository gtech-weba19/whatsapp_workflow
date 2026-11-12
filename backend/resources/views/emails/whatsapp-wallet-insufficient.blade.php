
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Insufficient Wallet Balance</title>
</head>

<body style="margin:0;padding:0;background:#f4f6fa;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#f4f6fa;padding:35px 12px;">
    <tr>
        <td align="center">

            <table width="600" cellpadding="0" cellspacing="0"
                   style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">

                <!-- Header -->
                <tr>
                    <td style="background:#172554;padding:28px;text-align:center;">
                        <h1 style="margin:0;color:#ffffff;font-size:27px;">
                            WABA.TODAY
                        </h1>
                        <p style="margin:8px 0 0;color:#cbd5e1;font-size:13px;">
                            WhatsApp Business Automation
                        </p>
                    </td>
                </tr>

                <!-- Content -->
                <tr>
                    <td style="padding:35px 30px;">

                        <h2 style="color:#dc2626;font-size:22px;margin:0 0 18px;">
                            Insufficient Wallet Balance!
                        </h2>

                        <p style="color:#334155;font-size:15px;line-height:25px;">
                           Hello {{ $owner->name }},
                        </p>

                        <p style="color:#475569;font-size:15px;line-height:25px;">
                            Your WhatsApp wallet balance is insufficient.
                            Your WhatsApp bot messaging has been temporarily
                            stopped because your available balance is below
                            the required message rate.
                        </p>

                        <!-- Balance Details -->
                        <table width="100%" cellpadding="0" cellspacing="0"
                               style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:25px 0;">

                            <tr>
                                <td style="padding:15px;color:#64748b;font-size:14px;">
                                    Current Wallet Balance
                                </td>
                                <td align="right"
                                    style="padding:15px;color:#dc2626;font-size:17px;font-weight:bold;">
                                    ₹{{ number_format($balance, 2) }}
                                </td>
                            </tr>

                            <tr>
                                <td style="padding:15px;border-top:1px solid #e2e8f0;color:#64748b;font-size:14px;">
                                    Message Rate
                                </td>
                                <td align="right"
                                    style="padding:15px;border-top:1px solid #e2e8f0;color:#334155;font-size:15px;font-weight:bold;">
                                    ₹{{ number_format($messageRate, 2) }}
                                </td>
                            </tr>

                            <tr>
                                <td style="padding:15px;border-top:1px solid #e2e8f0;color:#64748b;font-size:14px;">
                                    WhatsApp Account ID
                                </td>
                                <td align="right"
                                    style="padding:15px;border-top:1px solid #e2e8f0;color:#334155;font-size:15px;font-weight:bold;">
                                    #{{ $wabaId }}
                                </td>
                            </tr>

                        </table>

                        <p style="color:#475569;font-size:15px;line-height:25px;">
                            To resume your WhatsApp bot messaging, please
                            recharge your wallet.
                        </p>


                        <p style="color:#334155;font-size:14px;line-height:23px;margin-top:25px;">
                            Regards,<br>
                            <strong>WABA.TODAY Team</strong>
                        </p>

                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
                        <p style="margin:0;color:#94a3b8;font-size:12px;">
                            © {{ date('Y') }} WABA.TODAY. All rights reserved.
                        </p>
                        <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;">
                            This is an automated wallet notification.
                        </p>
                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
