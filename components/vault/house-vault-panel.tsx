"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copyText } from "@/lib/clipboard";
import { centsToDisplay, parseAmountToCents } from "@/lib/money";
import type {
  HouseVaultContact,
  HouseVaultData,
  HouseVaultDoorCode,
  HouseVaultFixedBill,
  HouseVaultRule,
  HouseVaultWifi,
} from "@/lib/vault/types";
import {
  markVaultIntroSeenAction,
  updateVaultDataAction,
} from "@/app/[locale]/(app)/vault/actions";
import { WifiQrModal } from "@/components/vault/wifi-qr-modal";
import { cn } from "@/lib/utils";

type HouseVaultPanelProps = {
  houseName: string;
  username: string;
  vaultData: HouseVaultData;
  isAdmin: boolean;
  vaultIntroSeen: boolean;
};

function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

function ContactAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="bg-primary-fixed text-on-surface flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold"
      aria-hidden
    >
      {initial}
    </div>
  );
}

function CopyButton({
  value,
  label,
  onCopied,
}: {
  value: string;
  label: string;
  onCopied: () => void;
}) {
  const tc = useTranslations("common");

  async function handleCopy() {
    const ok = await copyText(value);
    if (ok) onCopied();
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn-press text-primary-container flex size-10 shrink-0 items-center justify-center rounded-xl"
      aria-label={label}
    >
      <MaterialIcon name="content_copy" size={20} />
      <span className="sr-only">{tc("copyCode")}</span>
    </button>
  );
}

