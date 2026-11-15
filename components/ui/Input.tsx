import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-semibold text-forest-700">{label}</label>}
      <input
        className={`
          border border-cream-300 bg-white rounded-xl px-3.5 py-2.5 text-sm
          focus:outline-none focus:ring-2 focus:ring-cake-300 focus:border-cake-400
          disabled:bg-cream-100 disabled:text-gray-500
          ${error ? 'border-red-400' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
