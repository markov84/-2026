import React from "react";
import ReactDOM from "react-dom/client";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import { AuthProvider } from "./providers/AuthProviderStable.jsx";
import AppThemeProvider from "./providers/AppThemeProvider.jsx";
import "./styles.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  });
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

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
            <Button variant="contained" onClick={() => window.location.reload()}>
              Презареди
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
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
  </React.StrictMode>
);