function VaultRuleAccordion({ rules }: { rules: HouseVaultRule[] }) {
  const t = useTranslations("vault");
  const [openId, setOpenId] = useState<number | null>(0);

  if (rules.length === 0) {
    return (
      <p className="text-body-md text-on-surface-variant">{t("rulesEmpty")}</p>
    );
  }

  return (
    <ul className="divide-outline-variant/20 divide-y">
      {rules.map((rule, index) => {
        const open = openId === index;
        return (
          <li key={`${rule.title}-${index}`}>
            <button
              type="button"
              className="btn-press flex w-full items-center justify-between gap-3 py-4 text-start"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : index)}
            >
              <span className="text-body-md text-on-surface font-semibold">
                {rule.title}
              </span>
              <MaterialIcon
                name={open ? "expand_less" : "expand_more"}
                className="text-on-surface-variant shrink-0"
              />
            </button>
            {open ? (
              <p className="text-body-md text-on-surface-variant pb-4 whitespace-pre-wrap">
                {rule.body || t("ruleNoBody")}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function HouseVaultPanel({
  houseName,
  username,
  vaultData,
  isAdmin,
  vaultIntroSeen,
}: HouseVaultPanelProps) {
  const t = useTranslations("vault");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingWifi, setEditingWifi] = useState(false);
  const [editingCodes, setEditingCodes] = useState(false);
  const [editingBills, setEditingBills] = useState(false);
  const [editingContacts, setEditingContacts] = useState(false);
  const [editingRules, setEditingRules] = useState(false);

  const wifi = vaultData.wifi;
  const doorCodes = vaultData.doorCodes ?? [];
  const fixedBills = vaultData.fixedBills ?? [];
  const contacts = vaultData.contacts ?? [];
  const rules = vaultData.rules ?? [];

  function showCopied() {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleContinue() {
    setLoading(true);
    setError(null);
    const result = await markVaultIntroSeenAction();
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
    router.push("/dashboard");
  }

  async function savePatch(patch: HouseVaultData) {
    setLoading(true);
    setError(null);
    const result = await updateVaultDataAction(patch);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditingWifi(false);
    setEditingCodes(false);
    setEditingBills(false);
    setEditingContacts(false);
    setEditingRules(false);
    router.refresh();
  }

  return (
    <div className="relative space-y-8 pb-24">
      <div
        className="bg-primary-fixed text-on-surface rounded-[2rem] p-stitch-lg shadow-card"
        role="banner"
      >
        <div className="flex items-start gap-4">
          <div className="bg-primary-container text-on-primary-container flex size-14 shrink-0 items-center justify-center rounded-2xl">
            <MaterialIcon name="home_storage" size={32} />
          </div>
          <div className="min-w-0">
            <h1 className="text-display-lg font-bold">
              {t("welcome", { house: houseName, name: username })}
            </h1>
            <p className="text-body-md text-on-surface-variant mt-2">
              {t("subtitle")}
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-error text-sm font-medium" role="alert">
          {error}
        </p>
      ) : null}

      <div aria-live="polite" className="sr-only">
        {copied ? t("copied") : null}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-headline-md text-on-surface font-semibold">
            {t("quickActions")}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-surface-container-lowest shadow-card border-outline-variant/20 flex flex-col rounded-3xl border p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MaterialIcon name="wifi" className="text-primary-container" />
                <span className="text-label-md text-on-surface font-semibold">
                  {t("wifi")}
                </span>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  className="text-primary text-label-sm font-semibold"
                  onClick={() => setEditingWifi((v) => !v)}
                >
                  {editingWifi ? tc("cancel") : tc("edit")}
                </button>
              ) : null}
            </div>
            {editingWifi && isAdmin ? (
              <WifiEditForm
                initial={wifi}
                loading={loading}
                onSave={(w) => savePatch({ wifi: w })}
                onCancel={() => setEditingWifi(false)}
              />
            ) : wifi ? (
              <>
                <p className="text-body-md text-on-surface mb-2 font-medium">
                  {wifi.ssid}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="password"
                    readOnly
                    value={wifi.password}
                    className="h-11 flex-1 rounded-xl font-mono text-sm"
                    aria-label={t("wifiPassword")}
                  />
                  <CopyButton
                    value={wifi.password}
                    label={t("copyPassword")}
                    onCopied={showCopied}
                  />
                  <button
                    type="button"
                    onClick={() => setQrOpen(true)}
                    className="btn-press text-primary-container flex size-10 shrink-0 items-center justify-center rounded-xl"
                    aria-label={t("showQr")}
                  >
                    <MaterialIcon name="qr_code_2" size={22} />
                  </button>
                </div>
                <WifiQrModal
                  open={qrOpen}
                  onClose={() => setQrOpen(false)}
                  ssid={wifi.ssid}
                  password={wifi.password}
                />
              </>
            ) : (
              <p className="text-body-md text-on-surface-variant">
                {isAdmin ? t("wifiEmptyAdmin") : t("wifiEmpty")}
              </p>
            )}
          </div>

          <div className="bg-surface-container-lowest shadow-card border-outline-variant/20 flex flex-col rounded-3xl border p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MaterialIcon name="door_front" className="text-primary-container" />
                <span className="text-label-md text-on-surface font-semibold">
                  {t("doorCodes")}
                </span>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  className="text-primary text-label-sm font-semibold"
                  onClick={() => setEditingCodes((v) => !v)}
                >
                  {editingCodes ? tc("cancel") : tc("edit")}
                </button>
              ) : null}
            </div>
            {editingCodes && isAdmin ? (
              <DoorCodesEditForm
                initial={doorCodes}
                loading={loading}
                onSave={(codes) => savePatch({ doorCodes: codes })}
                onCancel={() => setEditingCodes(false)}
              />
            ) : doorCodes.length > 0 ? (
              <ul className="space-y-3">
                {doorCodes.map((item, i) => (
                  <li key={`${item.label}-${i}`} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-label-sm text-on-surface-variant">
                        {item.label}
                      </p>
                      <Input
                        type="password"
                        readOnly
                        value={item.code}
                        className="mt-1 h-10 rounded-xl font-mono text-sm"
                        aria-label={item.label}
                      />
                    </div>
                    <CopyButton
                      value={item.code}
                      label={t("copyCode", { label: item.label })}
                      onCopied={showCopied}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-md text-on-surface-variant">
                {isAdmin ? t("codesEmptyAdmin") : t("codesEmpty")}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-surface-container-lowest shadow-card border-outline-variant/20 rounded-3xl border p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MaterialIcon name="receipt_long" className="text-primary-container" />
            <h2 className="text-headline-md text-on-surface font-semibold">
              {t("fixedBills")}
            </h2>
          </div>
          {isAdmin ? (
            <button
              type="button"
              className="text-primary text-label-sm font-semibold"
              onClick={() => setEditingBills((v) => !v)}
            >
              {editingBills ? tc("cancel") : tc("edit")}
            </button>
          ) : null}
        </div>
        {editingBills && isAdmin ? (
          <FixedBillsEditForm
            initial={fixedBills}
            loading={loading}
            onSave={(bills) => savePatch({ fixedBills: bills })}
            onCancel={() => setEditingBills(false)}
          />
        ) : fixedBills.length > 0 ? (
          <ul className="space-y-3">
            {fixedBills.map((bill, i) => (
              <li
                key={`${bill.name}-${i}`}
                className="border-outline-variant/15 flex items-start gap-4 rounded-2xl border p-4"
              >
                <div className="bg-secondary-container text-on-secondary-container flex size-11 shrink-0 items-center justify-center rounded-xl">
                  <MaterialIcon name="payments" size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-body-md text-on-surface font-semibold">
                    {bill.name}
                  </p>
                  <p className="text-headline-md text-primary-container mt-1 font-bold">
                    {centsToDisplay(bill.amountCents, { locale })}
                  </p>
                  {bill.dueDay ? (
                    <p className="text-label-sm text-on-surface-variant mt-1">
                      {t("billDueOnDay", { day: bill.dueDay })}
                    </p>
                  ) : null}
                  {bill.notes ? (
                    <p className="text-body-md text-on-surface-variant mt-2 whitespace-pre-wrap">
                      {bill.notes}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-md text-on-surface-variant">
            {isAdmin ? t("fixedBillsEmptyAdmin") : t("fixedBillsEmpty")}
          </p>
        )}
      </section>

      <section className="bg-surface-container-lowest shadow-card border-outline-variant/20 rounded-3xl border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-headline-md text-on-surface font-semibold">
            {t("contacts")}
          </h2>
          {isAdmin ? (
            <button
              type="button"
              className="text-primary text-label-sm font-semibold"
              onClick={() => setEditingContacts((v) => !v)}
            >
              {editingContacts ? tc("cancel") : tc("edit")}
            </button>
          ) : null}
        </div>
        {editingContacts && isAdmin ? (
          <ContactsEditForm
            initial={contacts}
            loading={loading}
            onSave={(c) => savePatch({ contacts: c })}
            onCancel={() => setEditingContacts(false)}
          />
        ) : contacts.length > 0 ? (
          <ul className="space-y-4">
            {contacts.map((contact, i) => (
              <li
                key={`${contact.name}-${i}`}
                className="border-outline-variant/15 flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0"
              >
                <ContactAvatar name={contact.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-body-md text-on-surface font-semibold">
                    {contact.name}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {contact.phone ? (
                    <a
                      href={`tel:${phoneDigits(contact.phone)}`}
                      className="btn-press bg-primary-container text-on-primary-container flex size-10 items-center justify-center rounded-full"
                      aria-label={t("call", { name: contact.name })}
                    >
                      <MaterialIcon name="call" size={20} />
                    </a>
                  ) : null}
                  {contact.whatsapp ? (
                    <a
                      href={`https://wa.me/${phoneDigits(contact.whatsapp)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-press bg-tertiary-container text-on-tertiary-container flex size-10 items-center justify-center rounded-full"
                      aria-label={t("whatsapp", { name: contact.name })}
                    >
                      <MaterialIcon name="chat" size={20} />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-md text-on-surface-variant">{t("contactsEmpty")}</p>
        )}
      </section>

      <section className="bg-surface-container-lowest shadow-card border-outline-variant/20 rounded-3xl border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-headline-md text-on-surface font-semibold">
            {t("houseCode")}
          </h2>
          {isAdmin ? (
            <button
              type="button"
              className="text-primary text-label-sm font-semibold"
              onClick={() => setEditingRules((v) => !v)}
            >
              {editingRules ? tc("cancel") : tc("edit")}
            </button>
          ) : null}
        </div>
        {editingRules && isAdmin ? (
          <RulesEditForm
            initial={rules}
            loading={loading}
            onSave={(r) => savePatch({ rules: r })}
            onCancel={() => setEditingRules(false)}
          />
        ) : (
          <VaultRuleAccordion rules={rules} />
        )}
      </section>

      {!vaultIntroSeen ? (
        <div className="border-outline-variant/20 bg-surface/95 fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 border-t px-4 py-4 backdrop-blur-md md:bottom-0 md:start-64 md:end-0">
          <div className="max-w-container-max mx-auto">
            <Button
              type="button"
              disabled={loading}
              onClick={handleContinue}
              className="btn-press bg-primary text-primary-foreground h-14 w-full rounded-2xl text-base font-bold shadow-lg"
            >
              {t("continueToDashboard")}
            </Button>
          </div>
        </div>
      ) : null}

      {copied ? (
        <div
          className="bg-on-surface text-surface fixed start-1/2 top-20 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg"
          role="status"
        >
          {t("copied")}
        </div>
      ) : null}
    </div>
  );
}

function WifiEditForm({
  initial,
  loading,
  onSave,
  onCancel,
}: {
  initial?: HouseVaultWifi;
  loading: boolean;
  onSave: (wifi: HouseVaultWifi) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("vault");
  const tc = useTranslations("common");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ssid = String(fd.get("ssid") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!ssid) return;
    onSave({ ssid, password });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="vault-wifi-ssid">{t("wifiSsid")}</Label>
        <Input
          id="vault-wifi-ssid"
          name="ssid"
          defaultValue={initial?.ssid ?? ""}
          required
          className="h-11 rounded-xl"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="vault-wifi-password">{t("wifiPassword")}</Label>
        <Input
          id="vault-wifi-password"
          name="password"
          type="text"
          defaultValue={initial?.password ?? ""}
          className="h-11 rounded-xl"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="rounded-xl font-bold">
          {tc("save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}

function DoorCodesEditForm({
  initial,
  loading,
  onSave,
  onCancel,
}: {
  initial: HouseVaultDoorCode[];
  loading: boolean;
  onSave: (codes: HouseVaultDoorCode[]) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("vault");
  const tc = useTranslations("common");
  const [rows, setRows] = useState<HouseVaultDoorCode[]>(
    initial.length > 0 ? initial : [{ label: "", code: "" }],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const codes = rows
      .map((r) => ({ label: r.label.trim(), code: r.code }))
      .filter((r) => r.label && r.code);
    onSave(codes);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-2 gap-2">
          <Input
            placeholder={t("codeLabel")}
            value={row.label}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], label: e.target.value };
              setRows(next);
            }}
            className="h-10 rounded-xl"
          />
          <Input
            placeholder={t("codeValue")}
            value={row.code}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], code: e.target.value };
              setRows(next);
            }}
            className="h-10 rounded-xl"
          />
        </div>
      ))}
      <button
        type="button"
        className="text-primary text-label-sm font-semibold"
        onClick={() => setRows([...rows, { label: "", code: "" }])}
      >
        {t("addCode")}
      </button>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="rounded-xl font-bold">
          {tc("save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}

type FixedBillRow = {
  name: string;
  amount: string;
  dueDay: string;
  notes: string;
};

function billToRow(bill: HouseVaultFixedBill): FixedBillRow {
  return {
    name: bill.name,
    amount: (bill.amountCents / 100).toFixed(2),
    dueDay: bill.dueDay ? String(bill.dueDay) : "",
    notes: bill.notes ?? "",
  };
}

function FixedBillsEditForm({
  initial,
  loading,
  onSave,
  onCancel,
}: {
  initial: HouseVaultFixedBill[];
  loading: boolean;
  onSave: (bills: HouseVaultFixedBill[]) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("vault");
  const tc = useTranslations("common");
  const [rows, setRows] = useState<FixedBillRow[]>(
    initial.length > 0
      ? initial.map(billToRow)
      : [{ name: "", amount: "", dueDay: "", notes: "" }],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bills: HouseVaultFixedBill[] = [];
    for (const row of rows) {
      const name = row.name.trim();
      const amountCents = parseAmountToCents(row.amount);
      if (!name || amountCents === null || amountCents <= 0) continue;
      const dueDayNum = row.dueDay.trim()
        ? Number.parseInt(row.dueDay, 10)
        : undefined;
      const dueDay =
        dueDayNum !== undefined &&
        Number.isInteger(dueDayNum) &&
        dueDayNum >= 1 &&
        dueDayNum <= 31
          ? dueDayNum
          : undefined;
      bills.push({
        name,
        amountCents,
        dueDay,
        notes: row.notes.trim() || undefined,
      });
    }
    onSave(bills);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {rows.map((row, i) => (
        <div
          key={i}
          className="border-outline-variant/15 grid gap-2 rounded-2xl border p-4 sm:grid-cols-2"
        >
          <Input
            placeholder={t("billName")}
            value={row.name}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], name: e.target.value };
              setRows(next);
            }}
            className="h-10 rounded-xl sm:col-span-2"
          />
          <Input
            placeholder={t("billAmount")}
            inputMode="decimal"
            value={row.amount}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], amount: e.target.value };
              setRows(next);
            }}
            className="h-10 rounded-xl"
          />
          <Input
            placeholder={t("billDueDay")}
            inputMode="numeric"
            min={1}
            max={31}
            value={row.dueDay}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], dueDay: e.target.value };
              setRows(next);
            }}
            className="h-10 rounded-xl"
          />
          <Input
            placeholder={t("billNotes")}
            value={row.notes}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], notes: e.target.value };
              setRows(next);
            }}
            className="h-10 rounded-xl sm:col-span-2"
          />
        </div>
      ))}
      <button
        type="button"
        className="text-primary text-label-sm font-semibold"
        onClick={() =>
          setRows([...rows, { name: "", amount: "", dueDay: "", notes: "" }])
        }
      >
        {t("addBill")}
      </button>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="rounded-xl font-bold">
          {tc("save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}

function ContactsEditForm({
  initial,
  loading,
  onSave,
  onCancel,
}: {
  initial: HouseVaultContact[];
  loading: boolean;
  onSave: (contacts: HouseVaultContact[]) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("vault");
  const tc = useTranslations("common");
  const [rows, setRows] = useState<HouseVaultContact[]>(
    initial.length > 0
      ? initial
      : [{ name: "", phone: "", whatsapp: "" }],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const contacts = rows
      .map((r) => ({
        name: r.name.trim(),
        phone: r.phone?.trim() || undefined,
        whatsapp: r.whatsapp?.trim() || undefined,
      }))
      .filter((r) => r.name);
    onSave(contacts);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {rows.map((row, i) => (
        <div
          key={i}
          className="border-outline-variant/15 space-y-2 rounded-2xl border p-4"
        >
          <Input
            placeholder={t("contactName")}
            value={row.name}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], name: e.target.value };
              setRows(next);
            }}
            className="h-10 rounded-xl"
          />
          <Input
            placeholder={t("contactPhone")}
            value={row.phone ?? ""}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], phone: e.target.value };
              setRows(next);
            }}
            className="h-10 rounded-xl"
          />
          <Input
            placeholder={t("contactWhatsapp")}
            value={row.whatsapp ?? ""}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], whatsapp: e.target.value };
              setRows(next);
            }}
            className="h-10 rounded-xl"
          />
        </div>
      ))}
      <button
        type="button"
        className="text-primary text-label-sm font-semibold"
        onClick={() =>
          setRows([...rows, { name: "", phone: "", whatsapp: "" }])
        }
      >
        {t("addContact")}
      </button>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="rounded-xl font-bold">
          {tc("save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}

function RulesEditForm({
  initial,
  loading,
  onSave,
  onCancel,
}: {
  initial: HouseVaultRule[];
  loading: boolean;
  onSave: (rules: HouseVaultRule[]) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("vault");
  const tc = useTranslations("common");
  const [rows, setRows] = useState<HouseVaultRule[]>(
    initial.length > 0
      ? initial
      : [
          { title: t("ruleQuietHours"), body: "" },
          { title: t("ruleCleaning"), body: "" },
          { title: t("ruleGuests"), body: "" },
        ],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rules = rows
      .map((r) => ({ title: r.title.trim(), body: r.body.trim() }))
      .filter((r) => r.title);
    onSave(rules);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {rows.map((row, i) => (
        <div
          key={i}
          className="border-outline-variant/15 space-y-2 rounded-2xl border p-4"
        >
          <Input
            placeholder={t("ruleTitle")}
            value={row.title}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], title: e.target.value };
              setRows(next);
            }}
            className="h-10 rounded-xl"
          />
          <textarea
            placeholder={t("ruleBody")}
            value={row.body}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...next[i], body: e.target.value };
              setRows(next);
            }}
            rows={3}
            className={cn(
              "border-input bg-background w-full rounded-xl border px-3 py-2 text-sm",
            )}
          />
        </div>
      ))}
      <button
        type="button"
        className="text-primary text-label-sm font-semibold"
        onClick={() => setRows([...rows, { title: "", body: "" }])}
      >
        {t("addRule")}
      </button>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="rounded-xl font-bold">
          {tc("save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
