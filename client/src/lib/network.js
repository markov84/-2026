const PRODUCTION_API_URL = "https://mark-light-api.onrender.com/api";
const PRODUCTION_SOCKET_URL = "https://mark-light-api.onrender.com";
const SPARSE_API_HOST = "2026-s9jh.onrender.com";

function normalizeApiBaseUrl(url) {
  const trimmedUrl = url.trim().replace(/\/+$/, "");
  if (trimmedUrl.endsWith("/api")) {
    return trimmedUrl;
  }
  return `${trimmedUrl}/api`;
}

export function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (configuredBaseUrl && configuredBaseUrl.trim()) {
    const normalizedBaseUrl = normalizeApiBaseUrl(configuredBaseUrl);
    if (!normalizedBaseUrl.includes(SPARSE_API_HOST)) {
      return normalizedBaseUrl;
    }
  }

  return PRODUCTION_API_URL;
}

export function getSocketBaseUrl() {
  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;

  if (configuredSocketUrl && !configuredSocketUrl.includes(SPARSE_API_HOST)) {
    return configuredSocketUrl;
  }

  return PRODUCTION_SOCKET_URL;
}
