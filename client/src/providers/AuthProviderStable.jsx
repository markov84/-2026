import { createContext, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { clearAuthToken, clearPersistentAuthToken, getAuthToken, setAuthToken } from "../lib/authToken";

const AuthContext = createContext(null);
const RETRYABLE_LOGIN_ERROR_CODES = new Set(["ECONNABORTED", "ERR_NETWORK"]);
const LOGIN_REQUEST_TIMEOUT_MS = 15000;
const LOGIN_MAX_ATTEMPTS = 2;
const LOGIN_RETRY_DELAYS_MS = [500];

function shouldRetryLogin(error) {
  return RETRYABLE_LOGIN_ERROR_CODES.has(error?.code) || !error?.response;
}

function wait(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

async function warmupApiIfNeeded() {
  const baseUrl = String(api?.defaults?.baseURL || "").toLowerCase();
  if (!baseUrl.includes("onrender.com")) return;

  try {
    await api.get("/health", { timeout: 5000 });
  } catch {
    // Ignore warmup failures and continue with login attempt.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clearPersistentAuthToken();
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fallbackTimer = window.setTimeout(() => {
      if (cancelled || getAuthToken() !== token) {
        return;
      }

      clearAuthToken();
      setLoading(false);
      toast.error("Проверката на сесията изтече. Влез отново.");
    }, 9000);

    api
      .get("/auth/me")
      .then((response) => {
        if (!cancelled && getAuthToken() === token) {
          setUser(response.data.user);
        }
      })
      .catch(() => {
        if (!cancelled && getAuthToken() === token) {
          clearAuthToken();
        }
      })
      .finally(() => {
        window.clearTimeout(fallbackTimer);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(username, password) {
        try {
          await warmupApiIfNeeded();
          let response;

          for (let attempt = 0; attempt < LOGIN_MAX_ATTEMPTS; attempt += 1) {
            try {
              response = await api.post("/auth/login", { username, password }, { timeout: LOGIN_REQUEST_TIMEOUT_MS });
              break;
            } catch (error) {
              if (attempt === LOGIN_MAX_ATTEMPTS - 1 || !shouldRetryLogin(error)) {
                throw error;
              }

              await wait(LOGIN_RETRY_DELAYS_MS[attempt] ?? 500);
            }
          }

          setAuthToken(response.data.token);
          setUser(response.data.user);
          toast.success("Входът е успешен.");
          return response.data.user;
        } catch (error) {
          clearAuthToken();
          setUser(null);
          throw error;
        }
      },
      logout() {
        clearAuthToken();
        setUser(null);
        toast("Сесията беше затворена.");
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
