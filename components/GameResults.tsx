'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Game, ROLES, ROLE_LABELS, Role, RoleState } from '@/lib/types';
import { Card } from './ui/Card';
import { TutorialModal } from './TutorialModal';
import { CakeMark, RoleIcon } from './brand/Brand';
import { ROLE_COLORS, CHART } from '@/lib/theme';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function toArr(v: unknown): number[] {
  if (Array.isArray(v)) return v as number[];
  if (v && typeof v === 'object') return Object.values(v) as number[];
  return [];
}

// ─── Sparkline bar chart ──────────────────────────────────────────────────────

function Sparkline({
  label,
  values,
  color,
  alwaysShow = false,
}: {
  label: string;
  values: number[];
  color: string;
  alwaysShow?: boolean;
}) {
  const hasData = values.some(v => v > 0);
  if (!alwaysShow && !hasData) return null;

  const max = Math.max(...values, 1);
  return (
    <div className="mt-2">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex items-end gap-0.5 h-8">
        {values.map((v, i) => {
          const h = Math.round((v / max) * 32);
          return (
            <div
              key={i}
              className={`flex-1 rounded-sm ${color}`}
              style={{ height: `${Math.max(h, hasData ? 0 : 1)}px` }}
              title={`Round ${i + 1}: ${v}`}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── SVG Line chart ───────────────────────────────────────────────────────────

function LineChart({
  title,
  series,
}: {
  title: string;
  series: { role: Role; values: number[] }[];
}) {
  const W = 500, H = 160;
  const pl = 38, pr = 12, pt = 12, pb = 38;
  const chartW = W - pl - pr;
  const chartH = H - pt - pb;

  const maxLen = Math.max(...series.map(s => s.values.length), 2);
  const allVals = series.flatMap(s => s.values);
  const maxVal = Math.max(...allVals, 1);

  const xOf = (i: number) =>
    pl + (maxLen <= 1 ? chartW / 2 : (i / (maxLen - 1)) * chartW);
  const yOf = (v: number) =>
    pt + chartH - (v / maxVal) * chartH;

  const yTicks = [0, Math.round(maxVal / 2), maxVal];
  const xStep = Math.max(1, Math.ceil(maxLen / 8));
  const xTicks = Array.from({ length: maxLen }, (_, i) => i).filter(
    i => i % xStep === 0 || i === maxLen - 1,
  );

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-card p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-forest-600 mb-1">{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line x1={pl} y1={yOf(tick)} x2={pl + chartW} y2={yOf(tick)} stroke={CHART.grid} strokeWidth="1" />
            <text x={pl - 4} y={yOf(tick) + 3} textAnchor="end" fontSize="9" fill={CHART.tick}>{tick}</text>
          </g>
        ))}
        <line x1={pl} y1={pt} x2={pl} y2={pt + chartH} stroke={CHART.axis} strokeWidth="1" />
        <line x1={pl} y1={pt + chartH} x2={pl + chartW} y2={pt + chartH} stroke={CHART.axis} strokeWidth="1" />
        {xTicks.map(i => (
          <text key={i} x={xOf(i)} y={pt + chartH + 13} textAnchor="middle" fontSize="9" fill={CHART.tick}>
            W{i + 1}
          </text>
        ))}
        {series.map(({ role, values }) => {
          if (values.length === 0) return null;
          if (values.length === 1) {
            return <circle key={role} cx={xOf(0)} cy={yOf(values[0])} r="3" fill={ROLE_COLORS[role]} />;
          }
          const d = values
            .map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`)
            .join(' ');
          return (
            <path
              key={role} d={d}
              stroke={ROLE_COLORS[role]} strokeWidth="1.8"
              fill="none" strokeLinejoin="round" strokeLinecap="round"
            />
          );
        })}
        {ROLES.map((role, i) => (
          <g key={role} transform={`translate(${pl + i * 115}, ${H - 14})`}>
            <line x1="0" y1="0" x2="14" y2="0" stroke={ROLE_COLORS[role]} strokeWidth="2" />
            <text x="17" y="4" fontSize="9" fill={CHART.label}>{ROLE_LABELS[role]}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

type ChartConfig = { title: string; key: keyof RoleState };
const CHART_CONFIGS: ChartConfig[] = [
  { title: 'Orders Placed (per round)',          key: 'orderHistory' },
  { title: 'Inventory Position (end of round)',  key: 'inventoryHistory' },
  { title: 'Lost Sales (units, per round)',       key: 'lostSalesHistory' },
  { title: 'Units Expired / Wasted',             key: 'wastageHistory' },
];

// ─── Main component ───────────────────────────────────────────────────────────

interface GameResultsProps {
  game: Game;
  teamName?: string;
  /** Shows a Play again link (Express Mode). */
  playAgainHref?: string;
}

export function GameResults({ game, teamName, playAgainHref }: GameResultsProps) {
  const [showTutorial, setShowTutorial] = useState(false);
  const { state, config } = game;

  const teamTotal   = ROLES.reduce((s, r) => s + (state.roles[r]?.totalCost ?? 0), 0);
  const totalWasted = ROLES.reduce(
    (s, r) => s + toArr(state.roles[r]?.wastageHistory).reduce((a: number, v: number) => a + v, 0),
    0,
  );
  const totalLost = ROLES.reduce(
    (s, r) => s + toArr(state.roles[r]?.lostSalesHistory).reduce((a: number, v: number) => a + v, 0),
    0,
  );

  return (
    <div className="space-y-6">
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      <div className="text-center">
        <CakeMark size={56} className="mx-auto" />
        <h2 className="text-4xl font-extrabold text-forest-800 mt-2">Game Over</h2>
        {teamName && (
          <p className="font-display text-xl font-bold text-cake-600 mt-1">{teamName}</p>
        )}
        <p className="text-gray-500 mt-1">Final results after {config.totalRounds} rounds</p>
        <button
          onClick={() => setShowTutorial(true)}
          className="mt-2 text-sm text-cake-600 hover:text-cake-800 underline underline-offset-2"
        >
          Replay tutorial
        </button>
        {playAgainHref && (
          <div className="mt-4">
            <Link
              href={playAgainHref}
              className="inline-flex items-center rounded-xl bg-cake-600 hover:bg-cake-700 text-white font-semibold px-5 py-2.5 text-sm shadow-sm"
            >
              Play again →
            </Link>
          </div>
        )}
      </div>

      {/* Team totals */}
      <Card className="text-center !bg-forest-900 !border-forest-900 !shadow-lift py-7">
        {teamName && (
          <p className="text-xs text-cake-300 uppercase tracking-[0.2em] mb-1">{teamName}</p>
        )}
        <p className="text-sm text-cream-300">Total Team Cost</p>
        <p className="font-display text-6xl font-black text-cream-50 my-1 tabular">${teamTotal.toFixed(2)}</p>
        <div className="flex justify-center gap-6 text-sm text-cream-300/90 mt-3">
          <span>{totalWasted} units wasted</span>
          <span>{totalLost} units lost</span>
        </div>
      </Card>

      {/* Per-role breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROLES.map(role => {
          const rs = state.roles[role];
          if (!rs) return null;

          const invHistory      = toArr(rs.inventoryHistory);
          const wastageHistory  = toArr(rs.wastageHistory);
          const lostHistory     = toArr(rs.lostSalesHistory);
          const lostCostHistory = toArr(rs.lostSalesCostHistory);

          const totalWastedRole  = wastageHistory.reduce((s, v) => s + v, 0);
          const totalLostRole    = lostHistory.reduce((s, v) => s + v, 0);
          const totalLostCost    = lostCostHistory.length > 0
            ? lostCostHistory.reduce((s, v) => s + v, 0)
            : totalLostRole * (config.lostSalesCostPerUnit ?? 4);
          const totalWastageCost = totalWastedRole * config.wastageCostPerUnit;
          const holdingTotal     = Math.max(0, rs.totalCost - totalWastageCost - totalLostCost);

          return (
            <Card key={role}>
              <h3 className="flex items-center gap-2.5 font-display text-lg font-bold text-forest-800 mb-3">
                <span className="grid place-items-center h-9 w-9 rounded-xl text-white" style={{ background: ROLE_COLORS[role] }}>
                  <RoleIcon role={role} size={19} />
                </span>
                {ROLE_LABELS[role]}
              </h3>

              <div className="space-y-1 text-sm">
                <Row label="Total cost"      value={`$${rs.totalCost.toFixed(2)}`}           bold />
                <Row label="Holding cost"    value={`$${holdingTotal.toFixed(2)}`} />
                <Row label="Wastage cost"    value={`$${totalWastageCost.toFixed(2)}`}        color="text-red-600" />
                <Row label="Lost sales cost" value={`$${totalLostCost.toFixed(2)}`}           color="text-amber-600" />
                <Row label="Units wasted"    value={totalWastedRole}                          color="text-red-500" />
                <Row label="Lost sales"      value={totalLostRole}                            color="text-amber-500" />
              </div>

              {/* Sparklines — always show all three so they're comparable across roles */}
              <div className="mt-3 pt-3 border-t border-cream-200 space-y-1">
                <Sparkline
                  label="Inventory over rounds"
                  values={invHistory}
                  color="bg-forest-300"
                  alwaysShow
                />
                <Sparkline
                  label="Wastage per round"
                  values={wastageHistory}
                  color="bg-red-400"
                  alwaysShow
                />
                <Sparkline
                  label="Lost sales per round"
                  values={lostHistory}
                  color="bg-amber-300"
                  alwaysShow
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Full performance charts — all 4 metrics across all echelons */}
      <div className="space-y-3">
        <h3 className="font-bold text-cake-700 text-xs uppercase tracking-[0.16em]">
          Performance Charts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHART_CONFIGS.map(({ title, key }) => (
            <LineChart
              key={key}
              title={title}
              series={ROLES.map(role => ({
                role,
                values: toArr(state.roles[role]?.[key]),
              }))}
            />
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Shelf life: {config.expiryWeeks} rounds &nbsp;·&nbsp;
        Wastage: ${config.wastageCostPerUnit}/unit &nbsp;·&nbsp;
        Holding: ${config.holdingCostPerUnit}/unit/round &nbsp;·&nbsp;
        Lost sales: ${config.lostSalesCostPerUnit ?? 4}/unit
      </p>
    </div>
  );
}

function Row({
  label, value, bold, color,
}: {
  label: string;
  value: string | number;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`${bold ? 'font-bold' : ''} ${color ?? 'text-gray-800'}`}>{value}</span>
    </div>
  );
}
