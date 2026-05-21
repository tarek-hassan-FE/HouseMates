"use client";

import { useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AvatarRing } from "@/components/design/avatar-ring";
import { MaterialIcon } from "@/components/design/material-icon";
import { updateAvatarUrlAction } from "@/app/[locale]/(app)/profile/actions";
import { compressImage } from "@/lib/image-compress";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function EditableAvatar({
  userId,
  src,
  name,
  className,
  avatarClassName,
  hideCameraBadge,
}: {
  userId: string;
  src: string | null;
  name: string;
  className?: string;
  avatarClassName?: string;
  hideCameraBadge?: boolean;
}) {
  const t = useTranslations("profile");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError(t("invalidImage"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const blob = await compressImage(file);
      const path = `${userId}/avatar.jpg`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          upsert: true,
          contentType: "image/jpeg",
        });
      if (uploadError) throw new Error(uploadError.message);

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      const cacheBusted = `${publicUrl}?t=${Date.now()}`;

      const result = await updateAvatarUrlAction(cacheBusted);
      if (!result.success) throw new Error(result.error);

      setPreview(cacheBusted);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="btn-press group relative"
        aria-label={t("uploadPhoto")}
      >
        <AvatarRing
          src={preview ?? src}
          name={name}
          size="lg"
          ring="primary"
          className={avatarClassName ?? "!size-24 sm:!size-28"}
        />
        {!hideCameraBadge && (
          <span className="bg-primary text-primary-foreground absolute end-0 bottom-0 flex size-9 items-center justify-center rounded-full border-2 border-white shadow-md">
            {uploading ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <MaterialIcon name="photo_camera" size={18} />
            )}
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 rounded-full bg-black/30" aria-hidden />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="text-body-md text-error max-w-xs text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
