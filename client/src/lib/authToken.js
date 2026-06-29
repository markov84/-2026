const AUTH_TOKEN_KEY = "mark-light-token";

export function getAuthToken() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  clearPersistentAuthToken();
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  clearPersistentAuthToken();
}

export function clearPersistentAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
