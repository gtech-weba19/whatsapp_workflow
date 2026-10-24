
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Registration Successful</title>
</head>
<body style="margin:0;padding:24px;background:#f7f9fc;font-family:Arial,sans-serif;color:#1e293b">
    <div style="max-width:650px;margin:auto;padding:28px;background:#fff;border:1px solid #e2e8f0;border-radius:14px">
        <h2 style="color:#059669">Welcome to WABA Bot Automation!</h2>

        <p>Hello {{ $details['name'] }},</p>

        <p>Your account registration has been completed successfully.</p>

        <h3>Registration Details</h3>

        <table width="100%" cellpadding="10" cellspacing="0"
               style="border-collapse:collapse;font-size:14px">
            <tr>
                <td style="border:1px solid #e2e8f0"><strong>Full Name</strong></td>
                <td style="border:1px solid #e2e8f0">{{ $details['name'] }}</td>
            </tr>
            <tr>
                <td style="border:1px solid #e2e8f0"><strong>Email</strong></td>
                <td style="border:1px solid #e2e8f0">{{ $details['email'] }}</td>
            </tr>
            <tr>
                <td style="border:1px solid #e2e8f0"><strong>Mobile</strong></td>
                <td style="border:1px solid #e2e8f0">{{ $details['mobile'] ?: 'Not provided' }}</td>
            </tr>
            <tr>
                <td style="border:1px solid #e2e8f0"><strong>Company Name</strong></td>
                <td style="border:1px solid #e2e8f0">{{ $details['company_name'] ?: 'Not provided' }}</td>
            </tr>
            <tr>
                <td style="border:1px solid #e2e8f0"><strong>Business Type</strong></td>
                <td style="border:1px solid #e2e8f0">{{ $details['business_type'] ?: 'Not provided' }}</td>
            </tr>
            <tr>
                <td style="border:1px solid #e2e8f0"><strong>Industry</strong></td>
                <td style="border:1px solid #e2e8f0">{{ $details['industry'] ?: 'Not provided' }}</td>
            </tr>
            <tr>
                <td style="border:1px solid #e2e8f0"><strong>Country</strong></td>
                <td style="border:1px solid #e2e8f0">{{ $details['country'] ?: 'Not provided' }}</td>
            </tr>
            <tr>
                <td style="border:1px solid #e2e8f0"><strong>City</strong></td>
                <td style="border:1px solid #e2e8f0">{{ $details['city'] ?: 'Not provided' }}</td>
            </tr>
            <tr>
                <td style="border:1px solid #e2e8f0"><strong>Website</strong></td>
                <td style="border:1px solid #e2e8f0">{{ $details['website'] ?: 'Not provided' }}</td>
            </tr>
            <tr>
                <td style="border:1px solid #e2e8f0"><strong>Meta Account Type</strong></td>
                <td style="border:1px solid #e2e8f0">{{ $details['meta_account_type'] ?: 'Not provided' }}</td>
            </tr>
            <tr>
                <td style="border:1px solid #e2e8f0"><strong>Onboarding Preference</strong></td>
                <td style="border:1px solid #e2e8f0">{{ $details['onboarding_preference'] ?: 'Not provided' }}</td>
            </tr>
            <tr>
                <td style="border:1px solid #e2e8f0"><strong>Number Setup</strong></td>
                <td style="border:1px solid #e2e8f0">{{ $details['number_setup_type'] ?: 'Not selected' }}</td>
            </tr>
            <tr>
                <td style="border:1px solid #e2e8f0"><strong>Status</strong></td>
                <td style="border:1px solid #e2e8f0;color:#059669"><strong>Registration Completed</strong></td>
            </tr>
        </table>

        <p style="margin-top:24px">
            You can now log in to your account and continue.
        </p>

        <p>Regards,<br><strong>WABA Bot Automation Team</strong></p>
    </div>
</body>
</html>
