import React from 'react';

export function Card({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-auxiliary-dark-100 rounded p-4 ${className}`}>
      {label}
      <div className="w-6 h-0 my-2 border-b-2 border-auxiliary-800" />
      {children}
    </div>
  );
}
