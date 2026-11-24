// End-to-end checks of the Cake Game API against a NON-PRODUCTION Neon branch.
// It sets a throwaway facilitator password on that branch and deletes every game it made.
// Run: node --env-file=.env.dev.local scripts/test-api.mjs   (with `npm run api:dev` serving the same branch)
import { randomBytes, scryptSync } from 'node:crypto';
import { Pool } from '@neondatabase/serverless';

const API = (process.env.API_URL ?? 'http://localhost:8788').replace(/\/+$/, '');
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL (of a test branch) is required');
if (process.env.ALLOW_PROD !== '1' && /ep-damp-poetry/.test(url)) throw new Error('Refusing to run against the production branch');

const pool = new Pool({ connectionString: url });
const password = 'test-' + randomBytes(9).toString('base64url');
const salt = randomBytes(16);
await pool.query(
  `INSERT INTO admin_settings (id, password_hash) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [`scrypt$${salt.toString('base64')}$${scryptSync(password, salt, 32).toString('base64')}`],
);
await pool.query('UPDATE session_settings SET registration_open = TRUE WHERE id = 1');
await new Promise(r => setTimeout(r, 16_000)); // let the server's 15 s password cache expire

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : ` ${JSON.stringify(detail)?.slice(0, 400)}`}`);
  if (!ok) failures++;
};

