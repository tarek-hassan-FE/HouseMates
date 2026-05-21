"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { BuyCoffeeModal } from "@/components/dashboard/buy-coffee-modal";

export const ROOMIES_INSTAGRAM_URL =
  "https://www.instagram.com/roomies.egypt/";

function SupportRow({
  icon,
  iconClassName,
  title,
  description,
  trailingIcon,
}: {
  icon: string;
  iconClassName: string;
  title: string;
  description: string;
  trailingIcon: string;
}) {
  return (
    <>
      <span
        className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}
      >
        <MaterialIcon name={icon} size={28} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-headline-md text-on-surface font-semibold">
          {title}
        </h2>
        <p className="text-body-md text-on-surface-variant mt-0.5">
          {description}
        </p>
      </div>
      <MaterialIcon
        name={trailingIcon}
        size={24}
        className="text-on-surface-variant shrink-0"
      />
    </>
  );
}

export function SupportSectionCard() {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);

  return (
    <section className="bg-surface-container-lowest shadow-card border-outline-variant/20 mb-6 flex flex-col gap-2 rounded-3xl border p-4">
      <a
        href={ROOMIES_INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-press flex w-full items-center gap-4 rounded-2xl bg-background px-4 py-4 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <SupportRow
          icon="rate_review"
          iconClassName="bg-secondary-container text-on-secondary-container"
          title={t("giveFeedback")}
          description={t("giveFeedbackDesc")}
          trailingIcon="open_in_new"
        />
      </a>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-press border-outline-variant/20 flex w-full items-center gap-4 rounded-2xl border-t bg-background px-4 py-4 pt-6 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <SupportRow
          icon="local_cafe"
          iconClassName="bg-primary/10 text-primary"
          title={t("buyCoffee")}
          description={t("buyCoffeeDesc")}
          trailingIcon="qr_code_2"
        />
      </button>

      <BuyCoffeeModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
