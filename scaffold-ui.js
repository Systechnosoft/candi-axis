#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const uiDir = path.join(__dirname, 'ats-ui', 'src');

// Define folders to create
const dirs = [
  'app/(auth)/login',
  'app/(protected)/dashboard',
  'app/(protected)/requisitions',
  'app/(protected)/job-descriptions',
  'app/(protected)/candidates',
  'app/(protected)/applications',
  'app/(protected)/interviews',
  'app/(protected)/offers',
  'app/(protected)/admin',
  'app/(protected)/settings',
  'app/(protected)/notifications',
  'components/common',
  'lib/api',
  'lib/auth',
  'lib/config',
  'lib/permissions',
  'lib/query',
  'types'
];

dirs.forEach(d => fs.mkdirSync(path.join(uiDir, d), { recursive: true }));

// Helper to write file
const write = (p, content) => fs.writeFileSync(path.join(uiDir, p), content.trim() + '\n');

// 1. Login
write('app/(auth)/login/page.tsx', `
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="p-8 bg-white shadow rounded-lg max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-4">ATS Login</h1>
        <p className="text-gray-500 mb-6">SSO / Auth flow placeholder</p>
        <button className="w-full bg-blue-600 text-white rounded py-2">Sign In</button>
      </div>
    </div>
  );
}
`);

// 2. Protected Layout
write('app/(protected)/layout.tsx', `
import { ReactNode } from 'react';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Placeholder */}
      <aside className="w-64 bg-white border-r hidden md:block p-4">
        <h2 className="font-bold text-lg mb-4">ATS Portal</h2>
        <nav className="space-y-2 text-sm text-gray-600">
          <div>Dashboard</div>
          <div>Requisitions</div>
          <div>Candidates</div>
          <div>Interviews</div>
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm p-4 flex justify-between">
          <div className="font-medium">Top Nav Placeholder</div>
          <div className="text-gray-500 text-sm">User Profile</div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
`);

// 3. Protected Pages
const pages = ['dashboard', 'requisitions', 'job-descriptions', 'candidates', 'applications', 'interviews', 'offers', 'admin', 'settings', 'notifications'];
pages.forEach(p => {
  const Name = p.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('') + 'Page';
  write(`app/(protected)/${p}/page.tsx`, `
export default function ${Name}() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 capitalize">${p.replace('-', ' ')}</h1>
      <p className="text-gray-500 mt-2">This module is part of a future implementation phase.</p>
    </div>
  );
}
  `);
});

// 4. API Client Shell
write('lib/api/client.ts', `
/**
 * Minimal API Client placeholder for ATS MVP.
 * Will be wired up to actual fetch / axios and auth interceptors later.
 */
export const apiClient = {
  get: async (url: string) => {
    console.log('[API GET]', url);
    return null;
  },
  post: async (url: string, data: any) => {
    console.log('[API POST]', url, data);
    return null;
  }
};
`);

// 5. Auth State Placeholder
write('lib/auth/session.ts', `
/**
 * JWT / Auth Session State Placeholder
 */
export const useAuth = () => {
  // TODO: Implement actual session context
  return {
    isAuthenticated: false,
    user: null,
    login: () => {},
    logout: () => {}
  };
};
`);

// 6. Permission config placeholder
write('lib/permissions/config.ts', `
/**
 * RBAC/Permission config placeholder mapping UI routes to modules.
 */
export const ROUTE_PERMISSIONS = {
  '/dashboard': 'dashboard',
  '/requisitions': 'requisitions',
  '/candidates': 'candidates',
};
`);

// 7. Loaders / Errors
write('components/common/Loader.tsx', `
export const Loader = () => <div className="p-4 text-center text-gray-500 animate-pulse">Loading...</div>;
`);
write('components/common/EmptyState.tsx', `
export const EmptyState = ({ message }: { message: string }) => <div className="p-8 text-center text-gray-500 border rounded bg-gray-50">{message}</div>;
`);

// Env example
fs.writeFileSync(path.join(__dirname, 'ats-ui', '.env.example'), 'NEXT_PUBLIC_API_URL=http://localhost:3000\n');
fs.writeFileSync(path.join(__dirname, 'ats-api', '.env.example'), 'PORT=3000\nDATABASE_URL=postgresql://postgres:postgres@localhost:5432/ats\nJWT_SECRET=placeholder\n');

console.log('UI Scaffolding complete');
