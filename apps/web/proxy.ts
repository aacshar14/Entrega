import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./utils/supabase/proxy";

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get("host");

  // List of domains to redirect to the apex (entrega.space)
  const domainsToRedirect = [
    "www.entrega.space",
    "web.entrega.space",
    "app.entrega.space",
  ];

  if (host && domainsToRedirect.includes(host)) {
    // Force redirect to apex domain with 308 (Permanent Redirect)
    url.host = "entrega.space";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this matcher to fit your needs.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
