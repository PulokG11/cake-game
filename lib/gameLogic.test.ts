import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  processRound,
  resolveOrders,
  allHumansSubmitted,
  parseDemandSchedule,
  getTotalTeamCost,
} from './gameLogic';
import { DEFAULT_CONFIG, Player, ROLES, Role } from './types';

const player = (id: string, isBot = false): Player => ({
  id, name: id, email: `${id}@x`, role: null, isAdmin: false, isBot, joinedAt: 0,
});

function playGame(orderFor: (state: ReturnType<typeof createInitialGameState>, role: Role) => number) {
  let state = createInitialGameState(DEFAULT_CONFIG);
  for (let r = 0; r < DEFAULT_CONFIG.totalRounds; r++) {
    const orders = {} as Record<Role, number>;
    for (const role of ROLES) orders[role] = orderFor(state, role);
    state = processRound(state, DEFAULT_CONFIG, orders);
  }
  return getTotalTeamCost(state.roles);
}

describe('resolveOrders (F-03)', () => {
  const state = createInitialGameState(DEFAULT_CONFIG);
  state.roles.retailer.incomingOrder = 8;
  state.roles.wholesaler.incomingOrder = 6;
  state.roles.distributor.incomingOrder = 5;
  state.roles.manufacturer.incomingOrder = 4;

  it('uses pass-through for roles that have not submitted, never 0', () => {
    const orders = resolveOrders(state, { manufacturer: 10 });
    expect(orders).toEqual({ manufacturer: 10, distributor: 5, wholesaler: 6, retailer: 8 });
  });

  it('keeps a genuinely submitted 0', () => {
    expect(resolveOrders(state, { retailer: 0 }).retailer).toBe(0);
  });

  it('falls back when nothing was submitted or the value is invalid', () => {
    expect(resolveOrders(state, undefined).retailer).toBe(8);
    expect(resolveOrders(state, { retailer: -3 }).retailer).toBe(8);
    expect(resolveOrders(state, { retailer: NaN }).retailer).toBe(8);
  });

  it('pass-through for all four roles over 20 rounds costs $1,312 (guide §5)', () => {
    expect(playGame((s, role) => resolveOrders(s, {})[role])).toBe(1312);
  });

  it('always ordering 0 costs $1,488 (guide §5, engine sanity)', () => {
    expect(playGame(() => 0)).toBe(1488);
  });

  it('round 1 with every role ordering 4 costs the team $48 (guide §4)', () => {
    const next = processRound(createInitialGameState(DEFAULT_CONFIG), DEFAULT_CONFIG, resolveOrders(state, { retailer: 4, wholesaler: 4, distributor: 4, manufacturer: 4 }));
    expect(getTotalTeamCost(next.roles)).toBe(48);
  });
});

describe('allHumansSubmitted (F-03)', () => {
  const players = { a: player('a'), b: player('b'), bot_x: player('bot_x', true) };

  it('ignores bots when checking completion', () => {
    expect(allHumansSubmitted(players, ['a', 'b'])).toBe(true);
  });
  it('is false while a human is still missing', () => {
    expect(allHumansSubmitted(players, ['a'])).toBe(false);
  });
  it('is false when there are no humans', () => {
    expect(allHumansSubmitted({ bot_x: player('bot_x', true) }, [])).toBe(false);
  });
});

describe('parseDemandSchedule (F-05)', () => {
  it('parses a normal schedule', () => {
    expect(parseDemandSchedule('4, 4, 8, 12')).toEqual({ values: [4, 4, 8, 12] });
  });
  it('tolerates a trailing comma/space instead of adding a 0', () => {
    expect(parseDemandSchedule('4, 8, 12, ').values).toEqual([4, 8, 12]);
    expect(parseDemandSchedule('4, 8, 12,').values).toEqual([4, 8, 12]);
    expect(parseDemandSchedule(' ,4,,8 ').values).toEqual([4, 8]);
  });
  it('keeps a legitimate 0', () => {
    expect(parseDemandSchedule('4, 0, 8').values).toEqual([4, 0, 8]);
  });
  it('rejects non-numeric, decimal and negative tokens', () => {
    for (const bad of ['4, abc, 8', '4, 4.5', '4, -2', '4, 1e3']) {
      const r = parseDemandSchedule(bad);
      expect(r.error).toBeTruthy();
      expect(r.values).toEqual([]);
    }
  });
  it('rejects an empty schedule', () => {
    expect(parseDemandSchedule('  , ').error).toBeTruthy();
  });
});
