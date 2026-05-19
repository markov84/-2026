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

    const fallbackTimer = window.setTimeout(() => {
      clearAuthToken();
      setLoading(false);
      toast.error("Session check timed out. Please sign in again.");
    }, 9000);

    api
      .get("/auth/me")
      .then((response) => setUser(response.data.user))
      .catch(() => clearAuthToken())
      .finally(() => {
        window.clearTimeout(fallbackTimer);
        setLoading(false);
      });

    return () => {
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
