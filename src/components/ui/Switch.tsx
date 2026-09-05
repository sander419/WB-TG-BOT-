import React from 'react';
import { cn } from '../../lib/utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  className,
  size = 'md'
}) => {
  return (
    <label
      className={cn(
        'inline-flex items-start gap-3 cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 cursor-pointer',
          size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
          checked ? 'bg-indigo-600' : 'bg-slate-300 hover:bg-slate-400'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-md transform ring-0 transition duration-200 ease-in-out',
            size === 'sm'
              ? 'h-4 w-4 mt-0.5 ml-0.5'
              : 'h-5 w-5 mt-0.5 ml-0.5',
            checked
              ? size === 'sm' ? 'translate-x-4' : 'translate-x-5'
              : 'translate-x-0'
          )}
        />
      </button>

      {(label || description) && (
        <div className="space-y-0.5 leading-tight">
          {label && (
            <span className="block text-xs sm:text-sm font-semibold text-slate-800">
              {label}
            </span>
          )}
          {description && (
            <span className="block text-[11px] sm:text-xs text-slate-500">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
};
