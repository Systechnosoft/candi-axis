import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes that don't require auth check or are public
const PUBLIC_PATHS = ['/login', '/api/auth'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  let res = NextResponse.next({ request: req });

  // Create Supabase SSR client that reads/refreshes cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — will update cookies if token was rotated
  const { data: { session } } = await supabase.auth.getSession();

  // If user is accessing public path or root '/'
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === '/';

  if (isPublicPath) {
    // If logged-in user tries to visit '/login' or '/', redirect to '/dashboard'
    if (session && (pathname === '/login' || pathname === '/')) {
      const dashboardUrl = req.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      return NextResponse.redirect(dashboardUrl);
    }
    return res;
  }

  // No active Supabase session for protected path → redirect to '/login'
  if (!session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
