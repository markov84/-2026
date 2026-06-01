 import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const server = http.createServer(app);

function isPrivateIpv4(hostname) {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return false;

  const [first, second] = hostname.split(".").map(Number);
  if (first === 10) return true;
  if (first === 192 && second === 168) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  return false;
}

const allowedOrigins = Array.from(
  new Set(
    [
      env.clientUrl,
      "https://2026-client.vercel.app",
      "https://2026-client-buaswr5x6-injmarkov84-8197s-projects.vercel.app",
      "https://2026-client-git-main-injmarkov84-8197s-projects.vercel.app",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ].filter(Boolean)
  )
);

function isAllowedOrigin(origin) {
  if (!origin) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    if (allowedOrigins.includes(origin)) return true;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (hostname.endsWith(".vercel.app")) return true;
    if (isPrivateIpv4(hostname)) return true;

    return false;
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// Rate limiting: 1000 requests per 15 minutes per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === "/health" || req.path === "/api/health";
    }
  })
);

app.set("io", io);

app.use("/api", routes);
app.use(errorHandler);

io.on("connection", (socket) => {
  socket.emit("notification", {
    type: "info",
    message: "Свързване с канала за известия е успешно."
  });
});

async function start() {
  server.listen(env.port, env.host, () => {
    console.log(`Server listening on http://${env.host}:${env.port}`);
  });

  connectDbWithRetry();
}

async function connectDbWithRetry() {
  try {
    await connectDb();
    console.log("БАЗА ДАННИ:СЛУШАМ ТЕ МАРКОВ.");
  } catch (error) {
    console.error("Database connection failed. Retrying in 10 seconds:", error.message);
    setTimeout(connectDbWithRetry, 10000);
  }
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
