"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useConfirm } from "@/components/providers/confirm-provider";
import { useHouse } from "@/components/providers/house-context";
import { LocaleSwitcher } from "@/components/locale/locale-switcher";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  regenerateInviteAction,
  removeMemberAction,
  transferAdminAction,
  updateHouseNameAction,
} from "@/app/[locale]/(app)/settings/actions";
import type { Profile } from "@/lib/database.types";

export function SettingsPanel({
  members,
  currentUserId,
}: {
  members: Pick<Profile, "id" | "username" | "house_role" | "total_xp" | "current_level">[];
  currentUserId: string;
}) {
  const { house, isAdmin } = useHouse();
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const confirm = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState(house.invite_code);
  const [loading, setLoading] = useState(false);

  async function handleRename(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    const result = await updateHouseNameAction(new FormData(e.currentTarget));
    setLoading(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  async function handleRegenerate() {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    const result = await regenerateInviteAction();
    setLoading(false);
    if (!result.success) setError(result.error);
    else if (result.inviteCode) {
      setInviteCode(result.inviteCode);
      router.refresh();
    }
  }

  async function handleRemove(userId: string) {
    if (
      !(await confirm({
        message: t("removeConfirm"),
        confirmLabel: tc("delete"),
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    const result = await removeMemberAction(userId);
    setLoading(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  async function handleTransfer(userId: string) {
    if (!(await confirm({ message: t("transferConfirm") }))) return;
    setLoading(true);
    const result = await transferAdminAction(userId);
    setLoading(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="bg-surface-container-lowest shadow-card border-outline-variant/20 rounded-3xl border p-6">
        <LocaleSwitcher variant="full" />
      </section>

      <InstallAppPrompt />

      <section className="bg-surface-container-lowest shadow-card border-outline-variant/20 rounded-3xl border p-6">
        <h2 className="text-headline-md text-on-surface font-semibold">
          {t("houseDetails")}
        </h2>
        {isAdmin ? (
          <form onSubmit={handleRename} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("houseName")}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={house.name}
                required
                className="h-12 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="btn-press rounded-xl font-bold"
            >
              {t("saveName")}
            </Button>
          </form>
        ) : (
          <p className="mt-2 text-lg font-medium">{house.name}</p>
        )}
      </section>

      <section className="bg-surface-container-lowest shadow-card border-outline-variant/20 rounded-3xl border p-6">
        <h2 className="text-headline-md text-on-surface font-semibold">
          {t("inviteCode")}
        </h2>
        <p className="font-heading text-primary mt-3 text-2xl font-bold tracking-widest">
          {inviteCode}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => navigator.clipboard.writeText(inviteCode)}
          >
            {tc("copyCode")}
          </Button>
          {isAdmin && (
            <Button
              type="button"
              disabled={loading}
              className="btn-press rounded-xl font-bold"
              onClick={handleRegenerate}
            >
              {t("regenerate")}
            </Button>
          )}
        </div>
      </section>

      <section className="bg-surface-container-lowest shadow-card border-outline-variant/20 rounded-3xl border p-6">
        <h2 className="text-headline-md text-on-surface font-semibold">
          {t("roommates")}
        </h2>
        <ul className="mt-4 space-y-3">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background px-4 py-3"
            >
              <div>
                <span className="font-medium">{member.username}</span>
                <span
                  className={
                    member.house_role === "admin"
                      ? "bg-primary/10 text-primary ms-2 rounded-full px-2 py-0.5 text-xs font-semibold"
                      : "bg-muted text-muted-foreground ms-2 rounded-full px-2 py-0.5 text-xs font-semibold"
                  }
                >
                  {member.house_role === "admin"
                    ? tc("admin")
                    : tc("member")}
                </span>
                <p className="text-muted-foreground text-sm">
                  {tc("xpShort", {
                    level: member.current_level,
                    xp: member.total_xp,
                  })}
                </p>
              </div>
              {isAdmin && member.id !== currentUserId && (
                <div className="flex gap-2">
                  {member.house_role === "member" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs"
                      disabled={loading}
                      onClick={() => handleTransfer(member.id)}
                    >
                      {t("makeAdmin")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="rounded-lg text-xs"
                    disabled={loading}
                    onClick={() => handleRemove(member.id)}
                  >
                    {t("remove")}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
