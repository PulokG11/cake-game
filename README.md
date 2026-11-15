# Cake Game

A facilitated multiplayer supply-chain simulation with perishable stock (manufacturer,
distributor, wholesaler, retailer). Built with Next.js, Tailwind and Supabase.

Live: https://pulokg11.github.io/cake-game/ — admin at `/admin/`

## Develop

```bash
cp .env.example .env.local   # fill in Supabase URL + anon key
npm install
npm run dev                  # http://localhost:3000
npm test                     # game-logic tests
```

## Deploy

Pushing to `main` builds a static export and publishes it to GitHub Pages
(`.github/workflows/pages.yml`). Build-time config comes from the repo secrets
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`NEXT_PUBLIC_ADMIN_PASSWORD`. To set up a fresh Supabase project, run the SQL in
`supabase/` (`schema.sql`, then `fix_team_number_sequence.sql`).

## Docs

Product Guide, PRD and TADD (v2) are in this folder. See `CHANGELOG.md` for releases and
rollback steps, and `HANDOFF.md` for the upstream project notes.
