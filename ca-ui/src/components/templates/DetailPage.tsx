import React from 'react';
import { PageHeader } from '../layout/PageHeader';

interface DetailPageProps {
  title: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export function DetailPage({ title, breadcrumbs, actions, sidebar, children }: DetailPageProps) {
  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader title={title} breadcrumbs={breadcrumbs} actions={actions} />
      <div className="flex flex-col lg:flex-row gap-6 mt-2">
        <div className="flex-1 w-full min-w-0 flex flex-col gap-6">
          {children}
        </div>
        {sidebar && (
          <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6">
            {sidebar}
          </div>
        )}
      </div>
    </div>
  );
}
