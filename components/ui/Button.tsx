import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-cake-600 hover:bg-cake-700 text-white shadow-sm',
  secondary: 'bg-cream-100 hover:bg-cream-200 text-forest-700 border border-cream-300',
  danger: 'bg-forest-800 hover:bg-forest-950 text-cream-50',
  ghost: 'bg-transparent hover:bg-cake-50 text-cake-700 border border-cake-200',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-semibold rounded-xl
        transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-cake-300 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
