import React from 'react';
import { Role } from '@/lib/types';

const VELVET = '#B3173A';
const VELVET_DEEP = '#84102B';
const CHOCOLATE = '#2E1D1D';
const CHOCOLATE_LIGHT = '#5A423F';
const FROSTING = '#FBF0E7';
const CHERRY = '#D61F3E';
const LEAF = '#2C6B4C';
const GOLD = '#CC8A16';

/** Layered cake with a cherry: the logo mark. */
export function CakeMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Cake Game logo"
    >
      <rect x="5" y="55" width="54" height="4" rx="2" fill="#170D0E" />
      <rect x="9" y="43" width="46" height="12" rx="3" fill={CHOCOLATE} />
      <rect x="9" y="39" width="46" height="4.5" fill={FROSTING} />
      <rect x="9" y="27" width="46" height="12" fill={VELVET} />
      <rect x="7" y="19" width="50" height="11" rx="5.5" fill={FROSTING} />
      <rect x="15" y="26" width="6" height="12" rx="3" fill={FROSTING} />
      <rect x="29" y="26" width="6" height="8.5" rx="3" fill={FROSTING} />
      <rect x="43" y="26" width="6" height="14" rx="3" fill={FROSTING} />
      <circle cx="32" cy="13.5" r="6.5" fill={CHERRY} />
      <circle cx="29.7" cy="11.2" r="1.8" fill="#fff" opacity="0.55" />
      <path d="M32 7.2C33 3.4 36.6 1.6 40.4 2.4" stroke={LEAF} strokeWidth="1.9" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Mark plus wordmark. tone="dark" is for use on a black-forest background. */
export function Logo({
  tone = 'light',
  size = 40,
  tagline = true,
}: {
  tone?: 'light' | 'dark';
  size?: number;
  tagline?: boolean;
}) {
  const onDark = tone === 'dark';
  return (
    <div className="flex items-center gap-3">
      <CakeMark size={size} />
      <div className="leading-none">
        <p className={`font-display font-extrabold tracking-tight text-xl ${onDark ? 'text-cream-50' : 'text-forest-800'}`}>
          Cake <span className={onDark ? 'text-cake-300' : 'text-cake-600'}>Game</span>
        </p>
        {tagline && (
          <p className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${onDark ? 'text-cream-300/80' : 'text-gray-400'}`}>
            Perishable Supply Chain
          </p>
        )}
      </div>
    </div>
  );
}

export function Cherry({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="12" cy="15" r="6.5" fill={CHERRY} />
      <circle cx="9.8" cy="12.7" r="1.7" fill="#fff" opacity="0.5" />
      <path d="M12 8.6C12.6 4.6 15.8 2.6 19.4 3.2" stroke={LEAF} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Sparkle({ x, y, s = 1, color = GOLD }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -7 C1 -2 2 -1 7 0 C2 1 1 2 0 7 C-1 2 -2 1 -7 0 C-2 -1 -1 -2 0 -7Z"
      fill={color}
    />
  );
}

/** Three-tier red velvet / black forest cake used as the home-page hero. */
export function CakeHero({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 230" className={className} role="img" aria-label="A three-tier red velvet and black forest cake">
      <circle cx="120" cy="124" r="100" fill="#FCE1E4" />
      <circle cx="120" cy="124" r="78" fill="#FEF3F4" />

      <Sparkle x={34} y={64} s={1.1} />
      <Sparkle x={208} y={92} s={0.8} />
      <Sparkle x={196} y={38} s={0.6} color={VELVET} />
      <Sparkle x={52} y={150} s={0.6} color={VELVET} />

      {/* stand */}
      <rect x="46" y="182" width="148" height="7" rx="3.5" fill="#170D0E" />
      <rect x="112" y="189" width="16" height="16" fill="#2E1D1D" />
      <rect x="86" y="203" width="68" height="7" rx="3.5" fill="#170D0E" />

      {/* bottom tier: black forest */}
      <rect x="52" y="146" width="136" height="36" rx="6" fill={CHOCOLATE} />
      {[64, 82, 100, 118, 136, 154, 172].map((x, i) => (
        <rect key={x} x={x} y={152 + (i % 3) * 8} width="9" height="2.4" rx="1.2" fill={CHOCOLATE_LIGHT} transform={`rotate(${i % 2 ? -12 : 10} ${x} ${153 + (i % 3) * 8})`} />
      ))}
      <rect x="52" y="138" width="136" height="9" rx="4.5" fill={FROSTING} />

      {/* middle tier: red velvet */}
      <rect x="70" y="100" width="100" height="39" rx="5" fill={VELVET} />
      {[80, 96, 112, 128, 144, 158].map((x, i) => (
        <circle key={x} cx={x} cy={112 + (i % 3) * 8} r="1.6" fill={VELVET_DEEP} />
      ))}
      <rect x="70" y="92" width="100" height="9" rx="4.5" fill={FROSTING} />

      {/* top tier: black forest */}
      <rect x="88" y="60" width="64" height="33" rx="5" fill={CHOCOLATE} />
      <rect x="86" y="52" width="68" height="11" rx="5.5" fill={FROSTING} />
      {/* cream drips */}
      <rect x="94" y="58" width="6" height="14" rx="3" fill={FROSTING} />
      <rect x="116" y="58" width="6" height="9" rx="3" fill={FROSTING} />
      <rect x="140" y="58" width="6" height="16" rx="3" fill={FROSTING} />

      {/* cherries */}
      <circle cx="106" cy="43" r="8" fill={CHERRY} />
      <circle cx="103.4" cy="40.2" r="2.2" fill="#fff" opacity="0.5" />
      <circle cx="134" cy="43" r="8" fill={CHERRY} />
      <circle cx="131.4" cy="40.2" r="2.2" fill="#fff" opacity="0.5" />
      <circle cx="120" cy="36" r="8" fill={CHERRY} />
      <circle cx="117.4" cy="33.2" r="2.2" fill="#fff" opacity="0.5" />
      <path d="M120 28C120.6 21 125 17.5 131 18.6" stroke={LEAF} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M106 35C107 29 111 26 116 26.6" stroke={LEAF} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9" />
      <path d="M134 35C133 29 129 26 124 26.6" stroke={LEAF} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

const ROLE_PATHS: Record<Role, React.ReactNode> = {
  manufacturer: (
    <>
      <path d="M3 21V10l6 4v-4l6 4V4h5v17H3Z" />
      <path d="M7 18h2M12 18h2M17 18h.01" />
    </>
  ),
  distributor: (
    <>
      <path d="M2 6h11v10H2zM13 9h4l3.5 3.3V16H13" />
      <circle cx="6.5" cy="17.6" r="1.9" />
      <circle cx="16.5" cy="17.6" r="1.9" />
    </>
  ),
  wholesaler: (
    <>
      <path d="M3 10l9-6 9 6v10H3z" />
      <path d="M8 20v-6h8v6M8 17h8" />
    </>
  ),
  retailer: (
    <>
      <path d="M4 9l1.6-5h12.8L20 9" />
      <path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9" />
      <path d="M5 12v8h14v-8M10 20v-5h4v5" />
    </>
  ),
};

export function RoleIcon({ role, size = 22, className = '' }: { role: Role; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ROLE_PATHS[role]}
    </svg>
  );
}
