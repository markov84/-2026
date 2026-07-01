import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let cachedTransporter = null;

function toBoolean(value, fallback = false) {
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function getMailConfig() {
  return {
    host: env.smtpHost,
    port: Number(env.smtpPort || 587),
    secure: toBoolean(env.smtpSecure, false),
    user: env.smtpUser,
    pass: env.smtpPass,
    from: env.smtpFrom,
    fromName: env.smtpFromName || "MARKLIGHT"
  };
}

function validateMailConfig(config) {
  if (!config.host || !config.user || !config.pass || !config.from) {
    throw new Error("SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM.");
  }
}

function createTransporter(config) {
  validateMailConfig(config);

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = createTransporter(getMailConfig());
  }

  return cachedTransporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const config = getMailConfig();
  const transporter = getTransporter();

  return transporter.sendMail({
    from: `${config.fromName} <${config.from}>`,
    to,
    subject,
    text,
    html
  });
}
