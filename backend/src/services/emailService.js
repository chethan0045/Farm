const nodemailer = require('nodemailer');

// SMTP email delivery (used for password-change verification codes).
// Configured via env: SMTP_USER + SMTP_PASS required; host/port default to
// Gmail (use a Google "App password", not the account password).
// When unconfigured, isConfigured() is false and callers fall back to
// non-email flows rather than breaking.

function isConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) throw new Error('Email is not configured (SMTP_USER/SMTP_PASS)');
  if (process.env.NODE_ENV === 'test') return { messageId: 'test' }; // never hit the network in tests
  return getTransporter().sendMail({
    from: process.env.SMTP_FROM || `KVS Farm <${process.env.SMTP_USER}>`,
    to, subject, text, html
  });
}

async function sendPasswordOtp(to, code) {
  return sendMail({
    to,
    subject: `${code} is your KVS Farm verification code`,
    text: `Your password change verification code is ${code}. It is valid for 10 minutes. If you didn't request this, change your password immediately.`,
    html: `<div style="font-family:sans-serif;max-width:420px">
      <h2 style="color:#1d4ed8">KVS Farm</h2>
      <p>Your password change verification code is:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;background:#f1f5f9;padding:12px 20px;border-radius:8px;display:inline-block">${code}</p>
      <p style="color:#64748b;font-size:13px">Valid for 10 minutes. If you didn't request this, change your password immediately.</p>
    </div>`
  });
}

module.exports = { isConfigured, sendMail, sendPasswordOtp };
