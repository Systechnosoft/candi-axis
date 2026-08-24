import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  description?: React.ReactNode;
}

export function PageHeader({ title, breadcrumbs, actions, description }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-0.5">
        {breadcrumbs && (
          <div className="mb-1 text-[12px] text-text-muted">
            {breadcrumbs}
          </div>
        )}
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight leading-none">
          {title}
        </h1>
        {description && (
          <p className="text-[13px] text-text-secondary leading-snug">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
