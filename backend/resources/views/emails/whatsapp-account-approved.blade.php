
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Account Approved - WABA.TODAY</title>
</head>

<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, sans-serif; color: #222; line-height: 1.6;">

    <div style="max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden;">

        <div style="background-color: #075e54; color: #ffffff; padding: 25px 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 26px;">WABA.TODAY</h1>
            <p style="margin: 8px 0 0;">WhatsApp Business Automation</p>
        </div>

        <div style="padding: 30px;">

            <h2 style="color: #075e54; margin-top: 0;">
                🎉 Congratulations! Your WhatsApp Account Has Been Approved
            </h2>

            <p>Hi {{ $user_name }},</p>

            <p>
                Congratulations! Your WhatsApp onboarding request has been approved.
            </p>

            <p>
                Welcome to <strong>WABA.TODAY!</strong> Your WhatsApp Business account
                details have been reviewed and approved by our team.
            </p>

            <h3 style="color: #075e54; border-bottom: 1px solid #eeeeee; padding-bottom: 8px;">
                Your Account Details
            </h3>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold;">Name</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">{{ $user_name }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold;">Registered Email</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">{{ $user_email }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold;">Business Name</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">{{ $business_name }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: bold;">WhatsApp Number</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">{{ $waba_id }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Onboarding Status</td>
                    <td style="padding: 10px; color: #198754; font-weight: bold;">Approved</td>
                </tr>
            </table>

            <h3 style="color: #075e54;">You're Ready to Get Started!</h3>

            <p>
                You can now log in to your dashboard and continue setting up your
                WhatsApp automation.
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ $loginUrl }}"
                   style="display: inline-block; background-color: #075e54; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 5px; font-weight: bold;">
                    LOGIN TO YOUR DASHBOARD
                </a>
            </div>

            <p>
                If you have any questions, please contact our support team.
            </p>

            <p style="margin-bottom: 0;">
                Regards,<br>
                <strong>WABA.TODAY Team</strong>
            </p>

        </div>

        <div style="background-color: #f4f6f8; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            This is an automated notification from WABA.TODAY.
        </div>

    </div>

</body>
</html>
