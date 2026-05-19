import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  cacheDir: ".vite-runtime",
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    globals: true
  },
  build: {
    chunkSizeWarningLimit: 450,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts")) return "charts";
          if (id.includes("@mui/x-data-grid")) return "mui-x";
          if (id.includes("@mui/icons-material")) return "mui-icons";
          if (id.includes("@emotion/react") || id.includes("@emotion/styled") || id.includes("@emotion/cache")) return "emotion";
          if (id.includes("@mui")) return "mui-core";
          if (id.includes("react-router")) return "router";
          if (id.includes("axios") || id.includes("react-hot-toast") || id.includes("socket.io-client") || id.includes("dayjs")) return "services";
          return "vendor";
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true
      },
      "/socket.io": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        ws: true
      }
    }
  },
  preview: {
    host: true,
    port: 4173
  }
});
