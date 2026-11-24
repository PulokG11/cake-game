import type { Game, GameState, Role, SessionSettings } from './types';

// All data access goes through the Neon Function (POST /rpc). The browser never holds a
// database credential. Facilitator commands carry the admin password, checked on the server.

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const ADMIN_KEY = 'cakegame_admin_pw';

function storedAdminPassword(): string | null {
  try { return sessionStorage.getItem(ADMIN_KEY); } catch { return null; }
}

export function setAdminSession(password: string): void {
  try { sessionStorage.setItem(ADMIN_KEY, password); } catch { /* storage unavailable */ }
}

export function clearAdminSession(): void {
  try { sessionStorage.removeItem(ADMIN_KEY); } catch { /* storage unavailable */ }
}

export function hasAdminSession(): boolean {
  return storedAdminPassword() !== null;
}

async function rpc<T = void>(cmd: string, args: Record<string, unknown> = {}, adminPassword = storedAdminPassword()): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (adminPassword) headers['x-admin-password'] = adminPassword;
  let res: Response;
  try {
    res = await fetch(`${API_URL}/rpc`, { method: 'POST', headers, body: JSON.stringify({ cmd, args }), cache: 'no-store' });
  } catch {
    throw new Error('Could not reach the game server. Check your connection and try again.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body.data as T;
}

/** Check a facilitator password with the server without storing it. Throws if the server cannot check it. */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    await rpc('verifyAdmin', {}, password.trim());
    return true;
  } catch (e) {
    if (e instanceof Error && /required/i.test(e.message)) return false;
    throw e;
  }
}

// ─── Games ────────────────────────────────────────────────────────────────────

export async function getGame(gameId: string): Promise<Game | null> {
  try { return await rpc<Game | null>('getGame', { gameId }); } catch { return null; }
}

/** Champions Mode games only (facilitator). */
export async function getAllGames(): Promise<Game[]> {
  try { return await rpc<Game[]>('getAllGames'); } catch { return []; }
}

export function updateGameState(gameId: string, state: Partial<GameState>): Promise<void> {
  return rpc('updateGameState', { gameId, state });
}

export function updateFullGameState(gameId: string, state: GameState): Promise<void> {
  return rpc('updateFullGameState', { gameId, state });
}

// ─── Live updates ─────────────────────────────────────────────────────────────
// Polling replaces Supabase Realtime: each subscriber fetches on an interval and is
// only called back when the data actually changed.

function poll<T>(fetcher: () => Promise<T>, cb: (v: T) => void, everyMs: number): () => void {
  let last: string | undefined;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tick = async () => {
    try {
      const v = await fetcher();
      const s = JSON.stringify(v);
      if (!stopped && s !== last) {
        last = s;
        cb(v);
      }
    } catch { /* the next tick retries */ }
    if (!stopped) timer = setTimeout(tick, document.hidden ? everyMs * 4 : everyMs);
  };
  timer = setTimeout(tick, everyMs);
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

export function subscribeToGame(gameId: string, callback: (game: Game | null) => void): () => void {
  return poll(() => rpc<Game | null>('getGame', { gameId }), callback, 1500);
}

export function subscribeToAllGames(callback: (games: Game[]) => void): () => void {
  return poll(() => rpc<Game[]>('getAllGames'), callback, 2500);
}

// ─── Session settings (facilitator) ───────────────────────────────────────────

export function updateSessionSettings(settings: Partial<SessionSettings>): Promise<void> {
  return rpc('updateSessionSettings', settings as Record<string, unknown>);
}

export function subscribeToSessionSettings(callback: (s: SessionSettings) => void): () => void {
  return poll(() => rpc<SessionSettings>('getSessionSettings'), callback, 3000);
}

// ─── Facilitator actions ──────────────────────────────────────────────────────

export const startAllGames = (): Promise<void> => rpc('startAllGames');
export const deleteAllGames = (): Promise<void> => rpc('deleteAllGames');
export const resetGameValues = (gameId: string): Promise<void> => rpc('resetGameValues', { gameId });

/** Watchdog: once the order timer has run out, missing roles use the pass-through order. */
export const submitBotOrdersAndProcess = (gameId: string): Promise<void> => rpc('submitBotOrdersAndProcess', { gameId });

/** Watchdog: move a game held in the summary phase on to the next round. */
export const advanceFromSummary = (gameId: string): Promise<void> => rpc('advanceFromSummary', { gameId });

// ─── Champions Mode ───────────────────────────────────────────────────────────

export function autoAssignPlayer(email: string): Promise<{
  playerId: string;
  gameId: string;
  role: Role;
  teamName: string;
  teamNumber: number;
}> {
  return rpc('autoAssignPlayer', { email });
}

// ─── Express Mode ─────────────────────────────────────────────────────────────

export type RoleChoice = Role | 'random';

export interface ExpressResult {
  gameId: string;
  playerId: string;
  role: Role;
  started: boolean;
}

/** Create an Express game. With one expected player it starts at once with 3 bots. */
export function createExpressGame(choice: RoleChoice, expectedPlayers: number): Promise<ExpressResult & { code: string }> {
  return rpc('createExpressGame', { choice, expectedPlayers });
}

export async function findExpressGame(code: string): Promise<Game | null> {
  return rpc<Game | null>('findExpressGame', { code: code.trim() });
}

export function joinExpressGame(code: string, choice: RoleChoice): Promise<ExpressResult> {
  return rpc('joinExpressGame', { code: code.trim(), choice });
}

/** Host only: start now and let bots take every empty role. */
export function startExpressGame(gameId: string, playerId: string): Promise<void> {
  return rpc('startExpressGame', { gameId, playerId });
}
