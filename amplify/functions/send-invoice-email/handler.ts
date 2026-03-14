import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({});

type EmailPayload = {
  to: string;
  cc?: string;
  replyTo?: string;
  subject: string;
  body: string;
  pdfBase64: string;
  fileName: string;
};

export const handler = async (event: { arguments: EmailPayload }) => {
  const { to, cc, replyTo, subject, body, pdfBase64, fileName } = event.arguments;

  const fromEmail = process.env.SES_FROM_EMAIL;
  const boundary = `boundary-${Date.now()}`;
  const rawParts = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    body,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf; name="${fileName}"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${fileName}"`,
    ``,
    pdfBase64,
    ``,
    `--${boundary}--`,
  ];

  const rawMessage = rawParts.join('\r\n');

  await ses.send(new SendEmailCommand({
    Content: {
      Raw: { Data: new TextEncoder().encode(rawMessage) },
    },
  }));

  return { success: true };
};
