import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from '@/lib/i18n-config';
import type { Locale } from '@/lib/i18n-config';
import {
  APP_SUBDOMAIN,
  buildAdminUrlFromHostname,
  parseHostname,
} from '@/utils/subdomain';

const ADMIN_AUTH_COOKIE = 'BRV_ADMIN_AUTH';

function getLocale(request: NextRequest): Locale {
  // 1. Cookie takes highest priority (user explicitly selected language)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // 2. Parse Accept-Language header for browser preference
  const acceptLanguage = request.headers.get('accept-language') ?? '';
  for (const part of acceptLanguage.split(',')) {
    const lang = part.split(';')[0].trim().split('-')[0].toLowerCase();
    if (locales.includes(lang as Locale)) {
      return lang as Locale;
    }
  }

  return defaultLocale;
}

const ADMIN_PATHS = ['/admin', '/login', '/forgot-password', '/reset-password'];

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function redirectTo(origin: string, pathname: string, search: string): NextResponse {
  const url = new URL(pathname, origin);
  url.search = search;
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Skip static files and API routes for all subdomains
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|eot|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  const host = request.headers.get('host') ?? '';
  const hostInfo = parseHostname(host);
  const protocol = request.headers.get('x-forwarded-proto') ?? (hostInfo.isLocalhostLike ? 'http' : 'https');
  const adminOrigin = buildAdminUrlFromHostname(host, protocol);
  const isAuthenticated = request.cookies.get(ADMIN_AUTH_COOKIE)?.value === '1';
  const isAppHost = hostInfo.isLocalhostLike
    ? hostInfo.hostname === `${APP_SUBDOMAIN}.localhost`
    : hostInfo.subdomain === APP_SUBDOMAIN;

  // ── Admin subdomain (app.* / app.localhost) ──────────────────────────────
  if (isAppHost) {
    // Redirect bare root to login unless the user is already authenticated.
    if (pathname === '/') {
      if (isAuthenticated) {
        return redirectTo(adminOrigin, '/admin', search);
      }

      const loginUrl = new URL('/login', adminOrigin);
      loginUrl.searchParams.set('next', '/admin');
      return NextResponse.redirect(loginUrl);
    }

    // Admin auth routes are available to everyone.
    if (pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password') {
      return NextResponse.next();
    }

    // Known admin routes stay inside the shell; anonymous users go to login first.
    if (pathname.startsWith('/admin')) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', adminOrigin);
        loginUrl.searchParams.set('next', `${pathname}${search}`);
        return NextResponse.redirect(loginUrl);
      }

      return NextResponse.next();
    }

    // Non-admin routes on the app host should either log in first or bounce
    // into the corresponding admin route for authenticated users.
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', adminOrigin);
      loginUrl.searchParams.set('next', `/admin${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }

    return redirectTo(adminOrigin, `/admin${pathname}`, search);
  }

  // Admin routes should only resolve on the admin host.
  if (isAdminPath(pathname)) {
    return redirectTo(adminOrigin, pathname, search);
  }

  // Other subdomains are outside the routing contract for this app.
  // Leave them alone instead of rewriting them into the public site.
  if (hostInfo.subdomain) {
    return NextResponse.next();
  }

  // ── Public/root domain ────────────────────────────────────────────────────

  // Already has a locale prefix — nothing to do.
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  if (hasLocale) return NextResponse.next();

  // Redirect to locale-prefixed path.
  const locale = getLocale(request);
  const redirectUrl = new URL(`/${locale}${pathname === '/' ? '' : pathname}`, request.url);
  redirectUrl.search = request.nextUrl.search;

  const response = NextResponse.redirect(redirectUrl);
  // Persist detected locale so subsequent visits skip header negotiation
  response.cookies.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)'],
};
