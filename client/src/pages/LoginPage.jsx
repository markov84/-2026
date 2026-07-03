import { useState } from "react";
import { Alert, Box, Button, Card, CardContent, IconButton, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { useAuth } from "../providers/AuthProviderStable";
import AppGlyph from "../components/AppGlyph";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.message || "Неуспешен вход.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 2,
        background:
          "radial-gradient(circle at top, rgba(244,184,96,0.22), transparent 30%), linear-gradient(135deg, #f7f3eb 0%, #fffdf9 100%)"
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 460, borderRadius: 8 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2} component="form" onSubmit={handleSubmit}>
            <Box
              component="img"
              src="/MARKLIGHT.png"
              alt="MARKLIGHT Lighting Trade"
              sx={{
                width: "100%",
                maxWidth: 300,
                alignSelf: "center",
                height: "auto",
                display: "block"
              }}
            />
            <Typography variant="caption" sx={{ alignSelf: "center", fontWeight: 700, letterSpacing: 0.3, color: "text.secondary" }}>
              MARKLIGHT{"\u00AE"}
            </Typography>
            <div>
              <Typography color="text.secondary">
                Управление на магазини, наличности, клиенти и продажби на едно място.
              </Typography>
            </div>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField label="Потребител" value={username} onChange={(e) => setUsername(e.target.value)} />
            <TextField
              label="Парола"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? "Скрий паролата" : "Покажи паролата"}
                      edge="end"
                      onClick={() => setShowPassword((current) => !current)}
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      {showPassword ? <AppGlyph name="eye-off" size={20} /> : <AppGlyph name="eye" size={20} />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {busy ? "Влизане..." : "Вход"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
