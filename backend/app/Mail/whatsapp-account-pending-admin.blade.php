<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New User Onboarding Request</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif; color:#334155;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background-color:#f4f6f9; padding:30px 12px;">
        <tr>
            <td align="center">

                <table width="600" cellpadding="0" cellspacing="0" border="0"
                       style="width:100%; max-width:600px; background:#ffffff; border-radius:8px; overflow:hidden;">

                    <!-- Header -->
                    <tr>
                        <td style="background:#111827; padding:25px 30px; text-align:center;">
                            <h1 style="margin:0; color:#ffffff; font-size:26px;">
                                WABA.TODAY
                            </h1>
                        </td>
                    </tr>

                    <!-- Email Content -->
                    <tr>
                        <td style="padding:30px;">

                            <h2 style="margin:0 0 20px; color:#111827; font-size:22px;">
                                New User Onboarding Request
                            </h2>

                            <p style="font-size:15px; line-height:1.7;">
                                Hello Admin,
                            </p>

                            <p style="font-size:15px; line-height:1.7;">
                                A new user has registered on WABA.TODAY and submitted their
                                WhatsApp Business details for onboarding.
                            </p>

                            <!-- New User Details -->
                            <h3 style="margin:25px 0 12px; color:#111827; font-size:17px;">
                                New User Details
                            </h3>

                            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                   style="border-collapse:collapse; font-size:14px;">

                                <tr>
                                    <td style="padding:12px; background:#f8fafc; border:1px solid #e2e8f0; font-weight:bold; width:42%;">
                                        User Name
                                    </td>
                                    <td style="padding:12px; border:1px solid #e2e8f0;">
                                        {{ $user_name ?? 'Not provided' }}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background:#f8fafc; border:1px solid #e2e8f0; font-weight:bold;">
                                        Registered Email
                                    </td>
                                    <td style="padding:12px; border:1px solid #e2e8f0; word-break:break-word;">
                                        {{ $user_email ?? 'Not provided' }}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background:#f8fafc; border:1px solid #e2e8f0; font-weight:bold;">
                                        Phone Number
                                    </td>
                                    <td style="padding:12px; border:1px solid #e2e8f0;">
                                        {{ $user_phone ?? 'Not provided' }}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background:#f8fafc; border:1px solid #e2e8f0; font-weight:bold;">
                                        Business Name
                                    </td>
                                    <td style="padding:12px; border:1px solid #e2e8f0;">
                                        {{ $business_name ?? 'Not provided' }}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background:#f8fafc; border:1px solid #e2e8f0; font-weight:bold;">
                                        WhatsApp Business Account ID (WABA ID)
                                    </td>
                                    <td style="padding:12px; border:1px solid #e2e8f0; word-break:break-word;">
                                        {{ $waba_id ?? 'Not provided' }}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background:#f8fafc; border:1px solid #e2e8f0; font-weight:bold;">
                                        Phone Number ID
                                    </td>
                                    <td style="padding:12px; border:1px solid #e2e8f0; word-break:break-word;">
                                        {{ $phone_number_id ?? 'Not provided' }}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px; background:#f8fafc; border:1px solid #e2e8f0; font-weight:bold;">
                                        Registration Date
                                    </td>
                                    <td style="padding:12px; border:1px solid #e2e8f0;">
                                        {{ $registration_date ?? 'Not provided' }}
                                    </td>
                                </tr>

                            </table>

                            <!-- Onboarding Status -->
                            <h3 style="margin:25px 0 12px; color:#111827; font-size:17px;">
                                Onboarding Status
                            </h3>

                            <div style="padding:14px 16px; background:#fff7ed; border:1px solid #fed7aa; border-radius:6px;">
                                <strong style="color:#c2410c; font-size:14px;">
                                    Status: Pending Admin Approval
                                </strong>
                            </div>

                            <p style="font-size:15px; line-height:1.7; margin-top:22px;">
                                Please review the user's information and verify the WhatsApp
                                Business account details before approving the onboarding request.
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding:20px 30px; text-align:center; background:#f8fafc; border-top:1px solid #e2e8f0;">
                            <p style="margin:0; color:#64748b; font-size:12px;">
                                &copy; {{ date('Y') }} WABA.TODAY. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
