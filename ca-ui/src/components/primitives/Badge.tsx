import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-brand",
        {
          'border-transparent bg-subtle text-text-primary': variant === 'default',
          'border-transparent bg-status-success/10 text-status-success': variant === 'success',
          'border-transparent bg-status-warning/10 text-status-warning': variant === 'warning',
          'border-transparent bg-status-error/10 text-status-error': variant === 'error',
          'border-transparent bg-status-info/10 text-status-info': variant === 'info',
        },
        className
      )}
      {...props}
    />
  );
}
