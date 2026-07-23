import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './Card';

export function PageSection({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-4", className)}>
      {title && <h3 className="text-[16px] font-medium text-text-primary">{title}</h3>}
      <div>{children}</div>
    </section>
  );
}

export function ActionBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-end gap-3 p-4 bg-subtle border-t border-border mt-auto w-full rounded-b-md", className)}>
      {children}
    </div>
  );
}

export function InfoCard({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 flex flex-col justify-center">
        <span className="text-[12px] text-text-secondary mb-1 uppercase tracking-wider font-semibold">{label}</span>
        <span className="text-[14px] text-text-primary font-medium">{value}</span>
      </CardContent>
    </Card>
  );
}
