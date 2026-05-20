"use client";

import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChoreFrequency, Profile } from "@/lib/database.types";

const FREQ_KEYS: Record<ChoreFrequency, string> = {
  daily: "freqDaily",
  weekly: "freqWeekly",
  biweekly: "freqBiweekly",
  monthly: "freqMonthly",
  once: "freqOnce",
};

type ChoreAddModalProps = {
  open: boolean;
  onClose: () => void;
  members: Profile[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  error: string | null;
};

export function ChoreAddModal({
  open,
  onClose,
  members,
  onSubmit,
  error,
}: ChoreAddModalProps) {
  const t = useTranslations("chores");
  const tc = useTranslations("common");

  if (!open) return null;

  return (
    <div
      className="bg-foreground/40 fixed inset-0 z-[60] flex items-end justify-center overscroll-contain p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="chore-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={tc("closeDialog")}
        onClick={onClose}
      />
      <div className="bg-surface-container-lowest relative max-h-[min(90dvh,100%)] w-full max-w-lg overflow-y-auto rounded-t-[2rem] shadow-2xl sm:rounded-[2rem]">
        <div className="bg-primary text-primary-foreground flex items-center justify-between p-8">
          <h2 id="chore-modal-title" className="text-headline-md font-bold">
            {t("logChoreModal")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-press rounded-full p-1"
            aria-label={tc("close")}
          >
            <MaterialIcon name="close" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 p-8">
          <div className="space-y-2">
            <Label htmlFor="title">{tc("title")}</Label>
            <Input
              id="title"
              name="title"
              required
              className="h-14 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Input
              id="description"
              name="description"
              className="h-14 rounded-xl"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="frequency">{t("frequency")}</Label>
              <select
                id="frequency"
                name="frequency"
                className="border-input h-14 w-full rounded-xl border bg-transparent px-3 text-sm"
                defaultValue="weekly"
              >
                {(
                  [
                    "daily",
                    "weekly",
                    "biweekly",
                    "monthly",
                    "once",
                  ] as ChoreFrequency[]
                ).map((f) => (
                  <option key={f} value={f}>
                    {t(FREQ_KEYS[f])}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="xp_reward">{t("xpReward")}</Label>
              <Input
                id="xp_reward"
                name="xp_reward"
                type="number"
                min={0}
                defaultValue={10}
                className="h-14 rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assigned_to">{t("assignTo")}</Label>
            <select
              id="assigned_to"
              name="assigned_to"
              className="border-input h-14 w-full rounded-xl border bg-transparent px-3 text-sm"
            >
              <option value="">{t("unassigned")}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.username}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="btn-press bg-primary h-14 w-full rounded-2xl font-bold"
          >
            {t("createChore")}
          </Button>
        </form>
      </div>
    </div>
  );
}
