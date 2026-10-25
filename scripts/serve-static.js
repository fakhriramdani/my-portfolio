#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.argv[2] || process.env.PORT || "8898", 10);
const OUT = path.resolve(__dirname, "..", "out");

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(OUT, p);
  if ((!file.startsWith(OUT + path.sep) && file !== OUT) || !fs.existsSync(file)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not Found");
  }
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Static server listening on http://127.0.0.1:${PORT}`);
});
