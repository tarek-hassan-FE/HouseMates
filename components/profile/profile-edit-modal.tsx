"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { EditableAvatar } from "@/components/profile/editable-avatar";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUsernameAction } from "@/app/[locale]/(app)/profile/actions";

const usernameSchema = z.object({
  username: z.string().trim().min(2, "min").max(24, "max"),
});

type UsernameForm = z.infer<typeof usernameSchema>;

type ProfileEditModalProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  avatarUrl: string | null;
};

export function ProfileEditModal({
  open,
  onClose,
  userId,
  username,
  avatarUrl,
}: ProfileEditModalProps) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UsernameForm>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username },
  });

  useEffect(() => {
    if (open) reset({ username });
  }, [open, username, reset]);

  async function onSubmit(data: UsernameForm) {
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
    router.refresh();
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="bg-foreground/40 fixed inset-0 z-[60] flex items-end justify-center overscroll-contain p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="profile-edit-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={tc("closeDialog")}
        onClick={onClose}
      />
      <div className="bg-surface-container-lowest relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[2rem] p-6 shadow-2xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between">
          <h2 id="profile-edit-title" className="text-headline-md font-bold">
            {t("editFullProfile")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-press text-on-surface-variant flex size-10 items-center justify-center rounded-full"
            aria-label={tc("close")}
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="mt-6 flex justify-center">
          <EditableAvatar userId={userId} src={avatarUrl} name={username} />
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-4"
        >
          <div>
            <Label htmlFor="profile-edit-username">{t("displayName")}</Label>
            <Input
              id="profile-edit-username"
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
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {tc("save")}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              {tc("cancel")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
