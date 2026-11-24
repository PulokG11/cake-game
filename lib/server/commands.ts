import { scryptSync, timingSafeEqual } from 'node:crypto';
import { createInitialGameState, generateGameCode, processRound, resolveOrders } from '../gameLogic';
import { DEFAULT_CONFIG, ROLE_LABELS, ROLES, type Game, type GameConfig, type GameState, type Player, type Role } from '../types';
import { query, SqlError } from './db';

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

interface GameRow extends Record<string, unknown> {
  id: string;
  code: string;
  host_id: string | null;
  config: GameConfig | string;
  state: GameState | string;
  players: Record<string, Player> | string | null;
  created_at: string | number;
}

/** The HTTP endpoint may hand back json columns as text; accept both. */
const json = <T>(v: unknown): T => (typeof v === 'string' ? JSON.parse(v) : v) as T;

function rowToGame(row: GameRow): Game {
  return {
    id: row.id,
    code: row.code,
    hostId: row.host_id ?? '',
    config: json<GameConfig>(row.config),
    state: json<GameState>(row.state),
    players: json<Record<string, Player> | null>(row.players) ?? {},
    createdAt: Number(row.created_at),
  };
}

/** Player emails are for the facilitator only. */
function forPlayers(game: Game): Game {
  const players: Record<string, Player> = {};
  for (const [id, p] of Object.entries(game.players)) players[id] = { ...p, email: '' };
  return { ...game, players };
}

const GAME_COLS = 'id, code, host_id, config, state, players, created_at';

async function loadGame(gameId: string): Promise<{ game: Game; rawState: unknown } | null> {
  const rows = await query<GameRow>(`SELECT ${GAME_COLS} FROM games WHERE id = $1`, [gameId]);
  return rows[0] ? { game: rowToGame(rows[0]), rawState: rows[0].state } : null;
}

/**
 * Write a new state only if nobody changed it since it was read (compare-and-set).
 * Returns false when another writer got there first.
 */
async function casState(gameId: string, expected: unknown, next: GameState): Promise<boolean> {
  const rows = await query<{ id: string }>(
    'UPDATE games SET state = $3::jsonb WHERE id = $1 AND state = $2::jsonb RETURNING id',
    [gameId, typeof expected === 'string' ? expected : JSON.stringify(expected), JSON.stringify(next)],
  );
  return rows.length > 0;
}

// ─── Argument checks ──────────────────────────────────────────────────────────

function str(args: Record<string, unknown>, key: string, max = 200): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new ApiError(400, `Invalid ${key}`);
  return v.trim();
}

function obj(args: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = args[key];
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new ApiError(400, `Invalid ${key}`);
  if (JSON.stringify(v).length > 200_000) throw new ApiError(413, `${key} is too large`);
  return v as Record<string, unknown>;
}

function roleChoice(v: unknown): Role | 'random' {
  if (v === 'random' || (typeof v === 'string' && (ROLES as string[]).includes(v))) return v as Role | 'random';
  throw new ApiError(400, 'Invalid role');
}

/** Postgres RAISE EXCEPTION messages (P0001) are written for players; pass them through. */
function playerFacing(e: unknown): never {
  if (e instanceof SqlError && e.code === 'P0001') throw new ApiError(409, e.message);
  throw e;
}

const isUniqueViolation = (e: unknown) => e instanceof SqlError && e.code === '23505';

// ─── Facilitator password ─────────────────────────────────────────────────────

let hashCache: { hash: string | null; at: number } | null = null;

async function adminHash(): Promise<string | null> {
  if (hashCache && Date.now() - hashCache.at < 15_000) return hashCache.hash;
  const rows = await query<{ password_hash: string | null }>('SELECT password_hash FROM admin_settings WHERE id = 1');
  hashCache = { hash: rows[0]?.password_hash ?? null, at: Date.now() };
  return hashCache.hash;
}

async function isAdmin(password: string | null): Promise<boolean> {
  if (!password) return false;
  const stored = await adminHash();
  if (!stored) throw new ApiError(503, 'The facilitator password has not been set yet. Run "npm run admin:password".');
  const [scheme, salt, expected] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !expected) return false;
  const want = Buffer.from(expected, 'base64');
  const got = scryptSync(password.trim(), Buffer.from(salt, 'base64'), want.length);
  return timingSafeEqual(got, want);
}

// ─── Commands ─────────────────────────────────────────────────────────────────

type Handler = (args: Record<string, unknown>, ctx: { admin: boolean }) => Promise<unknown>;

const botPlayer = (role: Role, teamName: string, teamNumber: number, email = ''): Player => ({
  id: `bot_${role}`,
  name: `Bot (${ROLE_LABELS[role]})`,
  email,
  role,
  isBot: true,
  isAdmin: false,
  joinedAt: Date.now(),
  teamName,
  teamNumber,
});

