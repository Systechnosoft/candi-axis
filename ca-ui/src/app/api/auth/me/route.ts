import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Accept token from Authorization header (passed explicitly by AuthContext)
  // or from cookie-based session (Supabase SSR auto-sets sb-* cookies)
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const apiUrl = process.env.API_URL || 'http://127.0.0.1:3000';
  console.log('[Auth Route] Fetching ATS session from:', apiUrl);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    console.log('[Auth Route] Received response:', res.status);

  if (!res.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await res.json();
  return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Auth Route] Error fetching ATS session:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
