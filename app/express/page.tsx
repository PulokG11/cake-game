'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createExpressGame,
  findExpressGame,
  joinExpressGame,
  ExpressResult,
  RoleChoice,
} from '@/lib/api';
import { Game, Role } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RolePicker } from '@/components/RolePicker';
import { TutorialModal } from '@/components/TutorialModal';
import { BoltIcon } from '@/components/brand/Brand';

type View = 'menu' | 'create' | 'join';

function ExpressContent() {
  const router = useRouter();
  const codeParam = (useSearchParams().get('code') ?? '').toUpperCase();

  const [view, setView] = useState<View>(codeParam ? 'join' : 'menu');
  const [players, setPlayers] = useState(1);
  const [choice, setChoice] = useState<RoleChoice>('random');
  const [code, setCode] = useState(codeParam);
  const [found, setFound] = useState<Game | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (codeParam) void lookUp(codeParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enter(r: ExpressResult) {
    sessionStorage.setItem('playerId', r.playerId);
    sessionStorage.setItem('gameId', r.gameId);
    sessionStorage.setItem('role', r.role);
    sessionStorage.removeItem('email');
    router.push(r.started ? `/game?id=${r.gameId}` : `/express/lobby?id=${r.gameId}`);
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function lookUp(c: string) {
    await run(async () => {
      const g = await findExpressGame(c);
      if (!g) throw new Error('Game not found. Check the code and try again.');
      if (g.state.phase !== 'onboarding') throw new Error('This game has already started.');
      setFound(g);
      setChoice('random');
    });
  }

  const taken = found
    ? (Object.values(found.players).map(p => p.role).filter(Boolean) as Role[])
    : [];

  return (
    <div className="max-w-2xl mx-auto">
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}

      <div className="text-center">
        <span className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-cake-600 text-amber-200 shadow-lift">
          <BoltIcon size={30} />
        </span>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cake-600 mt-3">Express Mode</p>
        <h2 className="text-4xl font-extrabold text-forest-800 mt-1">Play in seconds</h2>
        <p className="text-gray-600 mt-2">
          No email, no facilitator. AI bots take any role nobody picks.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {view === 'menu' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => { setView('create'); setError(''); }}
              className="text-left rounded-2xl bg-white border border-cream-200 shadow-card p-5 hover:border-cake-300 focus:outline-none focus:ring-2 focus:ring-cake-300"
            >
              <h3 className="font-display text-xl font-bold text-forest-800">Start a new game</h3>
              <p className="text-sm text-gray-500 mt-1">Play solo, or create a table and share a code.</p>
            </button>
            <button
              onClick={() => { setView('join'); setError(''); }}
              className="text-left rounded-2xl bg-white border border-cream-200 shadow-card p-5 hover:border-cake-300 focus:outline-none focus:ring-2 focus:ring-cake-300"
            >
              <h3 className="font-display text-xl font-bold text-forest-800">Join with a code</h3>
              <p className="text-sm text-gray-500 mt-1">A friend already started a table.</p>
            </button>
          </div>
        )}

        {view === 'create' && (
          <Card className="space-y-5">
            <div>
              <p className="text-sm font-bold text-forest-700 mb-2">How many people are playing?</p>
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Number of players">
                {[1, 2, 3, 4].map(n => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={players === n}
                    onClick={() => setPlayers(n)}
                    className={`rounded-xl border-2 py-2.5 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cake-300 ${
                      players === n ? 'border-cake-600 bg-cake-50 text-cake-700' : 'border-cream-200 bg-white text-forest-700 hover:border-cake-200'
                    }`}
                  >
                    {n === 1 ? 'Just me' : `${n} people`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {players === 4
                  ? 'All four roles are played by people. No bots.'
                  : `${4 - players} AI bot${4 - players === 1 ? '' : 's'} will play the other role${4 - players === 1 ? '' : 's'}.`}
                {players > 1 && ' You will get a code to share with the others.'}
              </p>
            </div>

            <div>
              <p className="text-sm font-bold text-forest-700 mb-2">Your role</p>
              <RolePicker value={choice} onChange={setChoice} />
            </div>

            <Button
              size="lg"
              className="w-full"
              disabled={busy}
              onClick={() => run(async () => enter(await createExpressGame(choice, players)))}
            >
              {busy ? 'Setting up...' : players === 1 ? 'Start game →' : 'Create table →'}
            </Button>
          </Card>
        )}

        {view === 'join' && (
          <Card className="space-y-5">
            {!found ? (
              <form
                className="space-y-3"
                onSubmit={e => { e.preventDefault(); if (code.trim()) void lookUp(code); }}
              >
                <label className="block text-sm font-bold text-forest-700" htmlFor="code">Game code</label>
                <input
                  id="code"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="ABC123"
                  autoComplete="off"
                  className="w-full border border-cream-300 rounded-xl px-4 py-3 font-display text-2xl font-bold tracking-[0.3em] text-center text-forest-800 focus:outline-none focus:ring-2 focus:ring-cake-300 focus:border-cake-400"
                />
                <Button type="submit" size="lg" className="w-full" disabled={busy || code.length < 6}>
                  {busy ? 'Looking...' : 'Find game →'}
                </Button>
              </form>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Joining <strong className="text-forest-800">{found.code}</strong>. Pick a role that is still open.
                </p>
                <RolePicker value={choice} onChange={setChoice} taken={taken} />
                <Button
                  size="lg"
                  className="w-full"
                  disabled={busy}
                  onClick={() => run(async () => enter(await joinExpressGame(found.code, choice)))}
                >
                  {busy ? 'Joining...' : 'Join game →'}
                </Button>
              </>
            )}
          </Card>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          {view !== 'menu' && (
            <button onClick={() => { setView('menu'); setFound(null); setError(''); }} className="font-semibold text-cake-600 hover:underline">
              ← Back
            </button>
          )}
          <button onClick={() => setShowTutorial(true)} className="font-semibold text-cake-600 hover:underline">
            How to play
          </button>
          <Link href="/" className="font-semibold text-cake-600 hover:underline">Change mode</Link>
        </div>
      </div>
    </div>
  );
}

export default function ExpressPage() {
  return (
    <Suspense fallback={<div className="text-center mt-20 text-gray-400">Loading...</div>}>
      <ExpressContent />
    </Suspense>
  );
}
