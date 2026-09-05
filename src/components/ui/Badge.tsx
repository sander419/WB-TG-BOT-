import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant = 
  | 'neutral' 
  | 'primary' 
  | 'indigo' 
  | 'emerald' 
  | 'rose' 
  | 'amber' 
  | 'sky' 
  | 'purple'
  | 'dark';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
}

const badgeVariantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200/80',
  primary: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  rose: 'bg-rose-50 text-rose-800 border-rose-200/80',
  amber: 'bg-amber-50 text-amber-900 border-amber-200/80',
  sky: 'bg-sky-50 text-sky-800 border-sky-200/80',
  purple: 'bg-purple-50 text-purple-800 border-purple-200/80',
  dark: 'bg-slate-900 text-white border-slate-800'
};

const dotColors: Record<BadgeVariant, string> = {
  neutral: 'bg-slate-400',
  primary: 'bg-indigo-500',
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  purple: 'bg-purple-500',
  dark: 'bg-white'
};

const badgeSizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 rounded-md gap-1 font-semibold',
  md: 'text-xs px-2 py-0.5 rounded-lg gap-1.5 font-semibold',
  lg: 'text-xs px-2.5 py-1 rounded-xl gap-1.5 font-bold'
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  dotColor,
  icon,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center select-none border tracking-tight transition-colors whitespace-nowrap',
        badgeVariantStyles[variant],
        badgeSizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotColor || dotColors[variant]
          )}
        />
      )}
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      {children}
    </span>
  );
};
