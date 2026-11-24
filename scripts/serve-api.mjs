// Runs the Neon Function bundle locally on http://localhost:8788 against DATABASE_URL from .env.local.
// Run: npm run api:dev   (builds the bundle first; it is the exact code that gets deployed)
import { createServer } from 'node:http';

const { default: handler } = await import('../dist-function/index.mjs');
const port = Number(process.env.PORT ?? 8788);

createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const request = new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: req.method === 'GET' || req.method === 'HEAD' || !chunks.length ? undefined : Buffer.concat(chunks),
  });
  const response = await handler.fetch(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`api on http://localhost:${port}`));
