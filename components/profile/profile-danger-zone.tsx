"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";
import { useConfirm } from "@/components/providers/confirm-provider";
import { createClient } from "@/lib/supabase/client";
import { leaveHouseAction } from "@/app/[locale]/(app)/profile/actions";
import { cn } from "@/lib/utils";

function DangerRow({
  icon,
  label,
  description,
  onClick,
  destructive,
}: {
  icon: string;
  label: string;
  description?: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "btn-press flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-start transition-colors",
        destructive
          ? "hover:bg-error-container/30"
          : "hover:bg-surface-container-low",
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          destructive
            ? "bg-error-container text-error"
            : "bg-primary-fixed text-primary",
        )}
      >
        <MaterialIcon name={icon} size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "text-label-md block font-semibold",
            destructive ? "text-error" : "text-on-surface",
          )}
        >
          {label}
        </span>
        {description && (
          <span className="text-body-md text-on-surface-variant block">
            {description}
          </span>
        )}
      </span>
      <MaterialIcon
        name="chevron_right"
        className="text-on-surface-variant shrink-0"
        size={22}
      />
    </button>
  );
}

export function ProfileDangerZone() {
  const t = useTranslations("profile");
  const tn = useTranslations("nav");
  const confirm = useConfirm();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLeaveHouse() {
    if (
      !(await confirm({
        message: t("leaveConfirm"),
        confirmLabel: t("leaveHouse"),
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    setError(null);
    try {
      const result = await leaveHouseAction();
      if (result && !result.success) {
        setError(
          result.error.toLowerCase().includes("admin")
            ? t("leaveAdminHint")
            : result.error,
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <section className="glass-card shadow-card rounded-[2rem] p-2 lg:col-span-4">
      <h3 className="text-label-md text-error px-4 pt-4 pb-1 font-bold tracking-wider uppercase">
        {t("dangerZone")}
      </h3>
      <div className="divide-outline-variant/20 divide-y px-1">
        <DangerRow
          icon="logout"
          label={tn("signOut")}
          onClick={handleSignOut}
        />
        <DangerRow
          icon="door_front"
          label={t("leaveHouse")}
          description={t("leaveHouseDesc")}
          destructive
          onClick={handleLeaveHouse}
        />
      </div>
      {error && (
        <p className="text-body-md text-error px-4 py-3" role="alert">
          {error}{" "}
          {error === t("leaveAdminHint") && (
            <Link
              href="/settings"
              className="text-primary font-semibold underline"
            >
              {t("goToSettings")}
            </Link>
          )}
        </p>
      )}
      {loading && (
        <p className="text-label-sm text-on-surface-variant px-4 pb-3">
          …
        </p>
      )}
    </section>
  );
}
