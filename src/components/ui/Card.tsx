import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export type CardVariant = 'default' | 'subtle' | 'outline' | 'elevated' | 'interactive' | 'dark';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverEffect?: boolean;
}

const cardVariantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-slate-200/90 text-slate-800 shadow-2xs',
  subtle: 'bg-slate-50/80 border border-slate-200/70 text-slate-800',
  outline: 'bg-transparent border border-slate-200 text-slate-800',
  elevated: 'bg-white border border-slate-200/80 text-slate-800 shadow-md',
  interactive: 'bg-white border border-slate-200/90 text-slate-800 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer',
  dark: 'bg-slate-900 border border-slate-800 text-white shadow-md'
};

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  children,
  className,
  variant = 'default',
  hoverEffect = false,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl transition-all duration-200',
        cardVariantStyles[variant],
        hoverEffect && 'hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(({
  children,
  className,
  action,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('p-4 sm:p-5 flex items-start justify-between gap-4 border-b border-slate-100 last:border-0', className)}
      {...props}
    >
      <div className="space-y-1 min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <h3
      ref={ref}
      className={cn('text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug', className)}
      {...props}
    >
      {children}
    </h3>
  );
});

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-xs text-slate-500 leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  );
});

CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('p-4 sm:p-5', className)}
      {...props}
    >
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('p-4 sm:p-5 pt-0 flex items-center justify-between gap-3 border-t border-slate-100 mt-4', className)}
      {...props}
    >
      {children}
    </div>
  );
});

CardFooter.displayName = 'CardFooter';
