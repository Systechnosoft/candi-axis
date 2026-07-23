import React from 'react';
import { SidebarNav } from './SidebarNav';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden text-foreground">
      <Topbar />
      <div className="flex flex-1 overflow-hidden min-w-0">
        <SidebarNav />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1280px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

