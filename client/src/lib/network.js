const PRODUCTION_API_URL = "https://2026-s9jh.onrender.com/api";
const PRODUCTION_SOCKET_URL = "https://2026-s9jh.onrender.com";
const LEGACY_API_URL = "https://mark-light-api.onrender.com/api";
const LEGACY_SOCKET_URL = "https://mark-light-api.onrender.com";

export function getApiBaseUrl() {
  const configuredBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();

  if (configuredBaseUrl && configuredBaseUrl !== LEGACY_API_URL) {
    return configuredBaseUrl;
  }

  return PRODUCTION_API_URL;
}

export function getSocketBaseUrl() {
  const configuredSocketUrl = String(import.meta.env.VITE_SOCKET_URL || "").trim();

  if (configuredSocketUrl && configuredSocketUrl !== LEGACY_SOCKET_URL) {
    return configuredSocketUrl;
  }

  return PRODUCTION_SOCKET_URL;
}
