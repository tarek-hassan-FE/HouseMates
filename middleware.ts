import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18n = createIntlMiddleware(routing);

/** Routes outside app/[locale] — must not be rewritten by next-intl. */
function skipsI18n(pathname: string): boolean {
  return pathname.startsWith("/auth");
}

export async function middleware(request: NextRequest) {
  if (skipsI18n(request.nextUrl.pathname)) {
    return updateSession(request);
  }

  const response = handleI18n(request);
  return updateSession(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
