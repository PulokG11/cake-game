-- Express Mode: atomic role claiming and auto-start. Run after schema.sql.
-- Express games carry config.mode = 'express' and wait in phase 'onboarding'
-- (not 'lobby'), so the Champions assign_player_atomic never places email
-- players into them.

CREATE OR REPLACE FUNCTION express_fill_and_start(p_game_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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
SECURITY DEFINER
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
SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION express_join(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION express_start(TEXT, TEXT) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION express_fill_and_start(TEXT) FROM PUBLIC, anon, authenticated;
