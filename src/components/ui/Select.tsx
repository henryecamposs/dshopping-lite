// dShopping Lite - Componente Select Reutilizable y Premium
// Diseñado por @Dev_React bajo la metodología SDD

import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', containerClassName = '', children, ...props }, ref) => {
    return (
      <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`input-premium w-full cursor-pointer focus:ring-2 focus:ring-primary/50 focus:border-primary ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span className="text-xs text-rose-500 font-medium mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
