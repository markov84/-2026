import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter = null;

function isResendRequested() {
  return String(env.mail?.provider || "").toLowerCase() === "resend";
}

function isResendMode() {
  return isResendRequested() && hasResendConfig();
}

function isSmtpTimeoutError(error) {
  return ["ETIMEDOUT", "ESOCKET", "ECONNECTION"].includes(error?.code) || /connection timeout/i.test(String(error?.message || ""));
}

function createSmtpTimeoutError(error) {
  const timeoutError = new Error("SMTP connection timeout. Провери SMTP_HOST, SMTP_PORT, SMTP_SECURE и дали Render има изходяща връзка към Gmail.");
  timeoutError.status = 503;
  timeoutError.code = error?.code || "ETIMEDOUT";
  timeoutError.details = {
    originalMessage: String(error?.message || ""),
    originalCode: error?.code || ""
  };
  return timeoutError;
}

function hasSmtpConfig() {
  return Boolean(env.smtp.host && env.smtp.port && env.smtp.user && env.smtp.pass && env.smtp.from);
}

function hasResendConfig() {
  return Boolean(env.mail?.resendApiKey && env.mail?.resendFrom);
}

function getMissingSmtpKeys() {
  if (isResendMode()) {
    const missing = [];
    if (!env.mail?.resendApiKey) missing.push("RESEND_API_KEY");
    if (!env.mail?.resendFrom) missing.push("RESEND_FROM|SMTP_FROM");
    return missing;
  }

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
  const transportOptions = {
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  if (env.smtp.service) {
    transportOptions.service = env.smtp.service;
  } else {
    transportOptions.host = env.smtp.host;
    transportOptions.port = env.smtp.port;
    transportOptions.secure = env.smtp.secure;
  }

  return nodemailer.createTransport(transportOptions);
}

export function ensureMailerReady() {
  if (isResendMode()) {
    return null;
  }

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

  if (isResendMode()) {
    return {
      provider: "resend",
      configured: missingKeys.length === 0,
      missingKeys,
      from: env.mail?.resendFrom || "",
      userMasked: ""
    };
  }

  return {
    provider: "smtp",
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
  if (isResendMode()) {
    ensureMailerReady();
    return;
  }

  const readyTransporter = ensureMailerReady();
  try {
    await readyTransporter.verify();
  } catch (error) {
    if (isSmtpTimeoutError(error)) {
      throw createSmtpTimeoutError(error);
    }

    throw error;
  }
}

function isResendFallbackError(error) {
  const status = Number(error?.status || error?.response?.status || error?.code || 0);
  const message = String(error?.message || "");
  return status === 401 || status === 403 || status === 400 || /invalid|unauthorized|forbidden|authentication/i.test(message);
}

async function sendWithResend({ to, subject, html, replyTo }) {
  const fromAddress = env.mail.resendFrom;
  const from = env.smtp.fromName ? `${env.smtp.fromName} <${fromAddress}>` : fromAddress;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.mail.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {})
    })
  });

  if (!response.ok) {
    const bodyText = await response.text();
    const error = new Error(`Resend API error (${response.status}): ${bodyText || response.statusText}`);
    error.status = 502;
    throw error;
  }

  return response.json();
}

async function sendWithSmtp({ to, subject, html, replyTo }) {
  const readyTransporter = ensureMailerReady();
  const fromAddress = env.smtp.from;
  const from = env.smtp.fromName ? `${env.smtp.fromName} <${fromAddress}>` : fromAddress;

  try {
    return await readyTransporter.sendMail({
      from,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {})
    });
  } catch (error) {
    if (isSmtpTimeoutError(error)) {
      throw createSmtpTimeoutError(error);
    }

    throw error;
  }
}

export async function sendDocumentEmail({ to, subject, html, replyTo }) {
  if (isResendMode()) {
    try {
      ensureMailerReady();
      return await sendWithResend({ to, subject, html, replyTo });
    } catch (error) {
      if (hasSmtpConfig() && isResendFallbackError(error)) {
        return sendWithSmtp({ to, subject, html, replyTo });
      }

      throw error;
    }
  }

  return sendWithSmtp({ to, subject, html, replyTo });
}
