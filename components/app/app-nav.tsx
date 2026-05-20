"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useHouse } from "@/components/providers/house-context";
import { MaterialIcon } from "@/components/design/material-icon";
import { AvatarRing } from "@/components/design/avatar-ring";
import { LocaleSwitcher } from "@/components/locale/locale-switcher";

const sidebarNav = [
  { href: "/dashboard", key: "dashboard", icon: "dashboard" },
  { href: "/chores", key: "chores", icon: "task_alt" },
  { href: "/rewards", key: "rewards", icon: "redeem" },
  { href: "/ledger", key: "finances", icon: "payments" },
  { href: "/dashboard#leaderboard", key: "leaderboard", icon: "leaderboard" },
  { href: "/settings", key: "houseSettings", icon: "settings" },
] as const;

const mobileNavBeforeFab = [
  { href: "/dashboard", key: "dashboard", icon: "dashboard" },
  { href: "/chores", key: "chores", icon: "task_alt" },
] as const;

const mobileNavAfterFab = [
  { href: "/dashboard#leaderboard", key: "leaderboard", icon: "leaderboard" },
  { href: "/ledger", key: "finances", icon: "payments" },
] as const;

function mobileNavLinkClass(active: boolean) {
  return cn(
    "btn-press flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-1 text-xs font-bold uppercase",
    active ? "text-primary" : "text-on-surface-variant",
  );
}

function subscribeHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function getHash() {
  return typeof window !== "undefined" ? window.location.hash : "";
}

function useHash() {
  return useSyncExternalStore(subscribeHash, getHash, () => "");
}

function isActive(pathname: string, href: string, hash: string) {
  if (href.includes("#")) {
    const [path, fragment] = href.split("#");
    return pathname === path && hash === `#${fragment}`;
  }
  if (href === "/dashboard" && pathname === "/dashboard" && hash === "#leaderboard") {
    return false;
  }
  return pathname === href;
}

function pageTitleKey(pathname: string, hash: string): (typeof sidebarNav)[number]["key"] | null {
  if (pathname === "/dashboard" && hash === "#leaderboard") {
    return "leaderboard";
  }
  const match = sidebarNav.find(
    (item) => !item.href.includes("#") && item.href === pathname,
  );
  return match?.key ?? null;
}

