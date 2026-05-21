import {
  attachChoreCompletionProofAction,
  attachChoreInstantProofAction,
} from "@/app/[locale]/(app)/chores/actions";
import {
  choreCompletionProofPath,
  choreInstantProofPath,
  uploadHouseImage,
} from "@/lib/house-storage";

export async function attachChoreCompletionProofFromFile(
  houseId: string,
  completionId: string,
  file: File,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const url = await uploadHouseImage({
      houseId,
      path: choreCompletionProofPath(completionId),
      file,
    });
    const result = await attachChoreCompletionProofAction(completionId, url);
    if (!result.success) {
      return { ok: false, error: result.error };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

export async function attachChoreInstantProofFromFile(
  houseId: string,
  choreId: string,
  file: File,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const url = await uploadHouseImage({
      houseId,
      path: choreInstantProofPath(choreId),
      file,
    });
    const result = await attachChoreInstantProofAction(choreId, url);
    if (!result.success) {
      return { ok: false, error: result.error };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}
