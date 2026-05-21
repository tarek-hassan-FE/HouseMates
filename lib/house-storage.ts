import { compressImage } from "@/lib/image-compress";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "house-media";

export function isSupabaseStorageUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  try {
    const allowed = new URL(base).hostname;
    const parsed = new URL(url);
    return (
      parsed.hostname === allowed && parsed.pathname.includes("/storage/")
    );
  } catch {
    return false;
  }
}

export function isValidHouseMediaUrl(
  url: string,
  expectedPathSegment: string,
): boolean {
  if (!isSupabaseStorageUrl(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes(expectedPathSegment);
  } catch {
    return false;
  }
}

export async function uploadHouseImage({
  houseId,
  path,
  file,
}: {
  houseId: string;
  path: string;
  file: File;
}): Promise<string> {
  const blob = await compressImage(file);
  const fullPath = `${houseId}/${path}`;
  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fullPath, blob, {
      upsert: true,
      contentType: "image/jpeg",
    });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(fullPath);
  return `${publicUrl}?t=${Date.now()}`;
}

export function expenseReceiptPath(expenseId: string): string {
  return `expenses/${expenseId}.jpg`;
}

export function choreCompletionProofPath(completionId: string): string {
  return `chores/${completionId}.jpg`;
}

export function choreInstantProofPath(choreId: string): string {
  return `chores/instant/${choreId}.jpg`;
}
