import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Yalnızca yönetim adreslerinde çalışır. Herkese açık sayfalar statiktir ve
// buraya hiç uğramaz. Oturum çerezi olmayan istekler (botlar dahil) Supabase'e
// gitmeden, burada geri çevrilir; sayfaların kendi oturum denetimi de ayrıca durur.
const AUTH_COOKIE = /^sb-.+-auth-token(?:\.\d+)?$/;

export async function middleware(request: NextRequest) {
  const hasSession = request.cookies.getAll().some((c) => AUTH_COOKIE.test(c.name));
  if (!hasSession) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/giris', request.url));
  }

  // Oturumu tazele (süresi dolmak üzere olan erişim anahtarı yenilenir)
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/indir'],
};
