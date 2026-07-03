 import React from "react";
import ReactDOM from "react-dom/client";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import { AuthProvider } from "./providers/AuthProviderStable.jsx";
import AppThemeProvider from "./providers/AppThemeProvider.jsx";
import "./styles.css";

const CHUNK_RELOAD_KEY = "mark-light-chunk-reload-once";

function shouldRecoverFromChunkError(message) {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("failed to fetch dynamically imported module") ||
    text.includes("importing a module script failed") ||
    text.includes("loading chunk") ||
    text.includes("chunkloaderror")
  );
}

function scheduleChunkRecoveryReload() {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") {
      return;
    }
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  } catch {
    return;
  }

  window.setTimeout(() => {
    window.location.reload();
  }, 120);
}

function installChunkRecovery() {
  window.addEventListener("error", (event) => {
    const message = event?.message || event?.error?.message || "";
    if (shouldRecoverFromChunkError(message)) {
      scheduleChunkRecoveryReload();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const message = typeof reason === "string" ? reason : reason?.message || "";
    if (shouldRecoverFromChunkError(message)) {
      scheduleChunkRecoveryReload();
    }
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (error) {
      console.warn("Service worker unregister failed:", error);
    }
  });
}

installChunkRecovery();

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
        <Box sx={{ width: "100%", maxWidth: 720 }}>
          <Stack spacing={2}>
            <Typography variant="h4">Грешка в приложението</Typography>
            <Alert severity="error">
              {this.state.error?.message || "Неочаквана грешка при стартиране."}
            </Alert>
            <Button variant="contained" onClick={this.handleReload}>
              Презареди
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }
}

const rootElement = document.getElementById("root");

ReactDOM.createRoot(rootElement).render(
  <BrowserRouter>
    <AppThemeProvider>
      <AppErrorBoundary>
        <AuthProvider>
          <App />
          <Toaster position="top-right" />
        </AuthProvider>
      </AppErrorBoundary>
    </AppThemeProvider>
  </BrowserRouter>
);
