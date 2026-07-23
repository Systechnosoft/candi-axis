import React from 'react';
import { PageHeader } from '../layout/PageHeader';

interface SplitViewPageProps {
  title: string;
  listContent: React.ReactNode;
  detailContent: React.ReactNode;
}

export function SplitViewPage({ title, listContent, detailContent }: SplitViewPageProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full">
      <PageHeader title={title} />
      <div className="flex flex-1 gap-6 min-h-0 bg-background">
        <div className="w-1/3 min-w-[300px] flex flex-col border border-border rounded-md bg-surface overflow-hidden">
          {listContent}
        </div>
        <div className="flex-1 flex flex-col border border-border rounded-md bg-surface overflow-hidden">
          {detailContent}
        </div>
      </div>
    </div>
  );
}
