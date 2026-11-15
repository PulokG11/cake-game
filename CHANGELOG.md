# Changelog

Every release is a git tag. Roll back a file with
`git checkout <tag> -- <path>` then commit; roll back everything with `git revert`
of the release commit. Finding IDs (F-xx) refer to PRD v2 §9.4.

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
