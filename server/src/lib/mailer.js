import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

function hasSmtpConfig() {
  return Boolean(env.smtp.host && env.smtp.port && env.smtp.user && env.smtp.pass && env.smtp.from);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass
    }
  });
}

export function ensureMailerReady() {
  if (!hasSmtpConfig()) {
    const error = new Error("SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM (or SMTP_FROM).");
    error.status = 500;
    throw error;
  }

  if (!transporter) {
    transporter = createTransporter();
  }

  return transporter;
}

export async function sendDocumentEmail({ to, subject, html, replyTo }) {
  const readyTransporter = ensureMailerReady();
  const fromAddress = env.smtp.from;
  const from = env.smtp.fromName ? `${env.smtp.fromName} <${fromAddress}>` : fromAddress;

  return readyTransporter.sendMail({
    from,
    to,
    subject,
    html,
    ...(replyTo ? { replyTo } : {})
  });
}
