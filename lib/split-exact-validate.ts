const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export type ExactSplitShare = {
  member_id: string;
  amount_cents: number;
};

export type ExactSplitValidationError =
  | "splitSharesRequired"
  | "splitInvalidShare"
  | "splitMustEqualTotal"
  | "splitUnknownMember";

export type ExactSplitValidationResult =
  | { ok: true; shares: ExactSplitShare[] }
  | { ok: false; error: ExactSplitValidationError };

export const SHARE_FIELD_PREFIX = "share_";

function parseShareToCents(value: string): number | null {
  const normalized = value
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)))
    .replace(/[^0-9.]/g, "");
  if (!normalized) return null;
  const amount = Number.parseFloat(normalized);
  if (Number.isNaN(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function parseShareFieldsFromFormData(
  formData: FormData,
  memberIds: string[],
): Record<string, string> {
  const shares: Record<string, string> = {};
  for (const id of memberIds) {
    const value = formData.get(`${SHARE_FIELD_PREFIX}${id}`);
    if (value != null) shares[id] = String(value);
  }
  return shares;
}

export function validateExactShares(
  shareStrings: Record<string, string>,
  memberIds: string[],
  totalCents: number,
  payerId: string,
): ExactSplitValidationResult {
  if (memberIds.length === 0) {
    return { ok: false, error: "splitSharesRequired" };
  }

  const shares: ExactSplitShare[] = [];
  let sum = 0;

  for (const memberId of memberIds) {
    if (!(memberId in shareStrings)) {
      return { ok: false, error: "splitSharesRequired" };
    }

    const raw = shareStrings[memberId];
    const cents = parseShareToCents(raw);
    if (cents === null || cents < 0) {
      return { ok: false, error: "splitInvalidShare" };
    }

    shares.push({ member_id: memberId, amount_cents: cents });
    sum += cents;
  }

  if (sum !== totalCents) {
    return { ok: false, error: "splitMustEqualTotal" };
  }

  const hasOtherMember = memberIds.some((id) => id !== payerId);
  const hasNonPayerDebt = shares.some(
    (s) => s.member_id !== payerId && s.amount_cents > 0,
  );
  if (hasOtherMember && !hasNonPayerDebt) {
    return { ok: false, error: "splitSharesRequired" };
  }

  return { ok: true, shares };
}
