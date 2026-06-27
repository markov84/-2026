import { createContext, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { clearAuthToken, clearPersistentAuthToken, getAuthToken, setAuthToken } from "../lib/authToken";

const AuthContext = createContext(null);

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
        const response = await api.post("/auth/login", { username, password });
        setAuthToken(response.data.token);
        setUser(response.data.user);
        toast.success("Входът е успешен.");
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
