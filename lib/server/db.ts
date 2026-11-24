// Postgres over Neon's HTTP SQL endpoint: one request per statement, no driver to bundle.
// Each statement runs on its own; anything that must be atomic lives in a Postgres function
// (assign_player_atomic, express_*) or uses a conditional UPDATE.

export class SqlError extends Error {
  constructor(readonly code: string | undefined, message: string) {
    super(message);
  }
}

export async function query<T extends Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const res = await fetch(`https://${new URL(url).hostname}/sql`, {
    method: 'POST',
    headers: { 'Neon-Connection-String': url, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: text, params }),
  });
  const body = (await res.json().catch(() => null)) as { rows?: T[]; message?: string; code?: string } | null;
  if (!res.ok) throw new SqlError(body?.code, body?.message ?? `sql ${res.status}`);
  return body?.rows ?? [];
}
