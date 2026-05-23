"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useConfirm } from "@/components/providers/confirm-provider";
import { useHouse } from "@/components/providers/house-context";
import { MaterialIcon } from "@/components/design/material-icon";
import { ChoreHubHero } from "@/components/chores/chore-hub-hero";
import { RewardsShopCta } from "@/components/chores/rewards-shop-cta";
import { ChoreFormModal } from "@/components/chores/chore-add-modal";
import { ChoreCompleteModal } from "@/components/chores/chore-complete-modal";
import { ImageViewerDialog } from "@/components/shared/image-viewer-dialog";
import {
  attachChoreCompletionProofFromFile,
  attachChoreInstantProofFromFile,
} from "@/lib/attach-chore-proof";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/queries/keys";
import { choreIconName } from "@/lib/chore-icons";
import {
  isChoreActive,
  isChoreCompletedDisplay,
  isChoreInCooldown,
} from "@/lib/chore-recurrence";
import type { Chore, ChorePendingCompletion, Profile } from "@/lib/database.types";
import {
  approveChoreCompletionAction,
  createChoreAction,
  deleteChoreAction,
  rejectChoreCompletionAction,
  reopenChoreAction,
  updateChoreAction,
} from "@/app/[locale]/(app)/chores/actions";
import { cn } from "@/lib/utils";

async function fetchChores(houseId: string): Promise<Chore[]> {
  const supabase = createClient();
  const { error: reactivateError } = await supabase.rpc("reactivate_due_chores", {
    p_house_id: houseId,
  });
  if (reactivateError) throw reactivateError;

  const [choresRes, completionsRes] = await Promise.all([
    supabase
      .from("chores")
      .select("*")
      .eq("house_id", houseId)
      .order("created_at", { ascending: false }),
    supabase
      .from("chore_completions")
      .select("id, chore_id, submitted_by, submitted_at, status, proof_image_url")
      .eq("house_id", houseId)
      .eq("status", "pending"),
  ]);

  if (choresRes.error) throw choresRes.error;
  if (completionsRes.error) throw completionsRes.error;

  const pendingByChoreId = Object.fromEntries(
    (completionsRes.data ?? []).map((c) => [
      c.chore_id,
      {
        id: c.id,
        submitted_by: c.submitted_by,
        submitted_at: c.submitted_at,
        status: "pending" as const,
        proof_image_url: c.proof_image_url,
      } satisfies ChorePendingCompletion,
    ]),
  );

  return ((choresRes.data ?? []) as Chore[]).map((chore) => ({
    ...chore,
    rotate_assignment: chore.rotate_assignment ?? false,
    pending_completion: pendingByChoreId[chore.id] ?? null,
  }));
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

function ChoreMetaChips({
  chore,
  memberMap,
  t,
  format,
  returnsOnDate,
}: {
  chore: Chore;
  memberMap: Record<string, string>;
  t: ReturnType<typeof useTranslations<"chores">>;
  format?: ReturnType<typeof useFormatter>;
  returnsOnDate?: string | null;
}) {
  const freqLabel = FREQ_KEYS[chore.frequency]
    ? t(FREQ_KEYS[chore.frequency])
    : chore.frequency;

  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {chore.assigned_to && memberMap[chore.assigned_to] && (
        <span className="bg-surface-container-high text-on-surface-variant text-label-sm flex items-center gap-1 rounded-full px-2 py-1">
          <MaterialIcon name="person" size={14} />
          {memberMap[chore.assigned_to]}
        </span>
      )}
      {chore.rotate_assignment && (
        <span className="bg-surface-container-high text-on-surface-variant text-label-sm flex items-center gap-1 rounded-full px-2 py-1">
          <MaterialIcon name="sync" size={14} />
          {t("rotationEnabled")}
        </span>
      )}
      {chore.pending_completion && (
        <span className="bg-tertiary-container text-on-tertiary-container text-label-sm flex items-center gap-1 rounded-full px-2 py-1">
          <MaterialIcon name="hourglass_top" size={14} />
          {t("awaitingApproval")}
        </span>
      )}
      <span className="bg-surface-container-high text-on-surface-variant text-label-sm flex items-center gap-1 rounded-full px-2 py-1">
        <MaterialIcon name="calendar_today" size={14} />
        {freqLabel}
      </span>
      {returnsOnDate && format && (
        <span className="bg-primary-container/40 text-on-primary-container text-label-sm flex items-center gap-1 rounded-full px-2 py-1">
          <MaterialIcon name="event" size={14} />
          {t("returnsOn", { date: returnsOnDate })}
        </span>
      )}
    </div>
  );
}

