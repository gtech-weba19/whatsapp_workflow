<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Registration Successful - WABA.TODAY Automation</title>
</head>

<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial, Helvetica, sans-serif; color:#334155;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="width:100%; background-color:#f1f5f9; padding:30px 10px;">

        <tr>
            <td align="center">

                <!-- Main Email Container -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
                       style="width:100%; max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden;">

                    <!-- Header -->
                    <tr>
                        <td align="center"
                            style="padding:30px 25px; background-color:#ffffff; border-bottom:1px solid #e2e8f0;">

                            <h1 style="margin:0; font-size:26px; line-height:1.4; font-weight:bold; color:#059669;">
                                WABA.TODAY
                            </h1>

                            <p style="margin:8px 0 0; font-size:13px; color:#64748b;">
                                WhatsApp Automation Platform
                            </p>

                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding:32px 28px;">

                            <h2 style="margin:0 0 20px; font-size:24px; line-height:1.4; color:#059669;">
                                Welcome to WABA.TODAY Automation!
                            </h2>

                            <p style="margin:0 0 16px; font-size:15px; line-height:1.8; color:#334155;">
                                Hello {{ $details['name'] ?? 'User' }},
                            </p>

                            <p style="margin:0 0 16px; font-size:15px; line-height:1.8; color:#475569;">
                                Your account registration has been completed successfully.
                                Thank you for choosing WABA.TODAY Automation.
                            </p>

                            <!-- Our Team Will Contact You Soon -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                                   style="width:100%; margin:25px 0; border-collapse:separate;">

                                <tr>
                                    <td align="center"
                                        style="padding:25px 20px; background-color:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px;">

                                        <!-- Phone Icon -->
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                                               style="margin:0 auto 15px;">
                                            <tr>
                                                <td align="center" valign="middle"
                                                    width="52" height="52"
                                                    style="width:52px; height:52px; background-color:#059669; border-radius:26px; color:#ffffff; font-size:25px; line-height:52px; text-align:center;">
                                                    &#9742;
                                                </td>
                                            </tr>
                                        </table>

                                        <h3 style="margin:0 0 12px; font-size:20px; line-height:1.5; font-weight:bold; color:#047857;">
                                            Our Team Will Contact You Soon!
                                        </h3>

                                        <p style="margin:0; font-size:14px; line-height:1.8; color:#475569;">
                                            Thank you for registering with WABA.TODAY Automation.
                                            Our team will contact you soon to assist you with the next steps
                                            and help you get started with our platform.
                                        </p>

                                    </td>
                                </tr>
                            </table>
                            <!-- End Contact Section -->

                            <!-- Registration Details -->
                            <h3 style="margin:28px 0 15px; font-size:18px; color:#0f172a;">
                                Registration Details
                            </h3>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                                   style="width:100%; border-collapse:collapse; border:1px solid #e2e8f0;">

                                <tr>
                                    <td width="38%"
                                        style="padding:12px; border-bottom:1px solid #e2e8f0; background-color:#f8fafc; font-size:14px; font-weight:bold; color:#475569;">
                                        Name
                                    </td>
                                    <td style="padding:12px; border-bottom:1px solid #e2e8f0; font-size:14px; color:#334155; word-break:break-word;">
                                        {{ $details['name'] ?? 'N/A' }}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; border-bottom:1px solid #e2e8f0; background-color:#f8fafc; font-size:14px; font-weight:bold; color:#475569;">
                                        Email
                                    </td>
                                    <td style="padding:12px; border-bottom:1px solid #e2e8f0; font-size:14px; color:#334155; word-break:break-word;">
                                        {{ $details['email'] ?? 'N/A' }}
                                    </td>
                                </tr>

                                @if(!empty($details['business_name']))
                                    <tr>
                                        <td style="padding:12px; border-bottom:1px solid #e2e8f0; background-color:#f8fafc; font-size:14px; font-weight:bold; color:#475569;">
                                            Business Name
                                        </td>
                                        <td style="padding:12px; border-bottom:1px solid #e2e8f0; font-size:14px; color:#334155; word-break:break-word;">
                                            {{ $details['business_name'] }}
                                        </td>
                                    </tr>
                                @endif

                                @if(!empty($details['mobile']))
                                    <tr>
                                        <td style="padding:12px; border-bottom:1px solid #e2e8f0; background-color:#f8fafc; font-size:14px; font-weight:bold; color:#475569;">
                                            Mobile
                                        </td>
                                        <td style="padding:12px; border-bottom:1px solid #e2e8f0; font-size:14px; color:#334155;">
                                            {{ $details['mobile'] }}
                                        </td>
                                    </tr>
                                @endif

                                @if(!empty($details['business_type']))
                                    <tr>
                                        <td style="padding:12px; border-bottom:1px solid #e2e8f0; background-color:#f8fafc; font-size:14px; font-weight:bold; color:#475569;">
                                            Business Type
                                        </td>
                                        <td style="padding:12px; border-bottom:1px solid #e2e8f0; font-size:14px; color:#334155;">
                                            {{ $details['business_type'] }}
                                        </td>
                                    </tr>
                                @endif

                                <tr>
                                    <td style="padding:12px; background-color:#f8fafc; font-size:14px; font-weight:bold; color:#475569;">
                                        Registration Status
                                    </td>
                                    <td style="padding:12px; font-size:14px; color:#059669; font-weight:bold;">
                                        Successful
                                    </td>
                                </tr>

                            </table>

                            <!-- Login Information -->
                            <p style="margin:25px 0 15px; font-size:14px; line-height:1.8; color:#475569;">
                                You can log in to your account using your registered email address and password.
                            </p>

                            @if(!empty($details['login_url']))
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                                       style="margin:20px 0;">
                                    <tr>
                                        <td align="center" bgcolor="#059669" style="border-radius:6px;">
                                            <a href="{{ $details['login_url'] }}"
                                               target="_blank"
                                               style="display:inline-block; padding:13px 25px; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:6px;">
                                                Login to Your Account
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            @endif

                            <p style="margin:25px 0 0; font-size:14px; line-height:1.8; color:#475569;">
                                If you have any questions, please contact our support team.
                            </p>

                            <p style="margin:25px 0 0; font-size:14px; line-height:1.8; color:#334155;">
                                Regards,<br>
                                <strong style="color:#059669;">WABA.TODAY Team</strong>
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center"
                            style="padding:22px 25px; background-color:#f8fafc; border-top:1px solid #e2e8f0;">

                            <p style="margin:0 0 8px; font-size:12px; line-height:1.7; color:#64748b;">
                                This is an automated email regarding your account registration.
                            </p>

                            <p style="margin:0; font-size:12px; color:#94a3b8;">
                                &copy; {{ date('Y') }} WABA.TODAY Automation. All rights reserved.
                            </p>

                        </td>
                    </tr>

                </table>
                <!-- End Main Email Container -->

            </td>
        </tr>
    </table>

</body>
</html>
