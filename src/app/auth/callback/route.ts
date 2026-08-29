import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const { search, searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  // A password-recovery or invite link carries a `token_hash`/`type` pair
  // instead of a `code` — every place in this app that builds one of those
  // is supposed to point directly at /auth/reset-password, which knows how
  // to handle it, but if one ever lands here anyway (e.g. a misconfigured
  // Supabase email template or Site URL), forward it there with the same
  // query string rather than silently falling through to /auth/login below
  // — that's the exact bug this guards against.
  if (!code && token_hash && (type === "recovery" || type === "invite")) {
    return NextResponse.redirect(`${origin}/auth/reset-password${search}`);
  }

  if (code || (token_hash && type === "signup")) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    // Two ways a signup-confirmation link can reach us: the standard PKCE
    // `?code=` (exchanged for a session), or a `token_hash`+`type=signup`
    // pair from a custom email template (verified directly — this is the
    // one case reset-password/page.tsx can't handle, since it hardcodes
    // type to "recovery"/"invite" and would silently confirm nothing).
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: token_hash!, type: "signup" });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If something went wrong, send to login
  return NextResponse.redirect(`${origin}/auth/login`);
}
