'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getGame, subscribeToGame, startExpressGame } from '@/lib/supabase';
import { Game, ROLES, ROLE_LABELS, ROLE_TAGS } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RoleIcon } from '@/components/brand/Brand';
import { TutorialModal } from '@/components/TutorialModal';

function LobbyContent() {
  const router = useRouter();
  const gameId = useSearchParams().get('id') ?? '';
  const [game, setGame] = useState<Game | null>(null);
  const [me, setMe] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => { setMe(sessionStorage.getItem('playerId') ?? ''); }, []);

  useEffect(() => {
    if (!gameId) return;
    getGame(gameId).then(g => g && setGame(g));
    return subscribeToGame(gameId, g => g && setGame(g));
  }, [gameId]);

  useEffect(() => {
    if (game && game.state.phase !== 'onboarding') router.replace(`/game?id=${gameId}`);
  }, [game, gameId, router]);

  if (!game) {
    return <div className="text-center mt-20 text-gray-400">Loading table...</div>;
  }

  const players = Object.values(game.players);
  const humans = players.filter(p => !p.isBot);
  const expected = game.config.expectedPlayers ?? 4;
  const isHost = game.hostId === me;
  const inGame = !!game.players[me];
  const open = 4 - players.length;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const link = typeof window === 'undefined' ? '' : `${window.location.origin}${base}/express/?code=${game.code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable: the code is shown on screen */
    }
  }

  async function startNow() {
    setBusy(true);
    setError('');
    try {
      await startExpressGame(gameId, me);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the game.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cake-600">Express Mode · waiting room</p>
        <h2 className="text-4xl font-extrabold text-forest-800 mt-1">Your table</h2>
        <p className="text-gray-600 mt-1">
          {humans.length} of {expected} players joined. The game starts automatically when everyone is in.
        </p>
      </div>

      <Card className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Game code</p>
        <p className="font-display text-5xl font-black tracking-[0.25em] text-cake-600 mt-1 pl-[0.25em]">{game.code}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={copy}>{copied ? 'Link copied' : 'Copy invite link'}</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowTutorial(true)}>How to play</Button>
        </div>
      </Card>

      <Card title="Roles">
        <div className="space-y-2">
          {ROLES.map(role => {
            const p = players.find(x => x.role === role);
            return (
              <div key={role} className="flex items-center gap-3 rounded-xl bg-cream-100 px-3 py-2.5">
                <span className="grid place-items-center h-9 w-9 rounded-lg bg-white text-cake-600 border border-cream-200">
                  <RoleIcon role={role} size={20} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-forest-800">{ROLE_LABELS[role]}</p>
                  <p className="text-[11px] text-gray-500">{ROLE_TAGS[role]}</p>
                </div>
                {p ? (
                  <Badge variant={p.id === me ? 'info' : 'success'}>{p.id === me ? 'You' : 'Player joined'}</Badge>
                ) : (
                  <Badge variant="warning">Open</Badge>
                )}
              </div>
            );
          })}
        </div>
        {open > 0 && (
          <p className="text-xs text-gray-500 mt-3">
            Any role still open when the game starts is played by an AI bot.
          </p>
        )}
      </Card>

      {!inGame && (
        <p className="text-center text-sm text-gray-600">
          You are not at this table.{' '}
          <Link href={`/express/?code=${game.code}`} className="font-semibold text-cake-600 hover:underline">Join with the code</Link>.
        </p>
      )}

      {isHost && (
        <Button size="lg" className="w-full" disabled={busy} onClick={startNow}>
          {busy ? 'Starting...' : open > 0 ? `Start now, ${open} bot${open === 1 ? '' : 's'} will fill in` : 'Start now'}
        </Button>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700" role="alert">{error}</div>
      )}
      {!isHost && inGame && (
        <p className="text-center text-xs text-gray-400 animate-pulse">Waiting for the table to fill up or the host to start...</p>
      )}
    </div>
  );
}

export default function ExpressLobbyPage() {
  return (
    <Suspense fallback={<div className="text-center mt-20 text-gray-400">Loading table...</div>}>
      <LobbyContent />
    </Suspense>
  );
}
