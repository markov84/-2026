const PRODUCTION_API_URL = "https://mark-light-api.onrender.com/api";
const PRODUCTION_SOCKET_URL = "https://mark-light-api.onrender.com";
const SPARSE_API_HOST = "2026-s9jh.onrender.com";
const LOCAL_API_URL = "http://localhost:5000/api";
const LOCAL_SOCKET_URL = "http://localhost:5000";

function isPrivateIpv4(hostname) {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return false;
  const [first, second] = hostname.split(".").map(Number);
  if (first === 10) return true;
  if (first === 192 && second === 168) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  return false;
}

function isLocalHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local") || isPrivateIpv4(host);
}

function normalizeApiBaseUrl(url) {
  const trimmedUrl = url.trim().replace(/\/+$/, "");
  if (trimmedUrl.endsWith("/api")) {
    return trimmedUrl;
  }
  return `${trimmedUrl}/api`;
}

export function getApiBaseUrl() {
  if (isLocalHost()) {
    return LOCAL_API_URL;
  }

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
  if (isLocalHost()) {
    return LOCAL_SOCKET_URL;
  }

  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;

  if (configuredSocketUrl && !configuredSocketUrl.includes(SPARSE_API_HOST)) {
    return configuredSocketUrl;
  }

  return PRODUCTION_SOCKET_URL;
}
