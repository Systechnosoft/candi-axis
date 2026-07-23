import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {breadcrumbs && (
          <div className="mb-1 text-[12px] text-text-muted">
            {breadcrumbs}
          </div>
        )}
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          {title}
        </h1>
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
