import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string | number;
    label: string;
    positive?: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, trend, icon, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[14px] font-medium text-text-secondary">
          {title}
        </CardTitle>
        {icon && <div className="text-text-muted">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        {trend && (
          <p className="mt-1 text-xs flex items-center gap-1">
            <span className={cn(trend.positive ? "text-status-success" : "text-status-error font-medium")}>
              {trend.value}
            </span>
            <span className="text-text-muted">{trend.label}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
