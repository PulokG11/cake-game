# Changelog

Every release is a git tag. Roll back a file with
`git checkout <tag> -- <path>` then commit; roll back everything with `git revert`
of the release commit. Finding IDs (F-xx) refer to PRD v2 §9.4.

## v0.5.0-neon — Backend moved from Supabase to Neon

The Supabase project had been paused for inactivity, so the live site could not load
or save games. The backend now runs on Neon.

- **Database:** Neon project `cake-game` (`late-glitter-03957082`, Postgres 18,
  aws-ap-southeast-1). `db/schema.sql` carries over the tables and Postgres functions;
  the Supabase-only parts (anon grants, realtime publication) are gone.
- **API:** a Neon Function (`functions/api/index.ts`, commands in `lib/server/`) runs every
  read and write. The browser no longer talks to the database, so the open-database
  finding **F-01** is closed for Champions and Express alike: anonymous visitors can no
  longer list games, read player emails, or delete games.
- **Facilitator password** is checked on the server against a salted scrypt hash
  (`npm run admin:password`). It is no longer baked into the site's JavaScript, and the
  `NEXT_PUBLIC_ADMIN_PASSWORD` build secret is unused.
- **Fewer races:** Champions sign-in now creates a new team inside the same locked
  Postgres call that seats players, so two players arriving together can no longer each
  get a one-person team. The watchdog writes a round only if the game is unchanged since
  it read it, so two admin tabs cannot process the same round twice. Partial state
  updates are a single SQL merge instead of read-modify-write.
- **Live updates** poll the API (1.5 s in a game, 2.5 s for the admin list) instead of
  Supabase Realtime, and only re-render on change.
- `lib/supabase.ts` → `lib/api.ts` (same function names); `@supabase/supabase-js` removed.
- Tests: `scripts/test-api.mjs` runs 28 end-to-end API checks on the `dev` branch.

Rollback: `git checkout v0.4.0 -- .` and restore the Supabase project (it only needs
un-pausing in the Supabase dashboard), then push.

## v0.4.0 — Express Mode

The first screen now asks for a mode. The existing flow is unchanged and is now called
**Champions Mode** (`/champions`).

**Express Mode (`/express`)**
- No email and no facilitator: players start a game themselves and it runs itself.
- 1 to 4 people can play. Empty roles are played by AI bots (the same pass-through
  ordering policy as Champions bots). One player starts instantly with 3 bots.
- Role choice: Manufacturer, Distributor, Wholesaler, Retailer, or Random.
- Multi-player: the creator gets a 6-character code and invite link; joiners claim
  an open role (or Random). The game auto-starts when the expected number of humans
  has joined, or the host can start early and bots fill the rest.
- Round completion waits only for human players, so a solo game advances the moment
  the player submits.

**Backend:** `supabase/express_mode.sql` adds `express_join`, `express_start` and
`express_fill_and_start` (atomic role claiming under a row lock). Express games are
marked `config.mode = 'express'` and wait in phase `onboarding`, so the Champions
`assign_player_atomic` never places email players into them. The admin panel, Start All
and Delete All ignore Express games. Apply the SQL file after `schema.sql`.

**Other:** the "players submitted" counter counts humans only; results screen has a
Play again link in Express.

**Known limits:** Express games are never cleaned up automatically; the game is driven
by player browsers, so if every player closes their tab it stalls.

**Rollback:** `git revert` the v0.4.0 commit (restores the old home page). The SQL
functions are additive and harmless to leave; to remove:
`drop function express_join(text,text,text), express_start(text,text), express_fill_and_start(text);`

## v0.3.0 — Red Velvet & Black Forest redesign

Visual redesign only; no game rules, data or routes changed.

- **Palette:** red velvet crimson (primary), black-forest chocolate (header, round banner,
  scoreboard), cream-cheese frosting (backgrounds). Defined once in `tailwind.config.ts`:
  `cake` = velvet, `forest` = chocolate, `cream` = frosting. The stock `gray`, `green`,
  `amber`, `red` and `blue` scales are re-mapped (warm mocha, forest green, caramel gold,
  cherry scarlet, berry plum) so existing utility classes re-theme without per-file edits.
- **Type:** Playfair Display for headings and big numbers (lining numerals), DM Sans for
  body text, both self-hosted via `next/font`.
- **Brand:** new SVG logo mark + wordmark, favicon (`app/icon.svg`), three-tier cake hero
  illustration, chocolate-drip header edge, themed line icons per role replacing emoji
  (`components/brand/Brand.tsx`).
