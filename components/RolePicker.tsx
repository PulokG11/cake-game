'use client';
import React from 'react';
import { Role, ROLES, ROLE_LABELS, ROLE_TAGS } from '@/lib/types';
import type { RoleChoice } from '@/lib/supabase';
import { RoleIcon, DiceIcon } from './brand/Brand';

interface RolePickerProps {
  value: RoleChoice;
  onChange: (v: RoleChoice) => void;
  /** Roles already claimed by someone else (shown disabled). */
  taken?: Role[];
}

export function RolePicker({ value, onChange, taken = [] }: RolePickerProps) {
  const options: { id: RoleChoice; label: string; tag: string }[] = [
    ...ROLES.map(r => ({ id: r as RoleChoice, label: ROLE_LABELS[r], tag: ROLE_TAGS[r] })),
    { id: 'random', label: 'Random', tag: 'Surprise me' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" role="radiogroup" aria-label="Choose your role">
      {options.map(o => {
        const isTaken = o.id !== 'random' && taken.includes(o.id as Role);
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={isTaken}
            onClick={() => onChange(o.id)}
            className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-cake-300 disabled:opacity-45 disabled:cursor-not-allowed ${
              selected
                ? 'border-cake-600 bg-cake-50'
                : 'border-cream-200 bg-white hover:border-cake-200'
            }`}
          >
            <span
              className={`grid place-items-center h-9 w-9 shrink-0 rounded-lg ${
                selected ? 'bg-cake-600 text-white' : 'bg-cream-100 text-cake-600'
              }`}
            >
              {o.id === 'random' ? <DiceIcon size={20} /> : <RoleIcon role={o.id as Role} size={20} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-forest-800 leading-tight">{o.label}</span>
              <span className="block text-[11px] text-gray-500 leading-tight truncate">
                {isTaken ? 'Taken' : o.tag}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