function AdminChoreActions({
  onEdit,
  onDelete,
  onReopen,
  showReopen,
  t,
  tc,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onReopen?: () => void;
  showReopen?: boolean;
  t: ReturnType<typeof useTranslations<"chores">>;
  tc: ReturnType<typeof useTranslations<"common">>;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <button
        type="button"
        onClick={onEdit}
        className="text-primary text-label-sm hover:underline py-2 px-4"
      >
        {tc("edit")}
      </button>
      {showReopen && onReopen && (
        <button
          type="button"
          onClick={onReopen}
          className="text-secondary text-label-sm hover:underline"
        >
          {t("reopenChore")}
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="text-error text-label-sm hover:underline"
      >
        {tc("delete")}
      </button>
    </div>
  );
}

export function ChoresList({ members }: { members: Profile[] }) {
  const { house, profile, isAdmin } = useHouse();
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m.username]));
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const format = useFormatter();
  const t = useTranslations("chores");
  const ta = useTranslations("attachments");
  const tc = useTranslations("common");
  const confirm = useConfirm();
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<{
    chore: Chore;
    mode: "submit" | "admin_complete";
  } | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [celebrationMode, setCelebrationMode] = useState<"completed" | "submitted">(
    "completed",
  );

  useEffect(() => {
    if (searchParams.get("add") === "1" && isAdmin) {
      setFormMode("create");
      setEditingChore(null);
    }
  }, [searchParams, isAdmin]);

  const { data: chores = [], isLoading } = useQuery({
    queryKey: queryKeys.chores(house.id),
    queryFn: () => fetchChores(house.id),
  });

  const activeChores = chores.filter(
    (c) => isChoreActive(c) && !isChoreCompletedDisplay(c),
  );
  const completedChores = chores.filter((c) => isChoreCompletedDisplay(c));
  const pendingApprovalChores = activeChores.filter((c) => c.pending_completion);
  const activeChoresForList = isAdmin
    ? activeChores.filter((c) => !c.pending_completion)
    : activeChores;
  const rank = computeRank(members, profile.id);

  const invalidateChores = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.chores(house.id) });
    router.refresh();
  };

  const claimMutation = useMutation({
    mutationFn: async (choreId: string) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("claim_chore", {
        p_chore_id: choreId,
      });
      if (error) throw error;
    },
    onMutate: async (choreId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.chores(house.id),
      });
      const previous = queryClient.getQueryData<Chore[]>(
        queryKeys.chores(house.id),
      );
      queryClient.setQueryData<Chore[]>(queryKeys.chores(house.id), (old) =>
        (old ?? []).map((c) =>
          c.id === choreId ? { ...c, assigned_to: profile.id } : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.chores(house.id),
          context.previous,
        );
      }
    },
    onSettled: invalidateChores,
  });

  const submitMutation = useMutation({
    mutationFn: async ({
      choreId,
      imageFile,
    }: {
      choreId: string;
      imageFile: File | null;
    }) => {
      const supabase = createClient();
      const { data: completionId, error } = await supabase.rpc(
        "submit_chore_completion",
        { p_chore_id: choreId },
      );
      if (error) throw error;
      let uploadError: string | null = null;
      if (imageFile && completionId) {
        const attach = await attachChoreCompletionProofFromFile(
          house.id,
          completionId as string,
          imageFile,
        );
        if (!attach.ok) uploadError = attach.error;
      }
      return { uploadError };
    },
    onMutate: async ({ choreId }) => {
      setCompleteTarget(null);
      setCompleteError(null);
      setCelebrationMode("submitted");
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
            ? {
                ...c,
                pending_completion: {
                  id: "optimistic",
                  submitted_by: profile.id,
                  submitted_at: new Date().toISOString(),
                  status: "pending" as const,
                },
              }
            : c,
        ),
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      setCelebratingId(null);
      setCompleteError(err instanceof Error ? err.message : "Failed");
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.chores(house.id),
          context.previous,
        );
      }
    },
    onSuccess: (result) => {
      if (result?.uploadError) setActionError(result.uploadError);
    },
    onSettled: () => {
      setTimeout(() => setCelebratingId(null), 600);
      invalidateChores();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({
      choreId,
      imageFile,
    }: {
      choreId: string;
      imageFile: File | null;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("complete_chore", {
        p_chore_id: choreId,
      });
      if (error) throw error;
      let uploadError: string | null = null;
      if (imageFile) {
        const attach = await attachChoreInstantProofFromFile(
          house.id,
          choreId,
          imageFile,
        );
        if (!attach.ok) uploadError = attach.error;
      }
      return { uploadError };
    },
    onMutate: async ({ choreId }) => {
      setCompleteTarget(null);
      setCompleteError(null);
      setCelebrationMode("completed");
      setCelebratingId(choreId);
      await queryClient.cancelQueries({
        queryKey: queryKeys.chores(house.id),
      });
      const previous = queryClient.getQueryData<Chore[]>(
        queryKeys.chores(house.id),
      );
      const chore = (previous ?? []).find((c) => c.id === choreId);
      const recipient = chore?.assigned_to ?? profile.id;
      queryClient.setQueryData<Chore[]>(queryKeys.chores(house.id), (old) =>
        (old ?? []).map((c) =>
          c.id === choreId
            ? {
                ...c,
                last_completed_at: new Date().toISOString(),
                last_completed_by: recipient,
                pending_completion: null,
              }
            : c,
        ),
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      setCelebratingId(null);
      setCompleteError(err instanceof Error ? err.message : "Failed");
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.chores(house.id),
          context.previous,
        );
      }
    },
    onSuccess: (result) => {
      if (result?.uploadError) setActionError(result.uploadError);
    },
    onSettled: () => {
      setTimeout(() => setCelebratingId(null), 600);
      invalidateChores();
    },
  });

  function openCompleteModal(
    chore: Chore,
    mode: "submit" | "admin_complete",
  ) {
    setCompleteError(null);
    setCompleteTarget({ chore, mode });
  }

  function handleCompleteConfirm(imageFile: File | null) {
    if (!completeTarget) return;
    const { chore, mode } = completeTarget;
    if (mode === "submit") {
      submitMutation.mutate({ choreId: chore.id, imageFile });
    } else {
      completeMutation.mutate({ choreId: chore.id, imageFile });
    }
  }

  const canClaim = (chore: Chore) =>
    !isAdmin &&
    !chore.assigned_to &&
    !chore.rotate_assignment &&
    !chore.pending_completion &&
    isChoreActive(chore);

  const canSubmit = (chore: Chore) =>
    !isAdmin &&
    chore.assigned_to === profile.id &&
    !chore.pending_completion &&
    isChoreActive(chore);

  const canAdminComplete = (chore: Chore) =>
    isAdmin && !chore.pending_completion && isChoreActive(chore);

  function formatReturnsOn(iso: string | null | undefined): string | null {
    if (!iso) return null;
    return format.dateTime(new Date(iso), {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function openEditForm(chore: Chore) {
    setFormMode("edit");
    setEditingChore(chore);
    setFormError(null);
  }

  function closeForm() {
    setFormMode(null);
    setEditingChore(null);
    setFormError(null);
    router.replace("/chores");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const result = await createChoreAction(new FormData(e.currentTarget));
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    closeForm();
    invalidateChores();
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingChore) return;
    setFormError(null);
    const result = await updateChoreAction(
      editingChore.id,
      new FormData(e.currentTarget),
    );
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    closeForm();
    invalidateChores();
  }

  async function handleDelete(choreId: string) {
    if (
      !(await confirm({
        message: t("deleteChoreConfirm"),
        confirmLabel: tc("delete"),
        destructive: true,
      }))
    )
      return;
    const result = await deleteChoreAction(choreId);
    if (!result.success) setFormError(result.error);
    else invalidateChores();
  }

  async function handleReopen(choreId: string) {
    if (
      !(await confirm({
        message: t("reopenChoreConfirm"),
        destructive: true,
      }))
    )
      return;
    const result = await reopenChoreAction(choreId);
    if (!result.success) setFormError(result.error);
    else invalidateChores();
  }

  async function handleApprove(chore: Chore) {
    const completionId = chore.pending_completion?.id;
    if (!completionId) return;
    if (
      !(await confirm({
        message: t("approveConfirm", { xp: chore.xp_reward }),
        confirmLabel: t("approve"),
      }))
    )
      return;
    const result = await approveChoreCompletionAction(completionId);
    if (!result.success) setFormError(result.error);
    else invalidateChores();
  }

  async function handleReject(chore: Chore) {
    const completionId = chore.pending_completion?.id;
    if (!completionId) return;
    if (
      !(await confirm({
        message: t("rejectConfirm"),
        confirmLabel: t("reject"),
        destructive: true,
      }))
    )
      return;
    const result = await rejectChoreCompletionAction(completionId);
    if (!result.success) setFormError(result.error);
    else invalidateChores();
  }

  function formatCompletedDate(iso: string) {
    return format.dateTime(new Date(iso), {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function renderPrimaryAction(chore: Chore) {
    if (canClaim(chore)) {
      return (
        <button
          type="button"
          disabled={claimMutation.isPending}
          onClick={() => claimMutation.mutate(chore.id)}
          className="btn-press btn-secondary text-label-md min-w-[4.5rem] rounded-xl px-4 py-2 font-bold shadow-sm"
        >
          {t("claim")}
        </button>
      );
    }

    if (canSubmit(chore)) {
      return (
        <button
          type="button"
          disabled={submitMutation.isPending || completeMutation.isPending}
          onClick={() => openCompleteModal(chore, "submit")}
          className="btn-press btn-primary text-label-md min-w-[4.5rem] rounded-xl px-4 py-2 font-bold shadow-sm transition-colors hover:brightness-95"
        >
          {t("done")}
        </button>
      );
    }

    if (
      !isAdmin &&
      chore.pending_completion?.submitted_by === profile.id
    ) {
      return (
        <span className="bg-tertiary-container text-on-tertiary-container text-label-sm rounded-xl px-3 py-2 font-semibold">
          {t("awaitingApproval")}
        </span>
      );
    }

    if (canAdminComplete(chore)) {
      return (
        <button
          type="button"
          disabled={submitMutation.isPending || completeMutation.isPending}
          onClick={() => openCompleteModal(chore, "admin_complete")}
          className="btn-press btn-primary text-label-md min-w-[4.5rem] rounded-xl px-4 py-2 font-bold shadow-sm transition-colors hover:brightness-95"
        >
          {t("done")}
        </button>
      );
    }

    return null;
  }

  if (isLoading) {
    return (
      <p className="text-on-surface-variant text-body-md">{tc("loadingChores")}</p>
    );
  }

  return (
    <>
      <ChoreHubHero totalXp={profile.total_xp} rank={rank} />

      {actionError && (
        <p className="text-body-md text-error rounded-xl bg-error-container/30 px-4 py-3" role="alert">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-gutter xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          {isAdmin && pendingApprovalChores.length > 0 && (
            <>
              <div className="flex items-end justify-between px-2">
                <h3 className="text-headline-md text-on-surface flex items-center gap-2">
                  <MaterialIcon name="hourglass_top" className="text-primary" />
                  {t("awaitingApproval")}
                </h3>
                <span className="text-label-md text-on-surface-variant">
                  {t("pendingApprovalsCount", {
                    count: pendingApprovalChores.length,
                  })}
                </span>
              </div>
              <ul className="space-y-3">
                {pendingApprovalChores.map((chore) => {
                  const icon = choreIconName(chore.title);
                  const submitterName = chore.pending_completion
                    ? memberMap[chore.pending_completion.submitted_by]
                    : null;

                  return (
                    <li
                      key={chore.id}
                      className="bg-surface-container-lowest border-outline-variant/20 relative flex flex-col gap-3 rounded-[1.5rem] border border-b-4 p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="bg-secondary-container/20 text-secondary flex size-12 shrink-0 items-center justify-center rounded-2xl sm:size-14">
                          <MaterialIcon name={icon} size={28} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-body-lg text-on-surface line-clamp-2 font-bold">
                            {chore.title}
                          </h4>
                          <ChoreMetaChips
                            chore={chore}
                            memberMap={memberMap}
                            t={t}
                          />
                          {submitterName && (
                            <p className="text-on-surface-variant text-label-sm mt-1">
                              {t("submittedBy", { name: submitterName })}
                            </p>
                          )}
                          {chore.pending_completion?.proof_image_url && (
                            <button
                              type="button"
                              onClick={() =>
                                setViewerImage({
                                  url: chore.pending_completion!.proof_image_url!,
                                  title: chore.title,
                                })
                              }
                              className="btn-press mt-2 flex items-center gap-2 rounded-xl bg-surface-container-high px-3 py-2"
                            >
                              <MaterialIcon name="photo" size={18} />
                              <span className="text-label-sm font-semibold">
                                {ta("viewPhoto")}
                              </span>
                            </button>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className="bg-secondary-fixed/30 text-on-secondary-fixed text-label-sm rounded-full px-2.5 py-0.5 font-bold">
                            +{chore.xp_reward} XP
                          </span>
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(chore)}
                              className="btn-press bg-primary text-white text-label-sm rounded-xl px-4 py-2 font-bold transition-colors hover:brightness-95"
                            >
                              {t("approve")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(chore)}
                              className="text-error text-label-sm hover:underline px-4 py-2"
                            >
                              {t("reject")}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="border-outline-variant/20 border-t pt-2">
                        <AdminChoreActions
                          onEdit={() => openEditForm(chore)}
                          onDelete={() => handleDelete(chore.id)}
                          t={t}
                          tc={tc}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <div className="flex items-end justify-between px-2">
            <h3 className="text-headline-md text-on-surface flex items-center gap-2">
              <MaterialIcon name="assignment" className="text-primary" />
              {t("activeChores")}
            </h3>
            <span className="text-label-md text-on-surface-variant">
              {t("pendingCount", { count: activeChoresForList.length })}
            </span>
          </div>

          {formError && formMode === null && (
            <p className="text-destructive text-sm px-2" role="alert">
              {formError}
            </p>
          )}

          <ul className="space-y-3">
            {activeChoresForList.length === 0 && (
              <li className="text-on-surface-variant border-outline-variant rounded-[1.5rem] border border-dashed p-10 text-center">
                {isAdmin ? t("noActiveAdmin") : t("noActiveMember")}
              </li>
            )}
            {activeChoresForList.map((chore) => {
              const icon = choreIconName(chore.title);
              const isCelebrating = celebratingId === chore.id;

              return (
                <li
                  key={chore.id}
                  className={cn(
                    "bg-surface-container-lowest border-outline-variant/20 relative flex flex-col gap-3 rounded-[1.5rem] border border-b-4 p-4 shadow-sm transition-shadow hover:shadow-md",
                  )}
                >
                  {isCelebrating && (
                    <div className="bg-tertiary-container text-on-tertiary-container celebrate-pop absolute inset-0 z-10 flex items-center justify-end rounded-[1.5rem] px-8 font-bold">
                      <MaterialIcon
                        name="check_circle"
                        className="me-2"
                        size={32}
                      />
                      {celebrationMode === "submitted"
                        ? t("submittedForApproval")
                        : t("choreCompleted")}
                    </div>
                  )}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="bg-secondary-container/20 text-secondary flex size-12 shrink-0 items-center justify-center rounded-2xl sm:size-14">
                      <MaterialIcon name={icon} size={28} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-body-lg text-on-surface line-clamp-2 font-bold">
                        {chore.title}
                      </h4>
                      <ChoreMetaChips chore={chore} memberMap={memberMap} t={t} />
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="bg-secondary-fixed/30 text-on-secondary-fixed text-label-sm rounded-full px-2.5 py-0.5 font-bold">
                        +{chore.xp_reward} XP
                      </span>
                      {renderPrimaryAction(chore)}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="border-outline-variant/20 border-t pt-2">
                      <AdminChoreActions
                        onEdit={() => openEditForm(chore)}
                        onDelete={() => handleDelete(chore.id)}
                        t={t}
                        tc={tc}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {completedChores.length > 0 && (
            <details className="px-2" open>
              <summary className="text-label-md text-on-surface-variant cursor-pointer">
                {t("completedChores", { count: completedChores.length })}
              </summary>
              <ul className="mt-3 space-y-3">
                {completedChores.map((chore) => {
                  const icon = choreIconName(chore.title);
                  const completedDate = chore.last_completed_at
                    ? formatCompletedDate(chore.last_completed_at)
                    : null;
                  const completerName = chore.last_completed_by
                    ? memberMap[chore.last_completed_by]
                    : null;

                  return (
                    <li
                      key={chore.id}
                      className="bg-surface-container-low border-outline-variant flex flex-col gap-3 rounded-2xl border p-4 opacity-90 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="bg-surface-container-high text-on-surface-variant flex size-12 shrink-0 items-center justify-center rounded-xl">
                          <MaterialIcon name={icon} size={24} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-body-md text-on-surface line-through font-semibold">
                            {chore.title}
                          </h4>
                          <ChoreMetaChips
                            chore={chore}
                            memberMap={memberMap}
                            t={t}
                            format={format}
                            returnsOnDate={
                              isChoreInCooldown(chore)
                                ? formatReturnsOn(chore.reactivates_at)
                                : null
                            }
                          />
                          {completedDate && (
                            <p className="text-on-surface-variant text-label-sm mt-1">
                              {t("completedOn", { date: completedDate })}
                            </p>
                          )}
                          {completerName && (
                            <p className="text-on-surface-variant text-label-sm mt-0.5">
                              {t("completedBy", { name: completerName })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-stretch gap-2 sm:items-end">
                        <span className="text-label-md text-on-surface-variant text-center sm:text-end">
                          +{chore.xp_reward} XP
                        </span>
                        {isAdmin && (
                          <AdminChoreActions
                            onEdit={() => openEditForm(chore)}
                            onDelete={() => handleDelete(chore.id)}
                            onReopen={() => handleReopen(chore.id)}
                            showReopen
                            t={t}
                            tc={tc}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </div>

        <div className="xl:col-span-4">
          <RewardsShopCta totalXp={profile.total_xp} />
        </div>
      </div>

      {isAdmin && (
        <ChoreFormModal
          open={formMode !== null}
          mode={formMode === "edit" ? "edit" : "create"}
          chore={editingChore}
          onClose={closeForm}
          members={members}
          onSubmit={formMode === "edit" ? handleUpdate : handleCreate}
          error={formError}
        />
      )}

      <ChoreCompleteModal
        open={completeTarget !== null}
        chore={completeTarget?.chore ?? null}
        mode={completeTarget?.mode ?? "submit"}
        loading={submitMutation.isPending || completeMutation.isPending}
        error={completeError}
        onClose={() => {
          setCompleteTarget(null);
          setCompleteError(null);
        }}
        onConfirm={handleCompleteConfirm}
      />

      <ImageViewerDialog
        open={viewerImage !== null}
        imageUrl={viewerImage?.url ?? null}
        title={viewerImage?.title}
        onClose={() => setViewerImage(null)}
      />
    </>
  );
}
