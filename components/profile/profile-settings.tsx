"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/providers/confirm-provider";
import { createClient } from "@/lib/supabase/client";
import {
  leaveHouseAction,
  updateUsernameAction,
} from "@/app/[locale]/(app)/profile/actions";
import { cn } from "@/lib/utils";

const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "min")
    .max(24, "max"),
});

type UsernameForm = z.infer<typeof usernameSchema>;

function SettingsRow({
  icon,
  label,
  description,
  onClick,
  disabled,
  destructive,
  trailing,
}: {
  icon: string;
  label: string;
  description?: string;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  trailing?: React.ReactNode;
}) {
  const Comp = onClick && !disabled ? "button" : "div";
  return (
    <Comp
      type={onClick && !disabled ? "button" : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "btn-press flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-start transition-colors",
        disabled && "opacity-60",
        onClick && !disabled && "hover:bg-surface-container-low",
        destructive && !disabled && "hover:bg-error-container/30",
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
      {trailing ?? (
        onClick &&
        !disabled && (
          <MaterialIcon
            name="chevron_right"
            className="text-on-surface-variant shrink-0"
            size={22}
          />
        )
      )}
    </Comp>
  );
}

export function ProfileSettings({ username }: { username: string }) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const confirm = useConfirm();
  const router = useRouter();
  const [editingName, setEditingName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UsernameForm>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username },
  });

  async function onSubmitUsername(data: UsernameForm) {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("username", data.username);
    const result = await updateUsernameAction(fd);
    setLoading(false);
    if (!result.success) {
      const msg =
        result.error.includes("taken") || result.error.includes("23505")
          ? t("usernameTaken")
          : result.error;
      setError(msg);
      return;
    }
    setEditingName(false);
    router.refresh();
  }

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
    <div className="space-y-6">
      <section className="glass-card shadow-card rounded-[2rem] p-2">
        <h3 className="text-label-md text-on-surface-variant px-4 pt-4 pb-1 font-bold tracking-wider uppercase">
          {t("accountSettings")}
        </h3>
        <div className="divide-outline-variant/20 divide-y px-1">
          <SettingsRow
            icon="badge"
            label={t("editName")}
            description={username}
            onClick={() => {
              setEditingName((v) => !v);
              setError(null);
            }}
          />
          <SettingsRow
            icon="notifications"
            label={t("notifications")}
            description={tc("comingSoon")}
            disabled
            trailing={
              <span className="text-label-sm text-on-surface-variant rounded-full bg-surface-container-high px-2 py-0.5">
                {tc("comingSoon")}
              </span>
            }
          />
        </div>
        {editingName && (
          <form
            onSubmit={handleSubmit(onSubmitUsername)}
            className="border-outline-variant/20 space-y-3 border-t px-4 py-4"
          >
            <div>
              <Label htmlFor="profile-username">{t("displayName")}</Label>
              <Input
                id="profile-username"
                {...register("username")}
                className="mt-2"
                autoComplete="nickname"
              />
              {errors.username?.message === "min" && (
                <p className="text-body-md text-error mt-1">{t("usernameMin")}</p>
              )}
              {errors.username?.message === "max" && (
                <p className="text-body-md text-error mt-1">{t("usernameMax")}</p>
              )}
            </div>
            {error && (
              <p className="text-body-md text-error" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {tc("save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingName(false)}
              >
                {tc("cancel")}
              </Button>
            </div>
          </form>
        )}
      </section>

      <section className="glass-card shadow-card rounded-[2rem] p-2">
        <h3 className="text-label-md text-error px-4 pt-4 pb-1 font-bold tracking-wider uppercase">
          {t("dangerZone")}
        </h3>
        <div className="divide-outline-variant/20 divide-y px-1">
          <SettingsRow
            icon="logout"
            label={tn("signOut")}
            onClick={handleSignOut}
          />
          <SettingsRow
            icon="door_front"
            label={t("leaveHouse")}
            description={t("leaveHouseDesc")}
            destructive
            onClick={handleLeaveHouse}
          />
        </div>
        {error && !editingName && (
          <p className="text-body-md text-error px-4 py-3" role="alert">
            {error}{" "}
            {error === t("leaveAdminHint") && (
              <Link href="/settings" className="text-primary font-semibold underline">
                {t("goToSettings")}
              </Link>
            )}
          </p>
        )}
      </section>
    </div>
  );
}
