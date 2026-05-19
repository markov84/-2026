export function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  return "/api";
}

export function getSocketBaseUrl() {
  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (configuredSocketUrl) {
    return configuredSocketUrl;
  }

  if (typeof window === "undefined") {
    return "http://localhost:5000";
  }

  const hostname = window.location.hostname || "localhost";
  const protocol = window.location.protocol || "http:";
  return `${protocol}//${hostname}:5000`;
}
