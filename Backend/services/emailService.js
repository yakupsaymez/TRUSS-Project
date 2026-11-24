const nodemailer = require('nodemailer');

const isSmtpConfigured = () => Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

const createTransporter = () => {
  const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
  const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildObsidianTemplate = (subject, bodyHtml) => {
  const safeSubject = escapeHtml(subject || 'TRUSS Bildirimi');
  const safeBody = bodyHtml ? String(bodyHtml) : '<p>Bildirim içeriği yok.</p>';

  return `
  <div style="margin:0;padding:0;background:#020617;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:rgba(15,23,42,0.94);border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.45);">
        <div style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.95));">
          <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">TRUSS Bildirim</div>
          <h1 style="margin:0;font-size:22px;line-height:1.35;color:#f8fafc;">${safeSubject}</h1>
        </div>
        <div style="padding:28px;line-height:1.7;color:#cbd5e1;font-size:15px;">
          ${safeBody}
        </div>
        <div style="padding:18px 28px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#64748b;">
          Bu mesaj TRUSS tarafından otomatik olarak gönderildi.
        </div>
      </div>
    </div>
  </div>
`;
};

const sendNotificationEmail = async (to, subject, htmlBody, options = {}) => {
  if (options.skipEmail === true || options.dryRun === true || process.env.NOTIFY_DRY_RUN === 'true') {
    return { sent: false, skipped: true, reason: 'dry_run' };
  }

  if (!isSmtpConfigured()) {
    return { sent: false, skipped: true, reason: 'smtp_not_configured' };
  }

  if (!to) {
    return { sent: false, skipped: true, reason: 'missing_recipient' };
  }

  const resolvedSubject = String(subject || 'TRUSS Bildirimi');
  const resolvedBody = htmlBody || (options.plainText ? `<p>${escapeHtml(options.plainText)}</p>` : '<p>Bildirim içeriği yok.</p>');
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@truss.local';

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from,
      to,
      subject: resolvedSubject,
      html: buildObsidianTemplate(resolvedSubject, resolvedBody),
    });
    return { sent: true, skipped: false, messageId: info?.messageId || null };
  } catch (err) {
    console.error('[Email] Bildirim e-postası gönderilemedi:', err.message);
    return { sent: false, skipped: false, error: err.message };
  }
};

module.exports = {
  isSmtpConfigured,
  escapeHtml,
  buildObsidianTemplate,
  sendNotificationEmail,
};
