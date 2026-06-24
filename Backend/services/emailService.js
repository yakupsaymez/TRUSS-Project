const nodemailer = require('nodemailer');

const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpSecure,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS
    ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
    : undefined
});

const buildObsidianTemplate = (subject, bodyHtml) => `
  <div style="margin:0;padding:0;background:#020617;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:rgba(15,23,42,0.94);border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.45);">
        <div style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.95));">
          <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">truss Notification</div>
          <h1 style="margin:0;font-size:24px;line-height:1.35;color:#f8fafc;">${subject}</h1>
        </div>
        <div style="padding:28px;line-height:1.7;color:#cbd5e1;font-size:15px;">
          ${bodyHtml}
        </div>
        <div style="padding:18px 28px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#64748b;">
          Bu mesaj truss tarafından otomatik olarak gönderildi.
        </div>
      </div>
    </div>
  </div>
`;

const sendNotificationEmail = async (to, subject, htmlBody) => {
  if (!to) {
    throw new Error('E-posta alıcısı zorunludur.');
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@truss.local';
  const html = buildObsidianTemplate(subject || 'truss Bildirimi', htmlBody || '<p>Bildirim içeriği yok.</p>');

  return transporter.sendMail({
    from,
    to,
    subject: subject || 'truss Bildirimi',
    html
  });
};

module.exports = {
  sendNotificationEmail
};

