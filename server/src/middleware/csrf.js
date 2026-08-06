import crypto from "crypto";

function getCookieValue(req, name) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const match = cookies.find((item) => item.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

function createCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function csrfProtection(req, res, next) {
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  const method = req.method.toUpperCase();

  if (safeMethods.has(method)) {
    const token = req.cookies?.csrfToken || createCsrfToken();
    res.cookie("csrfToken", token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
    res.setHeader("X-CSRF-Token", token);
    return next();
  }

  if (req.path === "/login" || req.path === "/auth/login") {
    return next();
  }

  if (req.headers.authorization) {
    return next();
  }

  const cookieToken = getCookieValue(req, "csrfToken");
  const headerToken = req.headers["x-csrf-token"] || req.headers["xsrf-token"];

  if (cookieToken && headerToken && cookieToken === headerToken) {
    return next();
  }

  return res.status(403).json({ message: "CSRF token missing or invalid." });
}
