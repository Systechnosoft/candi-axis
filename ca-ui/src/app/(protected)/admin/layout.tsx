'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hasAccess } = useAuth();
  const isAdmin = hasAccess('users');


  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-status-error/10 border border-status-error/20 text-status-error p-6 rounded-lg flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg text-text-primary">Access Denied</h3>
            <p className="mt-1 text-sm text-text-secondary">You do not have the required permissions to view this page. Please contact your system administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      {children}
    </div>
  );
}
