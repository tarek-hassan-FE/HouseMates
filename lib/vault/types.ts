export type HouseVaultWifi = {
  ssid: string;
  password: string;
};

export type HouseVaultDoorCode = {
  label: string;
  code: string;
};

export type HouseVaultContact = {
  name: string;
  phone?: string;
  whatsapp?: string;
};

export type HouseVaultRule = {
  title: string;
  body: string;
};

export type HouseVaultFixedBill = {
  name: string;
  amountCents: number;
  dueDay?: number;
  notes?: string;
};

export type HouseVaultData = {
  wifi?: HouseVaultWifi;
  doorCodes?: HouseVaultDoorCode[];
  fixedBills?: HouseVaultFixedBill[];
  contacts?: HouseVaultContact[];
  rules?: HouseVaultRule[];
};

export const EMPTY_VAULT_DATA: HouseVaultData = {};

export function parseVaultData(raw: unknown): HouseVaultData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const obj = raw as Record<string, unknown>;
  const result: HouseVaultData = {};

  if (obj.wifi && typeof obj.wifi === "object" && !Array.isArray(obj.wifi)) {
    const w = obj.wifi as Record<string, unknown>;
    const ssid = typeof w.ssid === "string" ? w.ssid.trim() : "";
    const password = typeof w.password === "string" ? w.password : "";
    if (ssid) result.wifi = { ssid, password };
  }

  if (Array.isArray(obj.doorCodes)) {
    result.doorCodes = obj.doorCodes
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const d = item as Record<string, unknown>;
        return {
          label: typeof d.label === "string" ? d.label.trim() : "",
          code: typeof d.code === "string" ? d.code : "",
        };
      })
      .filter((d) => d.label && d.code);
  }

  if (Array.isArray(obj.fixedBills)) {
    result.fixedBills = obj.fixedBills
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const b = item as Record<string, unknown>;
        const name = typeof b.name === "string" ? b.name.trim() : "";
        const amountCents =
          typeof b.amountCents === "number" && Number.isFinite(b.amountCents)
            ? Math.max(0, Math.round(b.amountCents))
            : typeof b.amount === "number" && Number.isFinite(b.amount)
              ? Math.max(0, Math.round(b.amount * 100))
              : 0;
        const dueDayRaw = b.dueDay;
        const dueDay =
          typeof dueDayRaw === "number" &&
          Number.isInteger(dueDayRaw) &&
          dueDayRaw >= 1 &&
          dueDayRaw <= 31
            ? dueDayRaw
            : undefined;
        const notes =
          typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : undefined;
        return { name, amountCents, dueDay, notes };
      })
      .filter((b) => b.name && b.amountCents > 0);
  }

  if (Array.isArray(obj.contacts)) {
    result.contacts = obj.contacts
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const c = item as Record<string, unknown>;
        const name = typeof c.name === "string" ? c.name.trim() : "";
        const phone =
          typeof c.phone === "string" && c.phone.trim() ? c.phone.trim() : undefined;
        const whatsapp =
          typeof c.whatsapp === "string" && c.whatsapp.trim()
            ? c.whatsapp.trim()
            : undefined;
        return { name, phone, whatsapp };
      })
      .filter((c) => c.name);
  }

  if (Array.isArray(obj.rules)) {
    result.rules = obj.rules
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const r = item as Record<string, unknown>;
        return {
          title: typeof r.title === "string" ? r.title.trim() : "",
          body: typeof r.body === "string" ? r.body.trim() : "",
        };
      })
      .filter((r) => r.title);
  }

  return result;
}