const formatName = (email: string) =>
  email.split('@')[0].replace(/[._\-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const newId = (prefix: string, rand = 3) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 2 + rand);

const publicCommands: Record<string, Handler> = {
  async getGame(args, { admin }) {
    const loaded = await loadGame(str(args, 'gameId'));
    if (!loaded) return null;
    return admin ? loaded.game : forPlayers(loaded.game);
  },

  /** Shallow merge into the game's state, done atomically in SQL. */
  async updateGameState(args) {
    await query('UPDATE games SET state = state || $2::jsonb WHERE id = $1', [str(args, 'gameId'), JSON.stringify(obj(args, 'state'))]);
  },

  async updateFullGameState(args) {
    await query('UPDATE games SET state = $2::jsonb WHERE id = $1', [str(args, 'gameId'), JSON.stringify(obj(args, 'state'))]);
  },

  async autoAssignPlayer(args) {
    const email = str(args, 'email', 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Enter a valid email address.');
    const settings = await query<{ game_config: unknown }>('SELECT game_config FROM session_settings WHERE id = 1');
    const config = json<GameConfig | null>(settings[0]?.game_config) ?? DEFAULT_CONFIG;

    // assign_player_atomic seats the player, or creates this team game when every lobby is
    // full, all under one lock. Only a clash on the random game code needs a retry.
    for (let attempt = 0; attempt < 5; attempt++) {
      const newGame = { id: newId('team_'), code: generateGameCode(), config, state: createInitialGameState(config) };
      try {
        const rows = await query<{ r: unknown }>('SELECT assign_player_atomic($1, $2, $3::jsonb) AS r', [
          email,
          formatName(email),
          JSON.stringify(newGame),
        ]);
        return json<{ playerId: string; gameId: string; role: Role; teamName: string; teamNumber: number }>(rows[0].r);
      } catch (e) {
        if (!isUniqueViolation(e)) playerFacing(e);
      }
    }
    throw new ApiError(503, 'Could not create a team. Please try again.');
  },

  async createExpressGame(args) {
    const choice = roleChoice(args.choice);
    const expectedPlayers = Math.min(4, Math.max(1, Math.round(Number(args.expectedPlayers) || 1)));
    const role: Role = choice === 'random' ? ROLES[Math.floor(Math.random() * ROLES.length)] : choice;
    const playerId = newId('x_', 6);
    const config: GameConfig = { ...DEFAULT_CONFIG, mode: 'express', expectedPlayers };
    const startNow = expectedPlayers <= 1;

    for (let attempt = 0; attempt < 6; attempt++) {
      const code = generateGameCode();
      const gameId = newId('x_');
      const teamName = `Express ${code}`;
      const players: Record<string, Player> = {
        [playerId]: { id: playerId, name: 'Player', email: '', role, isAdmin: false, isBot: false, joinedAt: Date.now(), teamName, teamNumber: 1 },
      };
      const state = createInitialGameState(config);
      state.phase = 'onboarding';
      if (startNow) {
        for (const r of ROLES) if (r !== role) players[`bot_${r}`] = botPlayer(r, teamName, 1);
        state.phase = 'ordering';
        state.roundStartedAt = Date.now();
      }
      const rows = await query(
        `INSERT INTO games (id, code, host_id, config, state, players, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (code) DO NOTHING RETURNING id`,
        [gameId, code, playerId, JSON.stringify(config), JSON.stringify(state), JSON.stringify(players), Date.now()],
      );
      if (rows.length) return { gameId, playerId, role, started: startNow, code };
    }
    throw new ApiError(503, 'Could not create a game. Please try again.');
  },

  async findExpressGame(args) {
    const rows = await query<GameRow>(
      `SELECT ${GAME_COLS} FROM games WHERE code = $1 AND COALESCE(config->>'mode', '') = 'express'`,
      [str(args, 'code', 20).toUpperCase()],
    );
    return rows[0] ? forPlayers(rowToGame(rows[0])) : null;
  },

  async joinExpressGame(args) {
    const playerId = newId('x_', 6);
    const rows = await query<{ r: unknown }>('SELECT express_join($1, $2, $3) AS r', [str(args, 'code', 20), playerId, roleChoice(args.choice)]).catch(
      playerFacing,
    );
    return { ...json<{ gameId: string; role: Role; started: boolean }>(rows[0].r), playerId };
  },

  async startExpressGame(args) {
    await query('SELECT express_start($1, $2) AS r', [str(args, 'gameId'), str(args, 'playerId')]).catch(playerFacing);
  },
};

const adminCommands: Record<string, Handler> = {
  async verifyAdmin() {
    return true;
  },

  /** Champions Mode games only: Express games are facilitator-free and never listed. */
  async getAllGames() {
    const rows = await query<GameRow>(`SELECT ${GAME_COLS} FROM games WHERE COALESCE(config->>'mode', '') <> 'express' ORDER BY created_at, id`);
    return rows.map(rowToGame);
  },

  async getSessionSettings() {
    const rows = await query<{ registration_open: boolean; game_config: unknown }>('SELECT registration_open, game_config FROM session_settings WHERE id = 1');
    return { registrationOpen: rows[0]?.registration_open ?? true, gameConfig: json<GameConfig | null>(rows[0]?.game_config) ?? undefined };
  },

  async updateSessionSettings(args) {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (typeof args.registrationOpen === 'boolean') {
      params.push(args.registrationOpen);
      sets.push(`registration_open = $${params.length}`);
    }
    if (args.gameConfig !== undefined) {
      params.push(JSON.stringify(obj(args, 'gameConfig')));
      sets.push(`game_config = $${params.length}::jsonb`);
    }
    if (sets.length) await query(`UPDATE session_settings SET ${sets.join(', ')} WHERE id = 1`, params);
  },

  /** Fill empty roles with bots and start every game still in the lobby or onboarding. */
  async startAllGames() {
    const rows = await query<GameRow>(
      `SELECT ${GAME_COLS} FROM games WHERE COALESCE(config->>'mode', '') <> 'express' AND state->>'phase' IN ('lobby', 'onboarding')`,
    );
    for (const row of rows) {
      const game = rowToGame(row);
      const used = new Set(Object.values(game.players).map(p => p.role as Role).filter(Boolean));
      const first = Object.values(game.players)[0];
      const bots: Record<string, Player> = {};
      for (const role of ROLES.filter(r => !used.has(r))) {
        bots[`bot_${role}`] = botPlayer(role, first?.teamName ?? '', first?.teamNumber ?? 1, `bot_${role}@system`);
      }
      // Only a game that is still waiting gets started; a concurrent start is a no-op.
      await query(
        `UPDATE games SET players = players || $2::jsonb, state = state || $3::jsonb
         WHERE id = $1 AND state->>'phase' IN ('lobby', 'onboarding')`,
        [game.id, JSON.stringify(bots), JSON.stringify({ phase: 'ordering', roundStartedAt: Date.now() })],
      );
    }
    return { started: rows.length };
  },

  /**
   * Watchdog: once the order timer has run out, missing roles use the pass-through order and
   * the round is processed. Compare-and-set, so two admin tabs cannot process a round twice.
   */
  async submitBotOrdersAndProcess(args) {
    const loaded = await loadGame(str(args, 'gameId'));
    if (!loaded) return;
    const { state, config } = loaded.game;
    if (state.phase !== 'ordering' || state.paused) return;
    if (Date.now() - (state.roundStartedAt ?? 0) < (config.orderTimerSeconds ?? 30) * 1000) return;
    const done = (state.playersDoneOrdering ?? []) as Role[];
    if (ROLES.every(r => done.includes(r))) return;

    const stored = ((state as unknown as Record<string, unknown>).pendingOrders ?? {}) as Partial<Record<Role, number>>;
    const next = processRound(state, config, resolveOrders(state, stored));
    delete (next as unknown as Record<string, unknown>).pendingOrders;
    if (next.phase === 'ordering') next.roundStartedAt = Date.now();
    await casState(loaded.game.id, loaded.rawState, next);
  },

  async advanceFromSummary(args) {
    await query(`UPDATE games SET state = state || $2::jsonb WHERE id = $1 AND state->>'phase' = 'summary'`, [
      str(args, 'gameId'),
      JSON.stringify({ phase: 'ordering', roundStartedAt: Date.now(), playersDoneOrdering: [] }),
    ]);
  },

  async deleteAllGames() {
    await query(`DELETE FROM games WHERE COALESCE(config->>'mode', '') <> 'express'`);
  },

  async resetGameValues(args) {
    const loaded = await loadGame(str(args, 'gameId'));
    if (!loaded) return;
    const fresh = createInitialGameState(loaded.game.config);
    fresh.phase = 'ordering';
    await query('UPDATE games SET state = $2::jsonb WHERE id = $1', [loaded.game.id, JSON.stringify(fresh)]);
  },
};

export async function dispatch(cmd: string, args: Record<string, unknown>, adminPassword: string | null): Promise<unknown> {
  if (Object.hasOwn(adminCommands, cmd)) {
    if (!(await isAdmin(adminPassword))) throw new ApiError(401, 'Facilitator password required.');
    return adminCommands[cmd](args, { admin: true });
  }
  if (Object.hasOwn(publicCommands, cmd)) {
    const admin = adminPassword ? await isAdmin(adminPassword).catch(() => false) : false;
    return publicCommands[cmd](args, { admin });
  }
  throw new ApiError(404, `Unknown command ${cmd}`);
}
