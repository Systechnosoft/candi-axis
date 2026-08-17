import React from 'react';
import { cn } from '@/lib/utils';

export function DataTableShell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-auto bg-surface p-3", className)}>
      <table className="w-full text-left text-[13px] font-medium text-text-primary whitespace-nowrap [&_tbody_tr:nth-child(odd)]:bg-subtle/50 [&_tbody_tr:nth-child(even)]:bg-surface">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <thead className={cn("bg-brand text-white [&_tr]:hover:!bg-brand [&_tr]:!transition-none", className)}>
      {children}
    </thead>
  );
}

export function TableRow({ children, className, onClick }: { children?: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr className={cn("border-b border-border hover:!bg-subtle/60 transition-colors", className)} onClick={onClick}>
      {children}
    </tr>
  );
}

export function TableHeader({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-2 py-1 font-semibold align-middle text-[13px] tracking-wide", className)}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, colSpan, ...props }: { children?: React.ReactNode; className?: string; colSpan?: number; [key: string]: unknown }) {
  return (
    <td className={cn("px-2 py-0.5 align-middle", className)} colSpan={colSpan} {...props}>
      {children}
    </td>
  );
}
