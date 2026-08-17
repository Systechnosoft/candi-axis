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
  Building,
  Settings,
  Shield,
  ShieldAlert,
  Tag,
  Menu
} from 'lucide-react';

import { getRequiredModuleForPath } from '@/lib/permissions/config';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart },
  { name: 'Tasks', href: '/tasks', icon: ClipboardList },
  { name: 'Tags', href: '/tags', icon: Tag },
  { name: 'Job Descriptions', href: '/job-descriptions', icon: FileText },
  { name: 'Job Postings', href: '/job-postings', icon: Globe },
  { name: 'Candidates', href: '/candidates', icon: Users },
  { name: 'Interviews', href: '/interviews', icon: Calendar },
  {
    name: 'Admin Console',
    href: '/admin',
    icon: Shield,
    subItems: [
      { name: 'Organisations', href: '/admin/organisations', icon: Building, superAdminOnly: true },
      { name: 'User Management', href: '/admin/usermanagement', icon: Users },
      { name: 'Roles', href: '/admin/roles', icon: ShieldAlert, superAdminOnly: true },
      { name: 'Site Configuration', href: '/admin/site-configuration', icon: Settings },
      { name: 'Interview Configuration', href: '/admin/interview-configuration', icon: Settings, superAdminOnly: true },
      { name: 'Resume Scoring', href: '/admin/resume-scoring', icon: Award },
    ]
  },
];

function NavLink({
  href,
  icon: Icon,
  name,
  isActive,
  isCollapsed,
  isSubItem = false
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  isActive: boolean;
  isCollapsed: boolean;
  isSubItem?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center rounded-md transition-all duration-200",
        isSubItem ? "gap-3 px-3 py-1 text-[12px]" : "gap-3 px-3 h-[36px] text-[14px]",
        isActive
          ? "bg-brand/10 text-brand font-medium"
          : "text-text-secondary hover:bg-subtle hover:text-text-primary",
        isCollapsed ? "justify-center px-2" : ""
      )}
      title={isSubItem || isCollapsed ? name : undefined}
    >
      <Icon className={cn("flex-shrink-0", isSubItem ? "w-3.5 h-3.5" : "w-4 h-4")} />
      {!isCollapsed && <span className="truncate">{name}</span>}
    </Link>
  );
}

function NavGroup({
  item,
  pathname,
  hasAccess,
  isSuperAdmin,
  isSidebarCollapsed
}: {
  item: any;
  pathname: string;
  hasAccess: (m: string) => boolean;
  isSuperAdmin: boolean;
  isSidebarCollapsed: boolean;
}) {
  const [isOpen, setIsOpen] = useState(pathname.startsWith(item.href));

  useEffect(() => {
    if (pathname.startsWith(item.href)) {
      setIsOpen(true);
    }
  }, [pathname, item.href]);

  const visibleSubItems = item.subItems.filter((subItem: any) => {
    if (subItem.superAdminOnly && !isSuperAdmin) return false;
    const reqModule = getRequiredModuleForPath(subItem.href);
    if (reqModule === null) return false;
    if (reqModule === '') return true;
    return hasAccess(reqModule);
  });

  if (visibleSubItems.length === 0) return null;

  const isActive = pathname.startsWith(item.href);

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-3 h-[36px] rounded-md text-[14px] transition-all duration-200 w-full",
          isActive
            ? "bg-brand/10 text-brand font-medium"
            : "text-text-secondary hover:bg-subtle hover:text-text-primary",
          isSidebarCollapsed ? "justify-center px-2" : "justify-between"
        )}
        title={isSidebarCollapsed ? item.name : undefined}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <item.icon className="w-4 h-4 flex-shrink-0" />
          {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
        </div>
      </button>

      {isOpen && (
        <div className={cn(
          "flex flex-col gap-1 py-1 max-h-[30vh] overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isSidebarCollapsed ? "px-0" : "pl-1.5 pr-1"
        )}>
          {visibleSubItems.map((subItem: any) => (
            <NavLink
              key={subItem.href}
              href={subItem.href}
              icon={subItem.icon}
              name={subItem.name}
              isActive={pathname.startsWith(subItem.href)}
              isCollapsed={isSidebarCollapsed}
              isSubItem={true}
            />
          ))}
        </div>
      )}
    </div>
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

  useEffect(() => {
    const handleToggle = () => toggleCollapse();
    window.addEventListener('sidebar-toggle', handleToggle);
    return () => window.removeEventListener('sidebar-toggle', handleToggle);
  }, []);

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
      {/* Top spacing / padding adjusted to align first item with page heading */}
      <div className="flex-1 overflow-y-auto pb-6 pt-6 flex flex-col gap-0.5 px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV_ITEMS.filter(item => {
          if ((item as any).superAdminOnly && !isSuperAdmin) return false;
          const reqModule = getRequiredModuleForPath(item.href);
          if (reqModule === null) return false; // Unmapped protected routes explicitly hidden
          if (reqModule === '') return true; // explicitly permitted
          return hasAccess(reqModule);
        }).map((item: any) => {
          if (item.subItems) {
            return (
              <NavGroup
                key={item.href}
                item={item}
                pathname={pathname}
                hasAccess={hasAccess}
                isSuperAdmin={!!isSuperAdmin}
                isSidebarCollapsed={isCollapsed}
              />
            );
          }

          return (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              name={item.name}
              isActive={pathname.startsWith(item.href)}
              isCollapsed={isCollapsed}
            />
          );
        })}
      </div>
    </aside>
  );
}
