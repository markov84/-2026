import axios from "axios";
import { getApiBaseUrl } from "./network";
import { getAuthToken } from "./authToken";

const RETRYABLE_ERROR_CODES = new Set(["ECONNABORTED", "ERR_NETWORK"]);

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 8000
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const method = String(config?.method || "get").toLowerCase();
    const shouldRetry =
      config &&
      method === "get" &&
      !config.__retryOnce &&
      (RETRYABLE_ERROR_CODES.has(error.code) || !error.response);

    if (!shouldRetry) {
      return Promise.reject(error);
    }

    config.__retryOnce = true;
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    return api(config);
  }
);

export default api;
