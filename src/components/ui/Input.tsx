import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  inputSize?: InputSize;
  size?: InputSize;
  onClear?: () => void;
  containerClassName?: string;
}

const inputSizeStyles: Record<InputSize, string> = {
  sm: 'text-xs py-1.5 px-2.5 rounded-lg',
  md: 'text-xs sm:text-sm py-2 px-3.5 rounded-xl',
  lg: 'text-sm sm:text-base py-2.5 px-4 rounded-xl'
};

const addonSizeStyles: Record<InputSize, { left: string; right: string }> = {
  sm: {
    left: 'text-xs px-2.5 py-1.5 rounded-l-lg border-r-0',
    right: 'text-xs px-2.5 py-1.5 rounded-r-lg border-l-0'
  },
  md: {
    left: 'text-xs sm:text-sm px-3 py-2 rounded-l-xl border-r-0',
    right: 'text-xs sm:text-sm px-3 py-2 rounded-r-xl border-l-0'
  },
  lg: {
    left: 'text-sm sm:text-base px-3.5 py-2.5 rounded-l-xl border-r-0',
    right: 'text-sm sm:text-base px-3.5 py-2.5 rounded-r-xl border-l-0'
  }
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className,
  containerClassName,
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  leftAddon,
  rightAddon,
  inputSize,
  size,
  disabled,
  id,
  value,
  onClear,
  ...props
}, ref) => {
  const effectiveSize: InputSize = (inputSize || size || 'md') as InputSize;
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('w-full space-y-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold text-slate-700 select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-stretch w-full">
        {leftAddon && (
          <span
            className={cn(
              'inline-flex items-center bg-slate-100/90 border border-slate-200 text-slate-600 font-semibold select-none shrink-0 shadow-2xs',
              addonSizeStyles[effectiveSize].left
            )}
          >
            {leftAddon}
          </span>
        )}

        <div className="relative flex-1 flex items-center min-w-0">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center z-10">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            value={value}
            className={cn(
              'w-full bg-white border text-slate-800 placeholder:text-slate-400 font-medium transition-all duration-150',
              'focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600',
              'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
              error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900' : 'border-slate-200 hover:border-slate-300',
              leftAddon && 'rounded-l-none',
              rightAddon && 'rounded-r-none',
              leftIcon && 'pl-9',
              (rightIcon || onClear) && 'pr-9',
              inputSizeStyles[effectiveSize],
              className
            )}
            {...props}
          />

          {onClear && value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors z-10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {!onClear && rightIcon && (
            <div className="absolute right-3 text-slate-400 flex items-center pointer-events-none z-10">
              {rightIcon}
            </div>
          )}
        </div>

        {rightAddon && (
          <span
            className={cn(
              'inline-flex items-center bg-slate-100/90 border border-slate-200 text-slate-600 font-semibold select-none shrink-0 shadow-2xs',
              addonSizeStyles[effectiveSize].right
            )}
          >
            {rightAddon}
          </span>
        )}
      </div>

      {error && (
        <p className="text-[11px] font-semibold text-rose-600 animate-in fade-in duration-100">
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

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  className,
  containerClassName,
  label,
  error,
  helperText,
  disabled,
  id,
  ...props
}, ref) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('w-full space-y-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-bold text-slate-700 select-none"
        >
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        disabled={disabled}
        className={cn(
          'w-full bg-white border text-slate-800 placeholder:text-slate-400 text-xs sm:text-sm p-3 rounded-xl font-medium transition-all duration-150 resize-y min-h-[80px]',
          'focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600',
          'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
          error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900' : 'border-slate-200 hover:border-slate-300',
          className
        )}
        {...props}
      />

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

Textarea.displayName = 'Textarea';

export interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  shortcutKey?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
  placeholder = 'Поиск...',
  shortcutKey,
  className,
  ...props
}, ref) => {
  return (
    <Input
      ref={ref}
      placeholder={placeholder}
      leftIcon={<Search className="w-4 h-4" />}
      rightIcon={
        shortcutKey ? (
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded">
            {shortcutKey}
          </kbd>
        ) : undefined
      }
      className={className}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';
