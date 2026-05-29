"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useHouse } from "@/components/providers/house-context";
import { AvatarRing } from "@/components/design/avatar-ring";
import { MaterialIcon } from "@/components/design/material-icon";

type DropdownPosition = {
  top: number;
  left?: number;
  right?: number;
  width: number;
};

function useDropdownPosition(
  anchorRef: React.RefObject<HTMLButtonElement | null>,
  open: boolean,
): DropdownPosition | null {
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPosition(null);
      return;
    }

    function update() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = 220;
      const isRtl = document.documentElement.dir === "rtl";
      const top = rect.bottom + 8;

      if (isRtl) {
        setPosition({
          top,
          left: Math.max(8, rect.left),
          width,
        });
      } else {
        setPosition({
          top,
          right: Math.max(8, window.innerWidth - rect.right),
          width,
        });
      }
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, open]);

  return position;
}

function ProfileMenuDropdown({
  anchorRef,
  open,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const position = useDropdownPosition(anchorRef, open);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose, anchorRef]);

  async function signOut() {
    onClose();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!mounted || !open || !position) return null;

  const itemClass =
    "text-label-md text-on-surface hover:bg-surface-container-highest flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors";

  return createPortal(
    <>
      <div className="fixed inset-0 z-[90]" aria-hidden onClick={onClose} />
      <div
        ref={panelRef}
        id="profile-menu-dropdown"
        role="menu"
        aria-label={t("profileAria")}
        className="border-outline-variant/20 bg-surface-container-lowest fixed z-[100] overflow-hidden rounded-2xl border p-2 shadow-xl"
        style={{
          top: position.top,
          left: position.left,
          right: position.right,
          width: position.width,
        }}
      >
        <Link
          href="/profile"
          role="menuitem"
          className={itemClass}
          onClick={onClose}
        >
          <MaterialIcon name="person" size={20} />
          {t("profile")}
        </Link>
        <Link
          href="/settings"
          role="menuitem"
          className={itemClass}
          onClick={onClose}
        >
          <MaterialIcon name="settings" size={20} />
          {t("settings")}
        </Link>
        <button
          type="button"
          role="menuitem"
          className={cn(itemClass, "text-on-surface-variant hover:text-on-surface")}
          onClick={() => void signOut()}
        >
          <MaterialIcon name="logout" size={20} />
          {t("signOut")}
        </button>
      </div>
    </>,
    document.body,
  );
}

export function ProfileMenu() {
  const { profile } = useHouse();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="border-outline-variant/30 flex items-center gap-3 border-s ps-3 sm:ps-4">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "btn-press flex items-center gap-3 rounded-xl transition-colors",
          open && "bg-primary/10",
        )}
        aria-label={t("profileAria")}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="profile-menu-dropdown"
      >
        <AvatarRing
          src={profile.avatar_url}
          name={profile.username}
          size="md"
          ring="primary"
        />
        <div className="hidden flex-col leading-none text-start lg:flex">
          <span className="text-label-md text-on-surface font-bold">
            {profile.username}
          </span>
          <span className="text-secondary text-[10px] font-bold tracking-widest uppercase">
            {tc("levelShort", { level: profile.current_level })}
          </span>
        </div>
      </button>
      <ProfileMenuDropdown
        anchorRef={buttonRef}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
