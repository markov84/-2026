import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

function hasSmtpConfig() {
  return Boolean(env.smtp.host && env.smtp.port && env.smtp.user && env.smtp.pass && env.smtp.from);
}

function getMissingSmtpKeys() {
  const missing = [];
  if (!env.smtp.host) missing.push("SMTP_HOST");
  if (!env.smtp.port) missing.push("SMTP_PORT");
  if (!env.smtp.user) missing.push("SMTP_USER");
  if (!env.smtp.pass) missing.push("SMTP_PASS");
  if (!env.smtp.from) missing.push("MAIL_FROM|SMTP_FROM");
  return missing;
}

function maskEmail(email) {
  const value = String(email || "");
  const [localPart, domain = ""] = value.split("@");
  if (!localPart || !domain) return "";
  const maskedLocal = localPart.length <= 2 ? `${localPart[0] || ""}*` : `${localPart.slice(0, 2)}***`;
  return `${maskedLocal}@${domain}`;
}

function createTransporter() {
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass
    }
  });
}

export function ensureMailerReady() {
  if (!hasSmtpConfig()) {
    const missingKeys = getMissingSmtpKeys();
    const error = new Error(`SMTP not configured. Missing: ${missingKeys.join(", ") || "unknown"}.`);
    error.status = 500;
    error.details = { missingKeys };
    throw error;
  }

  if (!transporter) {
    transporter = createTransporter();
  }

  return transporter;
}

export function getSmtpDiagnostics() {
  const missingKeys = getMissingSmtpKeys();
  return {
    configured: missingKeys.length === 0,
    missingKeys,
    host: env.smtp.host || "",
    port: env.smtp.port || null,
    secure: env.smtp.secure,
    from: env.smtp.from || "",
    userMasked: maskEmail(env.smtp.user)
  };
}

export async function verifyMailerConnection() {
  const readyTransporter = ensureMailerReady();
  await readyTransporter.verify();
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
