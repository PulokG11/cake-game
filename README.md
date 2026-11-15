# Cake Game

A facilitated, real-time team simulation of a perishable supply chain. Four players (manufacturer, distributor, wholesaler, retailer) order cakes from upstream every round while balancing holding cost, expiry waste and lost sales. It is designed to make the bullwhip effect and the cost of perishability visible in a workshop setting.

**Play it: https://pulokg11.github.io/cake-game/**
**Facilitator panel: https://pulokg11.github.io/cake-game/admin/**

Repository: https://github.com/PulokG11/cake-game

## How the game works

- Goods flow Manufacturer → Distributor → Wholesaler → Retailer → Customer. Orders flow the other way.
- Each round every player enters one whole-number order within a 30-second timer. Players only see their own stage.
- Stock expires after 3 rounds at each stage and the oldest stock is sold first (FIFO).
- Unmet demand is lost, not backlogged.
- The team with the lowest total cost over 20 rounds wins. There is no revenue or profit.

| Default setting | Value |
|---|---|
| Rounds | 20 |
| Starting stock per role | 12 units (spread over three ages) |
| Shelf life | 3 rounds |
| Holding cost | $0.50 per unit left after sales |
| Waste cost | $2 per unit that expires |
| Lost-sales cost | $4 per unit of unmet demand |
| Customer demand | 4, 4, 8, 12, 16, then 20 for the rest |
| Order timer | 30 seconds |

If a role has not submitted when the timer ends (a bot, or a slow teammate), it orders whatever it was last asked for. A submitted 0 stays 0. Teams with bots finish a round as soon as every human has submitted.

## Two ways to play

- **Express Mode** (`/express/`): no email, no facilitator. Play solo or with up to 3 friends via a share code; AI bots fill empty roles. Pick a role or choose Random.
- **Champions Mode** (`/champions/`): the facilitated workshop with email sign-in and four-person teams, described below.

## For facilitators (Champions Mode)

1. Open the facilitator panel and review the game configuration (rounds, costs, demand schedule, timer). Changes apply to new teams only.
2. Share the player link. Players enter an email and are auto-assigned a team and role.
3. Use **Start All Games** to fill empty roles with bots and begin. Keep the admin tab open while games run, because its watchdog advances stalled rounds.
4. Debrief with the final results screen. There is no export yet, so agree how to capture results before resetting.

The Product Guide in this folder covers facilitation, troubleshooting and reference scores in detail.

## Tech stack

Next.js 15 (static export), React 19, Tailwind CSS, TypeScript, Supabase (Postgres + Realtime), hosted on GitHub Pages. The look is a red velvet / black forest theme (Playfair Display + DM Sans, inline SVG logo and illustrations); its palette lives in `tailwind.config.ts` and `lib/theme.ts`. The rules engine in `lib/gameLogic.ts` is a pure function covered by tests.

## Run locally

```bash
cp .env.example .env.local   # add your Supabase URL and anon key
npm install
npm run dev                  # http://localhost:3000
npm test                     # game-logic tests
```

To set up a fresh Supabase project, run `supabase/schema.sql` and then `supabase/fix_team_number_sequence.sql` in the SQL editor.

## Deployment

Pushing to `main` runs `.github/workflows/pages.yml`: install, test, build a static export, then publish to GitHub Pages. Build-time settings come from these repository secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ADMIN_PASSWORD`

## Project structure

```
app/            Pages: join (/), lobby (/assigned), game (/game?id=), admin (/admin, /admin/game?id=)
components/     Role panel, inventory age buckets, weekly summary, results, tutorial, brand (logo, illustrations, role icons)
lib/            Game rules (gameLogic.ts), types, Supabase client and helpers
public/         Animated tutorial (tutorial.html)
supabase/       Database schema and the atomic join function
.github/        Pages deployment workflow
```

## Versions

Every release is a git tag; see [CHANGELOG.md](CHANGELOG.md) for what changed and how to roll back.

| Tag | What it is |
|---|---|
| `v0-baseline` | Untouched upstream code |
| `v0.1.0` | Fixes for missing-order handling (F-03) and demand-schedule parsing (F-05) |
| `v0.2.0` | GitHub Pages deployment |
| `v0.3.0` | Red velvet / black forest redesign |
| `v0.4.0` | Express Mode (solo/bots, no email, no facilitator) |

## Known limitations

- Row-level security is off and the admin password is a browser-side gate, so this is suitable for workshops but not for real personal data.
- The watchdog that advances stalled rounds runs in the open admin tab, not on a server.
- Still open from the PRD/TADD findings: access control (F-01), reset and Force Summary behaviour (F-07, F-08), settings panel read-back (F-09), results export, observer mode and a bullwhip chart.

## Documents

- `Cake_Game_Product_Guide_v2.docx`: how to play and facilitate
- `Cake_Game_PRD_v2.docx`: requirements, findings register and roadmap
- `Cake_Game_TADD_v2.docx`: architecture and technical design
- `HANDOFF.md`: notes carried over from the upstream project
