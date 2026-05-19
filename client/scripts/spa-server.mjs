import { createReadStream, existsSync, statSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const root = normalize(join(fileURLToPath(new URL("..", import.meta.url)), "dist"));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const apiTargetHost = process.env.API_HOST || "127.0.0.1";
const apiTargetPort = Number(process.env.API_PORT || 5000);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8"
};

function sendFile(res, filePath) {
  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
  createReadStream(filePath).pipe(res);
}

function proxyToApi(req, res) {
  const proxyRequest = httpRequest(
    {
      host: apiTargetHost,
      port: apiTargetPort,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${apiTargetHost}:${apiTargetPort}`
      }
    },
    (proxyResponse) => {
      res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
      proxyResponse.pipe(res);
    }
  );

  proxyRequest.on("error", () => {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ message: "API proxy error." }));
  });

  req.pipe(proxyRequest);
}

createServer((req, res) => {
  if ((req.url || "").startsWith("/api/")) {
    proxyToApi(req, res);
    return;
  }

  const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const safePath = normalize(join(root, requestPath));
  const isInsideRoot = safePath.startsWith(root);

  if (isInsideRoot && existsSync(safePath) && statSync(safePath).isFile()) {
    sendFile(res, safePath);
    return;
  }

  const indexPath = join(root, "index.html");
  if (existsSync(indexPath)) {
    sendFile(res, indexPath);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("dist/index.html not found");
}).listen(port, host, () => {
  console.log(`SPA server running at http://${host}:${port}`);
});
