import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

function cloneResponseWithRequest(
  source: NextResponse,
  request: NextRequest,
): NextResponse {
  const cloned = NextResponse.next({ request });
  source.headers.forEach((value, key) => {
    cloned.headers.set(key, value);
  });
  source.cookies.getAll().forEach((cookie) => {
    cloned.cookies.set(cookie.name, cookie.value);
  });
  return cloned;
}

export async function updateSession(
  request: NextRequest,
  baseResponse?: NextResponse,
) {
  let supabaseResponse = baseResponse ?? NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = cloneResponseWithRequest(supabaseResponse, request);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth/callback");
  const isPublicRoute = isAuthRoute;

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie.name, cookie.value);
    });
    return redirect;
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("house_id, vault_intro_seen")
      .eq("id", user.id)
      .single();

    const hasHouse = Boolean(profile?.house_id);
    const vaultIntroSeen = profile?.vault_intro_seen ?? true;

    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = hasHouse
        ? vaultIntroSeen
          ? "/dashboard"
          : "/vault"
        : "/onboarding";
      const redirect = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie.name, cookie.value);
      });
      return redirect;
    }

    if (!hasHouse && pathname !== "/onboarding") {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      const redirect = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie.name, cookie.value);
      });
      return redirect;
    }

    if (hasHouse && pathname === "/onboarding") {
      const url = request.nextUrl.clone();
      url.pathname = vaultIntroSeen ? "/dashboard" : "/vault";
      const redirect = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie.name, cookie.value);
      });
      return redirect;
    }

    if (hasHouse && !vaultIntroSeen && pathname !== "/vault") {
      const url = request.nextUrl.clone();
      url.pathname = "/vault";
      const redirect = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie.name, cookie.value);
      });
      return redirect;
    }

    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = hasHouse
        ? vaultIntroSeen
          ? "/dashboard"
          : "/vault"
        : "/onboarding";
      const redirect = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie.name, cookie.value);
      });
      return redirect;
    }
  }

  return supabaseResponse;
}
