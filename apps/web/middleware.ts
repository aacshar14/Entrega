import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const host = request.headers.get('host')

  // List of domains to redirect to the apex (entrega.space)
  const domainsToRedirect = ['www.entrega.space', 'web.entrega.space']

  if (host && domainsToRedirect.includes(host)) {
    // Force redirect to apex domain with 308 (Permanent Redirect)
    // Preserving the path and search parameters
    return NextResponse.redirect(`https://entrega.space${url.pathname}${url.search}`, 308)
  }

  return NextResponse.next()
}

// Ensure middleware only runs on relevant paths to minimize latency
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
