import React from 'react';
import { cn } from '@/lib/utils';

export function DataTableShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-auto rounded-md border border-border bg-surface", className)}>
      <table className="w-full text-left text-[13px] font-medium text-text-primary whitespace-nowrap">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <thead className={cn("bg-subtle text-text-secondary border-b border-strong-border", className)}>
      {children}
    </thead>
  );
}

export function TableRow({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr className={cn("h-10 border-b border-border hover:bg-subtle/50 transition-colors", className)} onClick={onClick}>
      {children}
    </tr>
  );
}

export function TableHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-2 font-semibold align-middle", className)}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, colSpan, ...props }: { children: React.ReactNode; className?: string; colSpan?: number; [key: string]: unknown }) {
  return (
    <td className={cn("px-4 py-2 align-middle", className)} colSpan={colSpan} {...props}>
      {children}
    </td>
  );
}
