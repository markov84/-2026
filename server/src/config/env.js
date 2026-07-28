import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProductionRuntime = String(process.env.NODE_ENV || "").toLowerCase() === "production";

if (!isProductionRuntime) {
  dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });
  dotenv.config();
}

function envValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeSmtpPassword(value) {
  if (!value) return "";
  // Gmail app passwords are often pasted with spaces between groups.
  return value.replace(/\s+/g, "").trim();
}

const smtpFromAddress = envValue("MAIL_FROM", "SMTP_FROM", "SMTP_USER", "MAIL_USER");
const smtpFromName = process.env.SMTP_FROM_NAME || "";
const smtpService = process.env.SMTP_SERVICE || "";
const smtpPortRaw = envValue("SMTP_PORT", "MAIL_PORT");
const smtpPort = Number(smtpPortRaw || 587);

export const env = {
  host: process.env.HOST || "0.0.0.0",
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "Markov8406162224",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || ""
  },
  smtp: {
    service: smtpService,
    host: envValue("SMTP_HOST", "MAIL_HOST"),
    port: Number.isFinite(smtpPort) && smtpPort > 0 ? smtpPort : 587,
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    user: envValue("SMTP_USER", "MAIL_USER"),
    pass: normalizeSmtpPassword(envValue("SMTP_PASS", "MAIL_PASS", "SMTP_PASSWORD")),
    from: smtpFromAddress,
    fromName: smtpFromName
  }
};
