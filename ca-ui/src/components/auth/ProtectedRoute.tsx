'use client';

import React, { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, LogOut } from 'lucide-react';

import { getRequiredModuleForPath, ROUTE_MODULE_MAP } from '@/lib/permissions/config';

// Fallback route priority for roles that can't access dashboard
const FALLBACK_ROUTES = ['/tasks', '/interviews', '/candidates', '/job-descriptions', '/requisitions', '/offers'];

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, hasAccess, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Determine required module from route
  const requiredModule = getRequiredModuleForPath(pathname);
  
  // Explicitly fail closed: If the route is unmapped (null), deny access. 
  // If it's mapped to an empty string (like /notifications), it's permitted.
  // Otherwise, check if user has access to the mapped module.
  const isAccessDenied = !loading && session && (
    requiredModule === null || (requiredModule !== '' && !hasAccess(requiredModule))
  );

  useEffect(() => {
    if (isAccessDenied) {
      // Find the first route the user actually has access to and redirect there
      const fallback = FALLBACK_ROUTES.find((route) => {
        const mod = ROUTE_MODULE_MAP[route];
        return !mod || hasAccess(mod);
      });
      if (fallback && fallback !== pathname) {
        router.replace(fallback);
      }
    }
  }, [isAccessDenied, hasAccess, pathname, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-text-primary">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <p className="mt-4 text-sm text-text-secondary">Loading your workspace...</p>
      </div>
    );
  }

  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  if (!session) {
    if (typeof window !== 'undefined' && !isAuthRoute) {
      window.location.href = '/login';
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-text-primary">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <p className="mt-4 text-sm text-text-secondary">Redirecting to login...</p>
      </div>
    );
  }

  // While redirect is in progress, show a loader instead of the error screen
  if (isAccessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-text-primary">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
        <p className="mt-4 text-sm text-text-secondary">Redirecting...</p>
      </div>
    );
  }

  return <>{children}</>;
}

function ShieldAlert(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}
