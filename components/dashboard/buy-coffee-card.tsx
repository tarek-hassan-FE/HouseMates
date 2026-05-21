"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { BuyCoffeeModal } from "@/components/dashboard/buy-coffee-modal";

export function BuyCoffeeCard() {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);

  return (
    <section className="bg-surface-container-lowest shadow-card border-outline-variant/20 mb-6 rounded-3xl border p-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-press flex w-full items-center gap-4 rounded-2xl bg-background px-4 py-4 text-start"
      >
        <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-2xl">
          <MaterialIcon name="local_cafe" size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-headline-md text-on-surface font-semibold">
            {t("buyCoffee")}
          </h2>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            {t("buyCoffeeDesc")}
          </p>
        </div>
        <MaterialIcon
          name="qr_code_2"
          size={24}
          className="text-on-surface-variant shrink-0"
        />
      </button>
      <BuyCoffeeModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
