const nodemailer = require('nodemailer');

const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpSecure,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS
    ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
    : undefined
});

const sendEmail = async (userEmail, subject, text) => {
  if (!userEmail) return;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@truss.local';
  await transporter.sendMail({
    from,
    to: userEmail,
    subject,
    text
  });
};

const sendSMS = async (telefon, message) => {
  if (!telefon) return;
  // SMS saglayicisi entegre edilene kadar bildirimi log olarak birakir.
  console.log(`[SMS Taslak] ${telefon} -> ${message}`);
};

module.exports = {
  sendEmail,
  sendSMS
};

