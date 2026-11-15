import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function Card({ children, className = '', title }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-card border border-cream-200 p-5 ${className}`}>
      {title && <h3 className="text-xs font-bold text-cake-700 uppercase tracking-[0.14em] mb-3">{title}</h3>}
      {children}
    </div>
  );
}
