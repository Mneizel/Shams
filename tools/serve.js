// tools/serve.js — خادم ملفّات ثابت بلا أيّ تبعيّة.
//   node tools/serve.js        ثم افتح http://localhost:8080
// يلزم لأنّ المتصفّح يمنع استيراد وحدات ES من file:// .
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = process.cwd();
const PORT = process.env.PORT || 8080;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2",
  ".wasm": "application/wasm", ".task": "application/octet-stream", ".data": "application/octet-stream"
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/web/index.html";
    const full = normalize(join(ROOT, p));
    if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
    let s;
    try { s = await stat(full); } catch { res.writeHead(404); return res.end("not found: " + p); }
    if (s.isDirectory()) { res.writeHead(404); return res.end("directory"); }
    const body = await readFile(full);
    res.writeHead(200, {
      "content-type": TYPES[extname(full).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-cache",
      // يتيحان تعدّدَ خيوط WASM لمكتبةِ الرؤية (اختياريّ لكن أسرع)
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-embedder-policy": "credentialless"
    });
    res.end(body);
  } catch (e) {
    res.writeHead(500); res.end(String(e));
  }
}).listen(PORT, () => {
  console.log(`شمس المعارف — المحرّك:  http://localhost:${PORT}`);
  console.log(`(Ctrl+C للإيقاف)`);
});
