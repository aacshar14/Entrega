import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state"); // Could contain tenant info if passed

  // Log for debugging (production hardening: don't log full code in real prod, but helpful for first sync)
  console.log("Meta Auth Callback received:", {
    hasCode: !!code,
    error,
    state,
  });

  // Base URL for redirect (fallback to current origin)
  const origin = request.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(
      `${origin}/settings/integrations/whatsapp?error=${error}`,
    );
  }

  if (code) {
    // Redirect back to the WhatsApp integration page with the code
    // The page will handle the backend exchange automatically
    return NextResponse.redirect(
      `${origin}/settings/integrations/whatsapp?code=${code}`,
    );
  }

  // Fallback if no code/error
  return NextResponse.redirect(`${origin}/settings/integrations/whatsapp`);
}
