// Speicher-Server für lokale Versuche: der Worker-Code mit einem KV-Ersatz im Arbeitsspeicher.
// Start: node test/dev-api.mjs [Port] [erlaubter Ursprung]
import http from 'node:http';
import worker from '../worker/src/index.js';

const port = Number(process.argv[2]) || 8787;
const origin = process.argv[3] || 'http://localhost:8080';
const m = new Map();
const env = {
  CALCS: { async get(k, t) { const v = m.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { m.set(k, v); } },
  ALLOWED_ORIGINS: origin, APP_VERSION: 'dev', KEEP_DAYS: '183',
};
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const r = await worker.fetch(new Request(`http://localhost:${port}${req.url}`, {
    method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined,
  }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(await r.text());
}).listen(port, () => console.log(`o2-api (Versuch) auf http://localhost:${port}, Ursprung ${origin}`));
