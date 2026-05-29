import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Plus_Jakarta_Sans, Cairo } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import {
  getLocale,
  getMessages,
  getTranslations,
} from "next-intl/server";
import { ConfirmProvider } from "@/components/providers/confirm-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0058be",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("title"),
    description: t("description"),
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Roomies",
    },
    icons: {
      icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const isRtl = locale === "ar";

  return (
    <html
      lang={locale}
      dir={isRtl ? "rtl" : "ltr"}
      className={`${plusJakarta.variable} ${inter.variable} ${cairo.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`min-h-full overflow-x-hidden ${isRtl ? "font-[family-name:var(--font-cairo)]" : ""}`}
      >
        <Script id="roomies-deferred-install-prompt" strategy="beforeInteractive">
          {`
            window.__roomiesDeferredInstallPrompt = null;
            window.addEventListener("beforeinstallprompt", function (e) {
              e.preventDefault();
              window.__roomiesDeferredInstallPrompt = e;
            });
          `}
        </Script>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