async function rpc(cmd, args = {}, admin = false) {
  const res = await fetch(`${API}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', ...(admin ? { 'x-admin-password': password } : {}) },
    body: JSON.stringify({ cmd, args }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: body.ok === true, data: body.data, error: body.error, cors: res.headers.get('access-control-allow-origin') };
}

const stamp = Date.now().toString(36);
const madeExpress = [];
try {
  const health = await fetch(`${API}/health`).then(r => r.json());
  check('health', health.ok === true, health);
  const pre = await rpc('getGame', { gameId: 'nope' });
  check('CORS allows the local dev origin', pre.cors === 'http://localhost:3000', pre.cors);

  // ── Facilitator auth ────────────────────────────────────────────────────────
  const anon = await rpc('getAllGames');
  check('facilitator commands need the password', anon.status === 401, anon);
  const wrong = await fetch(`${API}/rpc`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': 'wrong' }, body: JSON.stringify({ cmd: 'verifyAdmin' }) });
  check('a wrong password is refused', wrong.status === 401, wrong.status);
  check('the right password works', (await rpc('verifyAdmin', {}, true)).ok);

  // ── Express Mode ────────────────────────────────────────────────────────────
  const solo = await rpc('createExpressGame', { choice: 'retailer', expectedPlayers: 1 });
  madeExpress.push(solo.data?.gameId);
  check('solo Express game starts at once', solo.ok && solo.data.started === true && solo.data.role === 'retailer', solo);
  const soloGame = await rpc('getGame', { gameId: solo.data.gameId });
  check('solo Express game has 3 bots and is ordering', Object.keys(soloGame.data.players).length === 4 && soloGame.data.state.phase === 'ordering', soloGame.data?.state?.phase);

  const host = await rpc('createExpressGame', { choice: 'manufacturer', expectedPlayers: 3 });
  madeExpress.push(host.data?.gameId);
  check('3-player Express game waits in onboarding', host.ok && host.data.started === false, host);
  const found = await rpc('findExpressGame', { code: host.data.code.toLowerCase() });
  check('find by code (case-insensitive)', found.ok && found.data?.id === host.data.gameId, found);
  const taken = await rpc('joinExpressGame', { code: host.data.code, choice: 'manufacturer' });
  check('a taken role is refused with a readable message', taken.status === 409 && /already taken/.test(taken.error), taken);
  const second = await rpc('joinExpressGame', { code: host.data.code, choice: 'random' });
  check('second player joins with a random free role', second.ok && second.data.role !== 'manufacturer' && second.data.started === false, second);
  const notHost = await rpc('startExpressGame', { gameId: host.data.gameId, playerId: second.data.playerId });
  check('only the host can start', notHost.status === 409, notHost);
  const started = await rpc('startExpressGame', { gameId: host.data.gameId, playerId: host.data.playerId });
  const hostGame = await rpc('getGame', { gameId: host.data.gameId });
  check('host start fills bots and begins ordering', started.ok && hostGame.data.state.phase === 'ordering' && Object.keys(hostGame.data.players).length === 4, hostGame.data?.state?.phase);
  const late = await rpc('joinExpressGame', { code: host.data.code, choice: 'random' });
  check('joining a started game is refused', late.status === 409, late);

  // ── Champions Mode ──────────────────────────────────────────────────────────
  const emails = [1, 2, 3, 4, 5].map(i => `tester${i}.${stamp}@example.com`);
  const seats = [];
  for (const e of emails) seats.push(await rpc('autoAssignPlayer', { email: e }));
  check('five sign-ins all succeed', seats.every(s => s.ok), seats.map(s => s.error));
  const firstTeam = seats.slice(0, 4).map(s => s.data.gameId);
  check('first four share one team with four different roles', new Set(firstTeam).size === 1 && new Set(seats.slice(0, 4).map(s => s.data.role)).size === 4, seats.map(s => s.data));
  check('the fifth starts a new team', seats[4].data.gameId !== firstTeam[0] && seats[4].data.role === 'manufacturer', seats[4].data);
  const again = await rpc('autoAssignPlayer', { email: emails[1].toUpperCase() });
  check('signing in again returns the same seat', again.data?.gameId === seats[1].data.gameId && again.data?.playerId === seats[1].data.playerId, again);
  const badEmail = await rpc('autoAssignPlayer', { email: 'not-an-email' });
  check('invalid email is refused', badEmail.status === 400, badEmail);

  const publicView = await rpc('getGame', { gameId: firstTeam[0] });
  check('players do not see each other’s emails', Object.values(publicView.data.players).every(p => p.email === ''), publicView.data.players);
  const adminView = await rpc('getGame', { gameId: firstTeam[0] }, true);
  check('the facilitator does', Object.values(adminView.data.players).some(p => p.email === emails[0]), adminView.data?.players);

  const list = await rpc('getAllGames', {}, true);
  check('facilitator list has the Champions games but no Express games', list.ok && list.data.some(g => g.id === firstTeam[0]) && !list.data.some(g => madeExpress.includes(g.id)), list.data?.length);

  await rpc('updateSessionSettings', { registrationOpen: false }, true);
  const closed = await rpc('autoAssignPlayer', { email: `late.${stamp}@example.com` });
  check('closed registration is explained to the player', closed.status === 409 && /Registration is currently closed/.test(closed.error), closed);
  const settings = await rpc('getSessionSettings', {}, true);
  check('settings read back', settings.data?.registrationOpen === false, settings.data);
  await rpc('updateSessionSettings', { registrationOpen: true }, true);

  const startAll = await rpc('startAllGames', {}, true);
  const team2 = await rpc('getGame', { gameId: seats[4].data.gameId }, true);
  check('start all: the one-person team gets three bots and starts ordering', startAll.ok && team2.data.state.phase === 'ordering' && Object.values(team2.data.players).filter(p => p.isBot).length === 3, team2.data?.state?.phase);

  // Round processing by the watchdog once the timer has run out
  const before = (await rpc('getGame', { gameId: firstTeam[0] }, true)).data.state;
  await rpc('updateGameState', { gameId: firstTeam[0], state: { roundStartedAt: Date.now() - 10 * 60_000 } });
  const [p1, p2] = await Promise.all([
    rpc('submitBotOrdersAndProcess', { gameId: firstTeam[0] }, true),
    rpc('submitBotOrdersAndProcess', { gameId: firstTeam[0] }, true),
  ]);
  const after = (await rpc('getGame', { gameId: firstTeam[0] }, true)).data.state;
  check('two watchdogs at once advance the round exactly once', p1.ok && p2.ok && after.currentRound === before.currentRound + 1, { before: before.currentRound, after: after.currentRound });

  const reset = await rpc('resetGameValues', { gameId: firstTeam[0] }, true);
  const afterReset = (await rpc('getGame', { gameId: firstTeam[0] }, true)).data.state;
  check('reset puts the game back at the start, ordering', reset.ok && afterReset.phase === 'ordering' && afterReset.currentRound === before.currentRound, afterReset.currentRound);
} finally {
  const del = await rpc('deleteAllGames', {}, true);
  check('delete all Champions games (cleanup)', del.ok, del);
  await pool.query(`DELETE FROM games WHERE id = ANY($1)`, [madeExpress.filter(Boolean)]);
  await pool.end();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