export function AppTopBar() {
  const pathname = usePathname();
  const hash = useHash();
  const { profile } = useHouse();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const titleKey = pageTitleKey(pathname, hash);
  const pageTitle = titleKey ? t(titleKey) : tc("appName");

  return (
    <header className="bg-surface/60 border-outline-variant/10 fixed inset-x-0 top-0 z-50 h-16 w-full border-b shadow-sm backdrop-blur-md">
      <div className="flex h-full w-full items-center">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 sm:px-6">
          <h1 className="text-headline-md text-on-surface min-w-0 truncate font-bold md:text-primary">
            {pageTitle}
          </h1>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link
              href="/settings"
              className={cn(
                "btn-press text-on-surface-variant hover:text-primary-container flex size-11 items-center justify-center rounded-full transition-colors md:hidden",
                pathname === "/settings" && "text-primary",
              )}
              aria-label={t("houseSettings")}
              aria-current={pathname === "/settings" ? "page" : undefined}
            >
              <MaterialIcon name="settings" filled={pathname === "/settings"} />
            </Link>
            <LocaleSwitcher />
            <button
              type="button"
              className="btn-press relative flex size-11 items-center justify-center text-on-surface-variant transition-colors hover:text-primary-container"
              aria-label={t("notifications")}
            >
              <MaterialIcon name="notifications" />
              <span className="bg-error absolute top-1 end-1 size-2 rounded-full border-2 border-white" />
            </button>
            <div className="border-outline-variant/30 flex items-center gap-3 border-s ps-3 sm:ps-4">
              <AvatarRing
                src={profile.avatar_url}
                name={profile.username}
                size="md"
                ring="primary"
              />
              <div className="hidden flex-col leading-none lg:flex">
                <span className="text-label-md text-on-surface font-bold">
                  {profile.username}
                </span>
                <span className="text-secondary text-[10px] font-bold tracking-widest uppercase">
                  {tc("levelShort", { level: profile.current_level })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppSidebar({ houseName }: { houseName: string }) {
  const pathname = usePathname();
  const hash = useHash();
  const router = useRouter();
  const t = useTranslations("nav");

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="bg-surface top-16 hidden w-64 shrink-0 flex-col self-start border-e border-outline-variant/10 p-6 md:sticky md:flex md:h-[calc(100dvh-4rem)] md:overflow-y-auto">
      <div className="mb-10 flex items-center gap-3">
        <div className="bg-primary-container text-on-primary-container flex size-10 items-center justify-center rounded-xl">
          <MaterialIcon name="apartment" />
        </div>
        <div className="min-w-0">
          <h2 className="text-label-md text-on-surface truncate font-semibold">
            {houseName}
          </h2>
          <p className="text-on-surface-variant text-[10px] tracking-wider uppercase">
            {t("familyRoom")}
          </p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {sidebarNav.map(({ href, key, icon }) => {
          const active = isActive(pathname, href, hash);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "btn-press text-label-md flex items-center gap-3 rounded-xl px-6 py-3 transition-all",
                active
                  ? "bg-primary-container text-on-primary-container font-bold"
                  : "text-on-surface-variant hover:bg-surface-container-highest",
              )}
            >
              <MaterialIcon name={icon} filled={active} />
              {t(key)}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/chores?add=1"
        className="btn-press bg-primary text-primary-foreground mt-6 flex items-center justify-center gap-2 rounded-xl py-4 font-bold shadow-lg transition-shadow hover:shadow-xl"
      >
        <MaterialIcon name="add_task" />
        {t("logChore")}
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="text-on-surface-variant hover:text-on-surface text-label-md mt-4 flex items-center gap-3 rounded-xl px-6 py-2"
      >
        <MaterialIcon name="logout" />
        {t("signOut")}
      </button>
    </aside>
  );
}

type MobileNavKey =
  | (typeof mobileNavBeforeFab)[number]["key"]
  | (typeof mobileNavAfterFab)[number]["key"];

function MobileNavLink({
  href,
  labelKey,
  icon,
  active,
}: {
  href: string;
  labelKey: MobileNavKey;
  icon: string;
  active: boolean;
}) {
  const t = useTranslations("nav");
  return (
    <Link
      href={href}
      className={mobileNavLinkClass(active)}
      aria-current={active ? "page" : undefined}
    >
      <MaterialIcon name={icon} filled={active} size={22} />
      <span className="max-w-[4.5rem] truncate leading-tight">{t(labelKey)}</span>
    </Link>
  );
}

export function AppBottomNav() {
  const pathname = usePathname();
  const hash = useHash();
  const t = useTranslations("nav");

  return (
    <nav
      className="bg-surface-container-lowest border-outline-variant/20 fixed bottom-0 start-0 z-50 grid w-full grid-cols-5 items-end gap-1 border-t px-1 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      aria-label={t("mainNavigation")}
    >
      {mobileNavBeforeFab.map(({ href, key, icon }) => (
        <MobileNavLink
          key={href}
          href={href}
          labelKey={key}
          icon={icon}
          active={isActive(pathname, href, hash)}
        />
      ))}
      <div className="relative flex justify-center -top-5">
        <Link
          href="/chores?add=1"
          className="btn-press bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-full shadow-lg"
          aria-label={t("quickAdd")}
        >
          <MaterialIcon name="add" size={28} />
        </Link>
      </div>
      {mobileNavAfterFab.map(({ href, key, icon }) => (
        <MobileNavLink
          key={href}
          href={href}
          labelKey={key}
          icon={icon}
          active={isActive(pathname, href, hash)}
        />
      ))}
    </nav>
  );
}
