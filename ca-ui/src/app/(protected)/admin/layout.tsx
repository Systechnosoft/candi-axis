'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Users, Award, ShieldAlert } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hasAccess, session } = useAuth();
  const isAdmin = hasAccess('users');
  const isSuperAdmin = session?.roles.includes('super_admin');

  // If path is under admin/tags, bypass the layout structure
  if (pathname.startsWith('/admin/tags')) {
    return <>{children}</>;
  }

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

  const allTabs = [
    { name: 'User Management', href: '/admin/usermanagement', icon: Users },
    { name: 'Roles & Permissions', href: '/admin/roles', icon: ShieldAlert },
    { name: 'Site Configuration', href: '/admin/site-configuration', icon: Settings },
    { name: 'Interview Configuration', href: '/admin/interview-configuration', icon: Settings },
    { name: 'Resume Scoring', href: '/admin/resume-scoring', icon: Award },
  ];

  const tabs = isSuperAdmin
    ? allTabs
    : allTabs.filter(t => t.name !== 'Roles & Permissions' && t.name !== 'Interview Configuration');

  const gridColsClass = tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-3';

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4">
        {/* Horizontal Navigation Tabs */}
        <div className="border-b border-border bg-surface rounded-t-lg shadow-sm">
          <nav className={`grid ${gridColsClass} w-full`} aria-label="Admin tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              // Handle exact match or prefix match for active state
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center justify-center gap-2 py-4 px-1 border-b-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'border-brand text-brand font-semibold'
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
