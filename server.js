#!/usr/bin/env node
/**
 * NEOENGINE — Servidor Local de Desarrollo y Pruebas (Localhost)
 * Uso:
 *   node server.js
 *   (o doble clic en iniciar-localhost.bat)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const ROOT = __dirname;
const DEFAULT_PORT = Number(process.env.PORT) || 8080;
const NO_OPEN = process.argv.includes("--no-open");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".c": "text/plain; charset=utf-8",
  ".h": "text/plain; charset=utf-8",
  ".java": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function createServer() {
  return http.createServer((req, res) => {
    const rawUrl = decodeURIComponent((req.url || "/").split("?")[0]);
    const cleanRel = rawUrl === "/" ? "/index.html" : rawUrl;
    const safePath = path.normalize(cleanRel).replace(/^(\.\.[/\\])+/, "");
    let filePath = path.join(ROOT, safePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`404 No encontrado: ${cleanRel}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

function startOnAvailablePort(port) {
  const server = createServer();
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      startOnAvailablePort(port + 1);
    } else {
      console.error("Error al iniciar el servidor:", err);
    }
  });

  server.listen(port, "127.0.0.1", () => {
    const urlMain = `http://localhost:${port}/index.html`;
    const urlPortal = `http://localhost:${port}/portal-totp.html`;
    console.log("==================================================================");
    console.log("  ⚡ NEOENGINE — SERVIDOR LOCALHOST DE PRUEBAS ACTIVO");
    console.log("==================================================================");
    console.log(`  ▶ Aplicación Principal : ${urlMain}`);
    console.log(`  ▶ Portal QR / TOTP 2FA : ${urlPortal}`);
    console.log("  ▶ Modo sin caché activo: cualquier cambio se refleja al recargar");
    console.log("  ▶ Pulsa Ctrl + C para detener el servidor.");
    console.log("==================================================================");

    if (!NO_OPEN) {
      const cmd =
        process.platform === "win32"
          ? `start "" "${urlMain}"`
          : process.platform === "darwin"
          ? `open "${urlMain}"`
          : `xdg-open "${urlMain}"`;
      exec(cmd, () => {});
    }
  });
}

startOnAvailablePort(DEFAULT_PORT);
