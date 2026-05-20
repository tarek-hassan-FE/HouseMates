"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useHouse } from "@/components/providers/house-context";
import { MaterialIcon } from "@/components/design/material-icon";
import { ChoreHubHero } from "@/components/chores/chore-hub-hero";
import { RewardsShopCta } from "@/components/chores/rewards-shop-cta";
import { ChoreAddModal } from "@/components/chores/chore-add-modal";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/queries/keys";
import { choreIconName } from "@/lib/chore-icons";
import type { Chore, Profile } from "@/lib/database.types";
import {
  createChoreAction,
  deleteChoreAction,
} from "@/app/[locale]/(app)/chores/actions";
import { cn } from "@/lib/utils";

async function fetchChores(houseId: string): Promise<Chore[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chores")
    .select("*")
    .eq("house_id", houseId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Chore[];
}

function computeRank(members: Profile[], profileId: string): number {
  const sorted = [...members].sort((a, b) => b.total_xp - a.total_xp);
  const idx = sorted.findIndex((m) => m.id === profileId);
  return idx === -1 ? sorted.length : idx + 1;
}

const FREQ_KEYS: Record<string, string> = {
  daily: "freqDaily",
  weekly: "freqWeekly",
  biweekly: "freqBiweekly",
  monthly: "freqMonthly",
  once: "freqOnce",
};

export function ChoresList({ members }: { members: Profile[] }) {
  const { house, profile, isAdmin } = useHouse();
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m.username]));
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("chores");
  const tc = useTranslations("common");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("add") === "1" && isAdmin) {
      setShowForm(true);
    }
  }, [searchParams, isAdmin]);

  const { data: chores = [], isLoading } = useQuery({
    queryKey: queryKeys.chores(house.id),
    queryFn: () => fetchChores(house.id),
  });

  const activeChores = chores.filter((c) => !c.last_completed_at);
  const rank = computeRank(members, profile.id);

  const completeMutation = useMutation({
    mutationFn: async (choreId: string) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("complete_chore", {
        p_chore_id: choreId,
      });
      if (error) throw error;
    },
    onMutate: async (choreId) => {
      setCelebratingId(choreId);
      await queryClient.cancelQueries({
        queryKey: queryKeys.chores(house.id),
      });
      const previous = queryClient.getQueryData<Chore[]>(
        queryKeys.chores(house.id),
      );
      queryClient.setQueryData<Chore[]>(queryKeys.chores(house.id), (old) =>
        (old ?? []).map((c) =>
          c.id === choreId
            ? { ...c, last_completed_at: new Date().toISOString() }
            : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      setCelebratingId(null);
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.chores(house.id),
          context.previous,
        );
      }
    },
    onSettled: () => {
      setTimeout(() => setCelebratingId(null), 600);
      queryClient.invalidateQueries({ queryKey: queryKeys.chores(house.id) });
      router.refresh();
    },
  });

  const canComplete = (chore: Chore) => {
    if (chore.last_completed_at) return false;
    if (isAdmin) return true;
    return chore.assigned_to === profile.id;
  };

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const result = await createChoreAction(new FormData(e.currentTarget));
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    setShowForm(false);
    router.replace("/chores");
    queryClient.invalidateQueries({ queryKey: queryKeys.chores(house.id) });
    router.refresh();
  }

  async function handleDelete(choreId: string) {
    if (!confirm(t("deleteChoreConfirm"))) return;
    const result = await deleteChoreAction(choreId);
    if (!result.success) setFormError(result.error);
    else
      queryClient.invalidateQueries({ queryKey: queryKeys.chores(house.id) });
  }

  if (isLoading) {
    return (
      <p className="text-on-surface-variant text-body-md">{tc("loadingChores")}</p>
    );
  }

  return (
    <>
      <ChoreHubHero totalXp={profile.total_xp} rank={rank} />

      <div className="grid grid-cols-1 gap-gutter xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <div className="flex items-end justify-between px-2">
            <h3 className="text-headline-md text-on-surface flex items-center gap-2">
              <MaterialIcon name="assignment" className="text-primary" />
              {t("activeChores")}
            </h3>
            <span className="text-label-md text-on-surface-variant">
              {t("pendingCount", { count: activeChores.length })}
            </span>
          </div>

          {formError && !showForm && (
            <p className="text-destructive text-sm px-2" role="alert">
              {formError}
            </p>
          )}

          <ul className="space-y-3">
            {activeChores.length === 0 && (
              <li className="text-on-surface-variant border-outline-variant rounded-[1.5rem] border border-dashed p-10 text-center">
                {isAdmin ? t("noActiveAdmin") : t("noActiveMember")}
              </li>
            )}
            {activeChores.map((chore) => {
              const icon = choreIconName(chore.title);
              const isCelebrating = celebratingId === chore.id;
              const freqLabel = FREQ_KEYS[chore.frequency]
                ? t(FREQ_KEYS[chore.frequency])
                : chore.frequency;

              return (
                <li
                  key={chore.id}
                  className={cn(
                    "bg-surface-container-lowest border-secondary-container relative flex flex-col gap-4 rounded-[1.5rem] border-b-4 p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between",
                    isCelebrating && "border-tertiary-fixed-dim",
                  )}
                >
                  {isCelebrating && (
                    <div className="bg-tertiary-container text-on-tertiary-container celebrate-pop absolute inset-0 z-10 flex items-center justify-end rounded-[1.5rem] px-8 font-bold">
                      <MaterialIcon
                        name="check_circle"
                        className="me-2"
                        size={32}
                      />
                      {t("choreCompleted")}
                    </div>
                  )}
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="bg-secondary-container/20 text-secondary flex size-14 shrink-0 items-center justify-center rounded-2xl">
                      <MaterialIcon name={icon} size={32} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-body-lg text-on-surface font-bold">
                        {chore.title}
                      </h4>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {chore.assigned_to && memberMap[chore.assigned_to] && (
                          <span className="bg-surface-container-high text-on-surface-variant text-label-sm flex items-center gap-1 rounded-full px-2 py-1">
                            <MaterialIcon name="person" size={14} />
                            {memberMap[chore.assigned_to]}
                          </span>
                        )}
                        <span className="bg-surface-container-high text-on-surface-variant text-label-sm flex items-center gap-1 rounded-full px-2 py-1">
                          <MaterialIcon name="calendar_today" size={14} />
                          {freqLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
                    <span className="text-body-lg text-secondary text-center font-bold sm:text-end">
                      +{chore.xp_reward} XP
                    </span>
                    <button
                      type="button"
                      disabled={
                        !canComplete(chore) || completeMutation.isPending
                      }
                      onClick={() => completeMutation.mutate(chore.id)}
                      className={cn(
                        "btn-press bg-primary text-primary-foreground text-label-md w-full rounded-xl px-6 py-2 font-bold transition-all hover:bg-primary-container sm:w-auto",
                        !canComplete(chore) &&
                          "cursor-not-allowed opacity-40",
                      )}
                    >
                      {t("done")}
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(chore.id)}
                        className="text-error text-label-sm hover:underline"
                      >
                        {tc("delete")}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {chores.some((c) => c.last_completed_at) && (
            <details className="px-2">
              <summary className="text-label-md text-on-surface-variant cursor-pointer">
                {t("completedChores", {
                  count: chores.filter((c) => c.last_completed_at).length,
                })}
              </summary>
              <ul className="mt-3 space-y-2 opacity-70">
                {chores
                  .filter((c) => c.last_completed_at)
                  .map((chore) => (
                    <li
                      key={chore.id}
                      className="text-body-md text-on-surface-variant line-through"
                    >
                      {chore.title}
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </div>

        <div className="xl:col-span-4">
          <RewardsShopCta totalXp={profile.total_xp} />
        </div>
      </div>

      {isAdmin && (
        <ChoreAddModal
          open={showForm}
          onClose={() => {
            setShowForm(false);
            router.replace("/chores");
          }}
          members={members}
          onSubmit={handleCreate}
          error={formError}
        />
      )}
    </>
  );
}
