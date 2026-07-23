'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (signInError) {
        setError(signInError.message || 'Invalid email or password.');
        setLoading(false);
        return;
      }

      // Fetch the ATS session data to determine access/roles before redirecting
      const { data: { session: sbSession } } = await supabase.auth.getSession();
      if (sbSession?.access_token) {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${sbSession.access_token}` },
        });
        if (res.ok) {
          const userSession = await res.json();
          // Check if dashboard is restricted or role contains interviewer
          const roles = userSession.roles || [];
          const access = userSession.access || {};
          const hasDashboard = access['dashboard'] === 'viewer' || access['dashboard'] === 'editor' || access['dashboard'] === 'administrator';
          const isInterviewer = roles.includes('interviewer') && !roles.includes('admin') && !roles.includes('super_admin') && !roles.includes('hr_recruiter');

          if (isInterviewer || !hasDashboard) {
            router.push('/tasks');
            router.refresh();
            return;
          }
        }
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="bg-surface border border-border rounded-md shadow-sm p-8 w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold text-text-primary">Sign in</h1>
          <p className="text-[14px] text-text-secondary mt-1">Systechnosoft ATS — Internal Portal</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-text-primary">
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              placeholder="you@systechnosoft.in"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-text-primary">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-[13px] text-status-error bg-status-error/5 border border-status-error/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-9 w-full rounded-md bg-brand text-white text-[14px] font-medium hover:bg-brand-hover active:bg-brand-active disabled:opacity-60 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
