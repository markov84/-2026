const PRODUCTION_API_URL = "https://2026-s9jh.onrender.com/api";
const PRODUCTION_SOCKET_URL = "https://2026-s9jh.onrender.com";

export function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  return PRODUCTION_API_URL;
}

export function getSocketBaseUrl() {
  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;

  if (configuredSocketUrl) {
    return configuredSocketUrl;
  }

  return PRODUCTION_SOCKET_URL;
}
