import axios from "axios";
import { getApiBaseUrl } from "./network";
import { getAuthToken } from "./authToken";

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

export default api;
