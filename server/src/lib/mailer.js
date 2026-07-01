import dns from "node:dns";
import net from "node:net";
import nodemailer from "nodemailer";
import tls from "node:tls";
import { env } from "../config/env.js";

const cachedTransporters = new Map();

function toBoolean(value, fallback = false) {
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function getMailConfig() {
  const host = String(env.smtpHost || "").trim();
  const user = String(env.smtpUser || "").trim();
  const pass = String(env.smtpPass || "").trim();

  return {
    host,
    port: Number(env.smtpPort || 587),
    secure: toBoolean(env.smtpSecure, false),
    user,
    // Gmail app passwords are often pasted with spaces; SMTP expects plain token.
    pass: pass.replaceAll(" ", ""),
    from: String(env.smtpFrom || "").trim(),
    fromName: env.smtpFromName || "MARKLIGHT"
  };
}

function validateMailConfig(config) {
  if (!config.host || !config.user || !config.pass || !config.from) {
    throw new Error("SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM.");
  }
}

async function resolveIpv4(hostname) {
  const result = await dns.promises.lookup(hostname, { family: 4 });
  return result.address;
}

function createTransporter(config) {
  validateMailConfig(config);

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    tls: {
      servername: config.host
    },
    getSocket(options, callback) {
      resolveIpv4(config.host)
        .then((address) => {
          const socketOptions = {
            host: address,
            port: Number(options.port || config.port)
          };

          const connection = config.secure
            ? tls.connect({
                ...socketOptions,
                servername: config.host
              })
            : net.connect({
                ...socketOptions,
                family: 4
              });

          callback(null, { connection });
        })
        .catch((error) => callback(error));
    },
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

function getTransporter(config) {
  const cacheKey = `${config.host}:${config.port}:${config.secure}:${config.user}`;

  if (!cachedTransporters.has(cacheKey)) {
    cachedTransporters.set(cacheKey, createTransporter(config));
  }

  return cachedTransporters.get(cacheKey);
}

function getTransportConfigs() {
  const primary = getMailConfig();
  const isGmail = /(^|\.)gmail\.com$/i.test(primary.host);

  if (isGmail && primary.port === 587 && !primary.secure) {
    return [
      primary,
      {
        ...primary,
        port: 465,
        secure: true
      }
    ];
  }

  return [primary];
}

export async function sendEmail({ to, subject, text, html }) {
  const transportConfigs = getTransportConfigs();
  let lastError = null;

  for (const config of transportConfigs) {
    const transporter = getTransporter(config);

    try {
      return await transporter.sendMail({
        from: `${config.fromName} <${config.from}>`,
        to,
        subject,
        text,
        html
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("SMTP send failed.");
}
