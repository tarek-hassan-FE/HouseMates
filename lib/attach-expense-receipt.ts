import { attachExpenseReceiptAction } from "@/app/[locale]/(app)/ledger/actions";
import {
  expenseReceiptPath,
  uploadHouseImage,
} from "@/lib/house-storage";

export async function attachExpenseReceiptFromFile(
  houseId: string,
  expenseId: string,
  file: File,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const url = await uploadHouseImage({
      houseId,
      path: expenseReceiptPath(expenseId),
      file,
    });
    const result = await attachExpenseReceiptAction(expenseId, url);
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
