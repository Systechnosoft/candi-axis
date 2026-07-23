import React from 'react';
import { PageHeader } from '../layout/PageHeader';

interface ListPageProps {
  title: string;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  filterBar?: React.ReactNode;
  children: React.ReactNode; // Usually the DataTableShell
}

export function ListPage({ title, breadcrumbs, actions, filterBar, children }: ListPageProps) {
  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader title={title} breadcrumbs={breadcrumbs} actions={actions} />
      {filterBar && <div className="mb-4">{filterBar}</div>}
      <div className="flex-1 min-h-0 relative">
        {children}
      </div>
    </div>
  );
}
