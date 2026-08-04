"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart,
  Briefcase,
  FileText,
  Users,
  Inbox,
  Calendar,
  Award,
  ChevronLeft,
  ChevronRight,
  Globe,
  ClipboardList,
  Building
} from 'lucide-react';

import { getRequiredModuleForPath } from '@/lib/permissions/config';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart },
  { name: 'Tasks', href: '/tasks', icon: ClipboardList },
  { name: 'Requisitions', href: '/requisitions', icon: Briefcase },
  { name: 'Job Descriptions', href: '/job-descriptions', icon: FileText },
  { name: 'Job Postings', href: '/job-postings', icon: Globe },
  { name: 'Candidates', href: '/candidates', icon: Users },
  { name: 'Interviews', href: '/interviews', icon: Calendar },
  { name: 'Offers', href: '/offers', icon: Award },
  { name: 'Organisations', href: '/admin/organisations', icon: Building, superAdminOnly: true },
];

function NavLink({
  href,
  icon: Icon,
  name,
  isActive,
  isCollapsed
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-[14px] transition-all duration-200",
        isActive
          ? "bg-brand/10 text-brand font-medium"
          : "text-text-secondary hover:bg-subtle hover:text-text-primary",
        isCollapsed ? "justify-center px-2" : ""
      )}
      title={isCollapsed ? name : undefined}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!isCollapsed && <span className="truncate">{name}</span>}
    </Link>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  const { hasAccess, session } = useAuth();
  const isSuperAdmin = session?.roles.includes('super_admin');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load collapse state from local storage on mount
  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  // Prevent server-side render mismatch
  if (!isMounted) {
    return <aside className="w-[240px] flex-shrink-0 bg-sidebar border-r border-border flex flex-col h-full hidden md:flex" />;
  }

  return (
    <aside
      className={cn(
        "flex-shrink-0 bg-sidebar border-r border-border flex flex-col h-full hidden md:flex transition-all duration-300",
        isCollapsed ? "w-[64px]" : "w-[190px]"
      )}
    >
      {/* Top spacing / padding */}
      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-1.5 px-3">
        {NAV_ITEMS.filter(item => {
          if ((item as any).superAdminOnly && !isSuperAdmin) return false;
          const reqModule = getRequiredModuleForPath(item.href);
          if (reqModule === null) return false; // Unmapped protected routes explicitly hidden
          if (reqModule === '') return true; // explicitly permitted
          return hasAccess(reqModule);
        }).map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            name={item.name}
            isActive={pathname.startsWith(item.href)}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>

      {/* Bottom Right Collapse Button */}
      <div className={cn("p-3 border-t border-border flex", isCollapsed ? "justify-center" : "justify-end")}>
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-md hover:bg-subtle text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