- **Screens:** home (hero, role chips, cost tiles), lobby, ordering (dark round banner),
  round summary, results (dark scoreboard card), admin overview and game views, admin login.
- **Charts:** role colours moved to `lib/theme.ts` (chocolate / velvet / forest green / gold).
- **Tutorial:** `public/tutorial.html` re-coloured, new fonts, emoji logo and role icons
  replaced with the same SVGs; closing-slide tagline contrast fixed.
- **Contrast:** the two lightest neutral text colours were darkened for readability.

**Rollback:** `git checkout v0.2.0 -- app components lib/theme.ts public/tutorial.html tailwind.config.ts`
(then delete `components/brand/` and `app/icon.svg`), or `git revert` the v0.3.0 commit.

## v0.2.0 — GitHub Pages deployment

Live at https://pulokg11.github.io/cake-game/ (deployed by `.github/workflows/pages.yml`
on every push to `main`; runs `npm test` before building).

- Static export (`output: 'export'`, `trailingSlash`, `basePath` from
  `NEXT_PUBLIC_BASE_PATH=/cake-game` set in CI only; local dev still serves at `/`).
- Dynamic routes replaced by query-param routes because Pages has no server:
  `/game/[gameId]` -> `/game?id=<id>`, `/admin/game/[gameId]` -> `/admin/game?id=<id>`.
  Old `/game/<id>` links no longer work.
- Raw `<a href>` links replaced with `next/link`; tutorial iframe path is base-path aware.
- New Supabase project `cake-game` (Mumbai, free tier) with the upstream schema and the
  sequence-based `assign_player_atomic`. Secrets `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ADMIN_PASSWORD` are GitHub Actions secrets.
  The admin password is a fresh value, not the upstream default.

**Security (unchanged from upstream, F-01):** RLS is disabled on `games` and
`session_settings`, and `NEXT_PUBLIC_*` values are embedded in the public JS bundle, so
the admin password is a browser gate only and anyone with the anon key can read or write
every row (including player emails). Fine for a workshop; not for real personal data.

**Rollback:** disable the workflow or `git revert` the v0.2.0 commit (restores the
dynamic routes and drops the export config). Backend: `drop table public.games,
public.session_settings; drop function assign_player_atomic(text, text);` on the
`cake-game` Supabase project.

## v0.1.0 — Release 0 (part 1): order capture and demand schedule

**Fixes F-03: missing-order policy**
- `pendingOrders` is now a sparse ledger. Previously the first submit wrote `0`
  for every other role, so those zeros were treated as submitted orders and the
  `incomingOrder` fallback never ran. Bot-filled teams cost 2.4-4.0x more as a result.
- One declared policy, `resolveOrders()` in `lib/gameLogic.ts`: a role with no
  submitted order orders its last incoming order (pass-through, the documented bot
  behaviour). A submitted 0 stays 0. Used by the player page (timeout and
  all-submitted paths) and the admin watchdog (`submitBotOrdersAndProcess`).
- Round completion is human-only (`allHumansSubmitted()`): bots never submit, so a
  team with bots now processes as soon as every human has submitted instead of
  always waiting out the timer.
- At timeout, a number the player typed but did not submit is now used (previously
  lost to a race inside a React state updater). An untouched field still falls back
  to pass-through, not 0.

**Fixes F-05: demand schedule parsing**
- `parseDemandSchedule()` ignores empty tokens, so a trailing comma or space no
  longer adds a 0 that repeats for the rest of the game.
- Any non-whole-number token (`abc`, `4.5`, `-2`) is rejected with an inline error
  and Save is disabled, instead of silently becoming 0.

**Added**
- `npm test` (vitest): 14 tests in `lib/gameLogic.test.ts`, including the guide's
  reference costs (pass-through $1,312, always-0 $1,488, round 1 at $48).

**Not changed (still open):** F-01 auth boundary, F-07/F-08 reset and Force Summary,
F-09 settings panel read-back, typed `0` replaced by defaults in the config editor,
watchdog's dead `playersDone` role comparison.

**Behaviour change to tell facilitators:** teams with bots finish rounds sooner, and
bot roles now order pass-through instead of 0, which removes the 2.4-4.0x cost
artifact. Bot-filled teams are still not directly comparable to all-human teams.

**Rollback:** `git checkout v0-baseline -- lib/gameLogic.ts lib/supabase.ts "app/game/[gameId]/page.tsx" app/admin/page.tsx`

## v0-baseline — Imported upstream

Unmodified copy of NarasimhaKamathB/Cake-game at commit 2f79697 (the commit the
PRD, TADD and Product Guide v2 were written against). Diff any later tag against
this to see exactly what changed.
