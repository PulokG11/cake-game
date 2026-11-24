-- =============================================================================
-- Cake Game schema for Neon Postgres. Idempotent: `npm run db:setup` applies it.
-- Ported from supabase/*.sql (schema, assign_player_atomic with the team-number
-- sequence, Express Mode). Only the Neon Function talks to this database; the
-- browser never holds a credential, so the Supabase anon grants and the
-- realtime publication are gone.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.games (
  id          TEXT        PRIMARY KEY,
  code        TEXT        UNIQUE NOT NULL,
  host_id     TEXT,
  config      JSONB       NOT NULL DEFAULT '{}',
  state       JSONB       NOT NULL DEFAULT '{}',
  players     JSONB       NOT NULL DEFAULT '{}',
  created_at  BIGINT      NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS games_code_idx ON public.games (code);

CREATE TABLE IF NOT EXISTS public.session_settings (
  id                  INT     PRIMARY KEY DEFAULT 1,
  registration_open   BOOLEAN NOT NULL DEFAULT TRUE,
  -- Facilitator-configured game parameters for new games; NULL means DEFAULT_CONFIG.
  game_config         JSONB   DEFAULT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.session_settings (id, registration_open)
VALUES (1, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Facilitator password, stored as a salted scrypt hash. Set it with `npm run admin:password`.
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id             INT         PRIMARY KEY DEFAULT 1,
  password_hash  TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_single_row CHECK (id = 1)
);

CREATE SEQUENCE IF NOT EXISTS team_number_seq START 1 INCREMENT 1 NO CYCLE;

-- ── Champions Mode: atomic seat assignment ─────────────────────────────────────
-- Locks session_settings FOR UPDATE so concurrent sign-ins are serialized. When no
-- lobby game has a free seat it creates the new team game from p_new_game (id, code,
-- config, initial state, built by the API) while the lock is still held, so two
-- simultaneous sign-ins can no longer each create a one-person team.
DROP FUNCTION IF EXISTS assign_player_atomic(TEXT, TEXT);
CREATE OR REPLACE FUNCTION assign_player_atomic(p_email TEXT, p_name TEXT, p_new_game JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_email      TEXT    := LOWER(TRIM(p_email));
  v_player_id  TEXT    := REGEXP_REPLACE(LOWER(TRIM(p_email)), '[^a-z0-9]', '_', 'g');
  v_reg_open   BOOLEAN;
  v_game_row   RECORD;
  v_key        TEXT;
  v_val        JSONB;
  v_used       TEXT[];
  v_role       TEXT;
  v_team_name  TEXT;
  v_team_num   INT;
  v_game_id    TEXT;
  v_player_obj JSONB;
  v_i          INT;
  v_role_order TEXT[] := ARRAY['manufacturer','distributor','wholesaler','retailer'];
  v_team_names TEXT[] := ARRAY[
    'Crème de la Crème','Rolling Scones','Batter Up','The Glazed Ones',
    'Flour Power','Rise & Shine','Tier One Tiers','Sweet Supply',
    'The Fondant Five','Icing Icons','Layered Leaders','Whisk Takers',
    'Custard Crew','The Piping Hot','Shelf Life Squad'
  ];
BEGIN
  SELECT registration_open INTO v_reg_open FROM session_settings WHERE id = 1 FOR UPDATE;

  -- 1. Existing assignment for this email in any active game
  FOR v_game_row IN
    SELECT id, players FROM games
    WHERE state->>'phase' IN ('lobby','onboarding','ordering','processing','summary')
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    FOR v_key, v_val IN SELECT key, value FROM jsonb_each(v_game_row.players) LOOP
      IF v_val->>'email' = v_email THEN
        RETURN jsonb_build_object(
          'playerId', v_key, 'gameId', v_game_row.id, 'role', v_val->>'role',
          'teamName', COALESCE(v_val->>'teamName', ''),
          'teamNumber', COALESCE((v_val->>'teamNumber')::INT, 1));
      END IF;
    END LOOP;
  END LOOP;

  -- 2. Registration gate
  IF NOT COALESCE(v_reg_open, TRUE) THEN
    RAISE EXCEPTION 'Registration is currently closed. Contact your session organiser.';
  END IF;

  -- 3. First lobby game with a free human seat
  v_game_id := NULL;
  FOR v_game_row IN
    SELECT id, players FROM games WHERE state->>'phase' = 'lobby' ORDER BY created_at ASC FOR UPDATE
  LOOP
    v_used := ARRAY[]::TEXT[];
    FOR v_key, v_val IN SELECT key, value FROM jsonb_each(v_game_row.players) LOOP
      IF COALESCE((v_val->>'isBot')::BOOLEAN, FALSE) = FALSE THEN
        v_used := v_used || ARRAY[v_val->>'role'];
      END IF;
    END LOOP;

    IF array_length(v_used, 1) IS NULL OR array_length(v_used, 1) < 4 THEN
      v_role := NULL;
      FOR v_i IN 1..4 LOOP
        IF NOT (v_role_order[v_i] = ANY(COALESCE(v_used, ARRAY[]::TEXT[]))) THEN
          v_role := v_role_order[v_i];
          EXIT;
        END IF;
      END LOOP;

      v_team_name := NULL;
      v_team_num  := NULL;
      FOR v_key, v_val IN SELECT key, value FROM jsonb_each(v_game_row.players) LOOP
        IF COALESCE((v_val->>'isBot')::BOOLEAN, FALSE) = FALSE THEN
          v_team_name := v_val->>'teamName';
          v_team_num  := (v_val->>'teamNumber')::INT;
          EXIT;
        END IF;
      END LOOP;

      v_game_id := v_game_row.id;
      EXIT;
    END IF;
  END LOOP;

  -- 4a. Join it with a single atomic write
  IF v_game_id IS NOT NULL THEN
    v_player_obj := jsonb_build_object(
      'id', v_player_id, 'name', p_name, 'email', v_email, 'role', v_role,
      'isAdmin', FALSE, 'isBot', FALSE,
      'joinedAt', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      'teamName', COALESCE(v_team_name, ''), 'teamNumber', COALESCE(v_team_num, 1));
    UPDATE games SET players = players || jsonb_build_object(v_player_id, v_player_obj) WHERE id = v_game_id;
    RETURN jsonb_build_object(
      'playerId', v_player_id, 'gameId', v_game_id, 'role', v_role,
      'teamName', COALESCE(v_team_name, ''), 'teamNumber', COALESCE(v_team_num, 1));
  END IF;

  -- 4b. No open seat: create a new team, numbered by the sequence (unique under concurrency).
  -- A clash on the generated game code raises unique_violation; the API retries with a new code.
  v_team_num  := nextval('team_number_seq');
  v_team_name := v_team_names[((v_team_num - 1) % 15) + 1];
  v_player_obj := jsonb_build_object(
    'id', v_player_id, 'name', p_name, 'email', v_email, 'role', 'manufacturer',
    'isAdmin', FALSE, 'joinedAt', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    'teamName', v_team_name, 'teamNumber', v_team_num);
  INSERT INTO games (id, code, host_id, config, state, players, created_at)
  VALUES (p_new_game->>'id', p_new_game->>'code', v_player_id, p_new_game->'config', p_new_game->'state',
          jsonb_build_object(v_player_id, v_player_obj), (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT);
  RETURN jsonb_build_object(
    'playerId', v_player_id, 'gameId', p_new_game->>'id', 'role', 'manufacturer',
    'teamName', v_team_name, 'teamNumber', v_team_num);
END;
$$;

-- ── Express Mode ───────────────────────────────────────────────────────────────
-- Express games carry config.mode = 'express' and wait in phase 'onboarding'
-- (not 'lobby'), so assign_player_atomic never seats Champions players in them.
CREATE OR REPLACE FUNCTION express_fill_and_start(p_game_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  g         RECORD;
  v_players JSONB;
  v_team    TEXT;
  r         TEXT;
  v_now     BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
BEGIN
  SELECT * INTO g FROM games WHERE id = p_game_id FOR UPDATE;
  v_players := g.players;
  SELECT e.value->>'teamName' INTO v_team FROM jsonb_each(v_players) e LIMIT 1;

  FOREACH r IN ARRAY ARRAY['manufacturer','distributor','wholesaler','retailer'] LOOP
    IF NOT EXISTS (SELECT 1 FROM jsonb_each(v_players) e WHERE e.value->>'role' = r) THEN
      v_players := v_players || jsonb_build_object('bot_' || r, jsonb_build_object(
        'id', 'bot_' || r, 'name', 'Bot (' || initcap(r) || ')',
        'email', '', 'role', r, 'isBot', TRUE, 'isAdmin', FALSE,
        'joinedAt', v_now, 'teamName', COALESCE(v_team, ''), 'teamNumber', 1));
    END IF;
  END LOOP;

  UPDATE games
  SET players = v_players,
      state = state || jsonb_build_object('phase', 'ordering', 'roundStartedAt', v_now,
                                          'playersDoneOrdering', '[]'::jsonb)
  WHERE id = p_game_id;
END;
$$;

CREATE OR REPLACE FUNCTION express_join(p_code TEXT, p_player_id TEXT, p_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  g          RECORD;
  v_taken    TEXT[];
  v_free     TEXT[];
  v_role     TEXT;
  v_team     TEXT;
  v_humans   INT;
  v_expected INT;
  v_started  BOOLEAN := FALSE;
BEGIN
  SELECT * INTO g FROM games
  WHERE code = UPPER(TRIM(p_code)) AND COALESCE(config->>'mode', '') = 'express'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not found. Check the code and try again.'; END IF;

  IF g.players ? p_player_id THEN
    RETURN jsonb_build_object('gameId', g.id, 'role', g.players->p_player_id->>'role',
                              'started', g.state->>'phase' <> 'onboarding');
  END IF;
  IF g.state->>'phase' <> 'onboarding' THEN RAISE EXCEPTION 'This game has already started.'; END IF;

  v_taken := ARRAY(SELECT e.value->>'role' FROM jsonb_each(g.players) e);
  v_free  := ARRAY(SELECT x FROM unnest(ARRAY['manufacturer','distributor','wholesaler','retailer']) x
                   WHERE NOT (x = ANY(v_taken)));
  IF COALESCE(array_length(v_free, 1), 0) = 0 THEN RAISE EXCEPTION 'This game is full.'; END IF;

  IF LOWER(p_role) = 'random' THEN
    v_role := v_free[1 + FLOOR(RANDOM() * array_length(v_free, 1))::INT];
  ELSIF LOWER(p_role) = ANY(v_free) THEN
    v_role := LOWER(p_role);
  ELSE
    RAISE EXCEPTION 'That role is already taken. Pick another.';
  END IF;

  SELECT e.value->>'teamName' INTO v_team FROM jsonb_each(g.players) e LIMIT 1;
  UPDATE games SET players = players || jsonb_build_object(p_player_id, jsonb_build_object(
    'id', p_player_id, 'name', 'Player', 'email', '', 'role', v_role, 'isBot', FALSE,
    'isAdmin', FALSE, 'joinedAt', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    'teamName', COALESCE(v_team, ''), 'teamNumber', 1))
  WHERE id = g.id;

  SELECT COUNT(*) + 1 INTO v_humans FROM jsonb_each(g.players) e
  WHERE COALESCE((e.value->>'isBot')::BOOLEAN, FALSE) = FALSE;
  v_expected := COALESCE((g.config->>'expectedPlayers')::INT, 4);
  IF v_humans >= v_expected THEN
    PERFORM express_fill_and_start(g.id);
    v_started := TRUE;
  END IF;

  RETURN jsonb_build_object('gameId', g.id, 'role', v_role, 'started', v_started);
END;
$$;

CREATE OR REPLACE FUNCTION express_start(p_game_id TEXT, p_player_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE g RECORD;
BEGIN
  SELECT * INTO g FROM games
  WHERE id = p_game_id AND COALESCE(config->>'mode', '') = 'express' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not found.'; END IF;
  IF g.host_id <> p_player_id THEN RAISE EXCEPTION 'Only the player who created the game can start it.'; END IF;
  IF g.state->>'phase' = 'onboarding' THEN PERFORM express_fill_and_start(g.id); END IF;
  RETURN jsonb_build_object('gameId', g.id, 'started', TRUE);
END;
$$;
