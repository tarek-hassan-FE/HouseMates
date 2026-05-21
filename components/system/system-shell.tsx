"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { MaterialIcon } from "@/components/design/material-icon";
import { LocaleSwitcher } from "@/components/locale/locale-switcher";

export function SystemShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("system");
  const tNav = useTranslations("nav");
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-outline-variant/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-margin-mobile md:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MaterialIcon name="monitoring" size={22} filled />
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-semibold text-on-surface">
                {t("title")}
              </p>
              <p className="truncate text-xs text-on-surface-variant">{t("subtitle")}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LocaleSwitcher />
            <Link
              href="/dashboard"
              className="btn-press hidden items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-primary hover:bg-primary-fixed sm:inline-flex"
            >
              <MaterialIcon name="dashboard" size={20} />
              {t("backToApp")}
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="btn-press inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high"
              aria-label={tNav("signOut")}
            >
              <MaterialIcon name="logout" size={20} />
              <span className="hidden sm:inline">{tNav("signOut")}</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-margin-mobile py-8 md:px-10 md:py-10">
        {children}
      </main>
    </div>
  );
}
