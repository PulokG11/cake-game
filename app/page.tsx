'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { autoAssignPlayer } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CakeHero, RoleIcon } from '@/components/brand/Brand';
import { ROLES, ROLE_LABELS } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const assignment = await autoAssignPlayer(email.trim());
      // Store assignment in sessionStorage for the client
      sessionStorage.setItem('playerId', assignment.playerId);
      sessionStorage.setItem('gameId', assignment.gameId);
      sessionStorage.setItem('role', assignment.role);
      sessionStorage.setItem('email', email.trim().toLowerCase());
      router.push(`/assigned?gameId=${assignment.gameId}&role=${assignment.role}&team=${encodeURIComponent(assignment.teamName)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cake-600 text-center md:text-left">
            Supply chain workshop
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-forest-800 mt-2 leading-[1.05] text-center md:text-left">
            Welcome to the <span className="text-cake-600">Cake Game</span>
          </h2>
          <p className="text-gray-600 mt-4 text-center md:text-left">
            A perishable supply chain simulation. Manage your inventory carefully —
            stock expires after <strong className="text-forest-700">3 weeks</strong>!
          </p>

          <div className="mt-5 flex flex-wrap gap-2 justify-center md:justify-start">
            {ROLES.map(role => (
              <span
                key={role}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-cream-200 px-3 py-1 text-xs font-semibold text-forest-600 shadow-sm"
              >
                <RoleIcon role={role} size={15} className="text-cake-600" />
                {ROLE_LABELS[role]}
              </span>
            ))}
          </div>

          <div className="mt-6 bg-white rounded-2xl shadow-lift border border-cream-200 p-6">
            <form onSubmit={handleJoin} className="space-y-4">
              <Input
                label="Your email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Joining...' : 'Join Game →'}
              </Button>
            </form>
            <p className="mt-4 text-xs text-gray-500">
              A <strong className="text-forest-700">team game</strong>: you&apos;ll be assigned to a
              4-person team and auto-assigned a role. The team with the lowest total cost wins.
            </p>
          </div>

          <p className="text-center md:text-left mt-4 text-xs text-gray-400">
            Session facilitator?{' '}
            <Link href="/admin" className="text-cake-600 font-semibold hover:underline">Go to admin panel →</Link>
          </p>
        </div>

        <div>
          <CakeHero className="w-full max-w-xs mx-auto drop-shadow-sm" />
          <div className="grid grid-cols-3 gap-3 mt-2">
            <CostTile amount="$4" label="Lost sales" note="per unit unmet, no backlog" />
            <CostTile amount="$2" label="Wastage" note="per unit that expires" />
            <CostTile amount="$0.50" label="Holding" note="per unit per week" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CostTile({ amount, label, note }: { amount: string; label: string; note: string }) {
  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-card p-3 text-center">
      <p className="font-display text-2xl font-extrabold text-cake-600 tabular leading-none">{amount}</p>
      <p className="text-xs font-bold text-forest-700 mt-1.5">{label}</p>
      <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{note}</p>
    </div>
  );
}
