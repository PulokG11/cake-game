import { ApiError, dispatch } from '../../lib/server/commands';

// Neon Function "api": the Cake Game backend. DATABASE_URL is injected by Neon.
// The static site on GitHub Pages calls it directly, so CORS is required.

const BUILD = process.env.BUILD_SHA ?? 'dev';
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'https://pulokg11.github.io,http://localhost:3000')
  .split(',').map(s => s.trim()).filter(Boolean);

function corsHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = { Vary: 'Origin', 'Cache-Control': 'private, no-store' };
  const origin = req.headers.get('origin');
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'content-type, x-admin-password';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function json(req: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(req) });
}

async function rpc(req: Request): Promise<Response> {
  const text = await req.text();
  if (text.length > 400_000) return json(req, { ok: false, error: 'Request too large' }, 413);
  let body: { cmd?: unknown; args?: unknown };
  try { body = JSON.parse(text); } catch { return json(req, { ok: false, error: 'Invalid JSON' }, 400); }
  if (typeof body.cmd !== 'string') return json(req, { ok: false, error: 'Missing cmd' }, 400);
  const args = body.args && typeof body.args === 'object' ? (body.args as Record<string, unknown>) : {};

  try {
    const data = await dispatch(body.cmd, args, req.headers.get('x-admin-password'));
    return json(req, { ok: true, data: data ?? null });
  } catch (e) {
    if (e instanceof ApiError) return json(req, { ok: false, error: e.message }, e.status);
    console.error(`[rpc:${body.cmd}]`, e);
    return json(req, { ok: false, error: 'Internal error' }, 500);
  }
}

export default {
  async fetch(req: Request): Promise<Response> {
    const pathname = new URL(req.url).pathname.replace(/\/{2,}/g, '/');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
    if (req.method === 'GET' && (pathname === '/' || pathname === '/health')) return json(req, { ok: true, build: BUILD });
    if (req.method === 'POST' && pathname === '/rpc') return rpc(req);
    return json(req, { error: 'Not found' }, 404);
  },
};
