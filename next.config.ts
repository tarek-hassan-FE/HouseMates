import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

function supabaseImagePatterns(): Array<{
  protocol: "https";
  hostname: string;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    const { hostname } = new URL(url);
    return [{ protocol: "https" as const, hostname }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    // Ensures `next-intl/config` resolves in `next dev` (Turbopack)
    resolveAlias: {
      "next-intl/config": "./i18n/request.ts",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      ...supabaseImagePatterns(),
    ],
  },
};

export default withNextIntl(nextConfig);
