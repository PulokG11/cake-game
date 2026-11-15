import Link from 'next/link';
import { CakeHero, TrophyIcon, BoltIcon } from '@/components/brand/Brand';

export default function ModeSelectPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center">
        <CakeHero className="w-44 mx-auto drop-shadow-sm" />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cake-600 mt-2">Choose your mode</p>
        <h2 className="text-4xl md:text-5xl font-extrabold text-forest-800 mt-2 leading-[1.05]">
          How do you want to <span className="text-cake-600">play</span>?
        </h2>
        <p className="text-gray-600 mt-3 max-w-xl mx-auto">
          A perishable supply chain simulation. Manage your inventory carefully, because stock expires after{' '}
          <strong className="text-forest-700">3 weeks</strong>!
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-8">
        <Link
          href="/express"
          className="group rounded-2xl bg-cake-600 text-white p-6 shadow-lift hover:bg-cake-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cake-300 focus:ring-offset-2"
        >
          <span className="grid place-items-center h-12 w-12 rounded-xl bg-white/15 text-amber-200">
            <BoltIcon size={26} />
          </span>
          <h3 className="font-display text-3xl font-extrabold mt-4">Express Mode</h3>
          <p className="text-cake-100 mt-1 text-sm">Jump in and play, no setup.</p>
          <ul className="mt-4 space-y-1.5 text-sm text-cake-50">
            <li>No email and no facilitator. The game runs itself.</li>
            <li>Play solo or with 2 to 4 friends. AI bots fill the empty roles.</li>
            <li>Pick your role, or let us pick one at random.</li>
          </ul>
          <span className="inline-block mt-5 font-bold text-sm group-hover:translate-x-0.5 transition-transform">
            Play Express →
          </span>
        </Link>

        <Link
          href="/champions"
          className="group rounded-2xl bg-forest-900 text-cream-50 p-6 shadow-lift hover:bg-forest-800 transition-colors focus:outline-none focus:ring-2 focus:ring-cake-300 focus:ring-offset-2"
        >
          <span className="grid place-items-center h-12 w-12 rounded-xl bg-white/10 text-amber-300">
            <TrophyIcon size={26} />
          </span>
          <h3 className="font-display text-3xl font-extrabold mt-4">Champions Mode</h3>
          <p className="text-cream-300 mt-1 text-sm">The full facilitated workshop.</p>
          <ul className="mt-4 space-y-1.5 text-sm text-cream-200">
            <li>Join with your email. A facilitator creates teams and runs the session.</li>
            <li>Four-person teams compete for the lowest total cost.</li>
            <li>Roles are assigned to you automatically.</li>
          </ul>
          <span className="inline-block mt-5 font-bold text-sm text-cake-300 group-hover:translate-x-0.5 transition-transform">
            Join Champions →
          </span>
        </Link>
      </div>

      <p className="text-center mt-6 text-xs text-gray-400">
        Session facilitator?{' '}
        <Link href="/admin" className="text-cake-600 font-semibold hover:underline">Go to admin panel →</Link>
      </p>
    </div>
  );
}
