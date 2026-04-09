import { defineAuth, secret } from '@aws-amplify/backend';

function brandedEmailTemplate(createCode: () => string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">&#9729; CloudPro Invoice</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="color:#111827;font-size:16px;margin:0 0 16px;">Hi there,</p>
          <p style="color:#4B5563;font-size:14px;margin:0 0 24px;">Your verification code is:</p>
          <div style="background-color:#EEF2FF;border:2px solid #C7D2FE;border-radius:8px;padding:16px;text-align:center;margin:0 0 24px;">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#4F46E5;">${createCode()}</span>
          </div>
          <p style="color:#6B7280;font-size:13px;margin:0 0 8px;">This code expires in 24 hours.</p>
          <p style="color:#6B7280;font-size:13px;margin:0;">If you didn&#39;t request this, you can safely ignore this email.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #E5E7EB;">
          <p style="color:#9CA3AF;font-size:12px;margin:0;">&copy; 2026 CloudPro Invoice &middot; Professional invoicing. Ridiculously fast.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: 'CODE',
      verificationEmailSubject: 'Your CloudPro Invoice verification code',
      verificationEmailBody: (createCode) => brandedEmailTemplate(createCode),
    },
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile'],
        attributeMapping: {
          email: 'email',
          givenName: 'given_name',
          familyName: 'family_name',
        },
      },
      callbackUrls: [
        'http://localhost:3000/auth/login',
        'https://cloudpro-digital.co.nz/auth/login',
      ],
      logoutUrls: [
        'http://localhost:3000/auth/login',
        'https://cloudpro-digital.co.nz/auth/login',
      ],
    },
  },
  multifactor: {
    mode: 'OPTIONAL',
    totp: true,
  },
  userAttributes: {
    givenName: {
      mutable: true,
      required: false,
    },
    familyName: {
      mutable: true,
      required: false,
    },
  },
});
