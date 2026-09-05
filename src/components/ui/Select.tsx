import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  options?: Array<SelectOption | string>;
  selectSize?: SelectSize;
  size?: SelectSize;
}

const selectSizeStyles: Record<SelectSize, string> = {
  sm: 'text-xs py-1.5 pl-2.5 pr-8 rounded-lg',
  md: 'text-xs sm:text-sm py-2 pl-3.5 pr-9 rounded-xl',
  lg: 'text-sm sm:text-base py-2.5 pl-4 pr-10 rounded-xl'
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  className,
  containerClassName,
  label,
  error,
  helperText,
  children,
  options,
  selectSize,
  size,
  disabled,
  id,
  ...props
}, ref) => {
  const effectiveSize: SelectSize = (selectSize || size || 'md') as SelectSize;
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('w-full space-y-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-bold text-slate-700 select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={cn(
            'w-full appearance-none bg-white border text-slate-800 font-medium transition-all duration-150 cursor-pointer',
            'focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600',
            'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
            error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900' : 'border-slate-200 hover:border-slate-300',
            selectSizeStyles[effectiveSize],
            className
          )}
          {...props}
        >
          {options ? (
            options.map((opt, idx) => {
              if (typeof opt === 'string') {
                return (
                  <option key={`${opt}-${idx}`} value={opt}>
                    {opt}
                  </option>
                );
              }
              return (
                <option key={`${opt.value}-${idx}`} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              );
            })
          ) : (
            children
          )}
        </select>

        <div className="absolute right-3 text-slate-400 pointer-events-none flex items-center">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error && (
        <p className="text-[11px] font-semibold text-rose-600">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p className="text-[11px] text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
