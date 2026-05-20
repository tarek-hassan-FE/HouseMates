"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { useConfirm } from "@/components/providers/confirm-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ShoppingListItem } from "@/lib/database.types";
import {
  addShoppingListItemAction,
  removeShoppingListItemAction,
} from "@/app/[locale]/(app)/shopping/actions";

type ShoppingListPanelProps = {
  items: ShoppingListItem[];
};

export function ShoppingListPanel({ items }: ShoppingListPanelProps) {
  const t = useTranslations("shoppingList");
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await addShoppingListItemAction(formData);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  async function handleRemove(id: string, title: string) {
    const ok = await confirm({
      title: t("deleteConfirmTitle"),
      message: t("deleteConfirm", { title }),
      confirmLabel: t("delete"),
      destructive: true,
    });
    if (!ok) return;

    setError(null);
    const result = await removeShoppingListItemAction(id);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="bg-secondary-fixed text-on-secondary-fixed rounded-[2rem] p-8">
        <div className="flex items-start gap-4">
          <div className="bg-on-secondary-fixed/10 flex size-14 shrink-0 items-center justify-center rounded-2xl">
            <MaterialIcon name="shopping_cart" size={32} />
          </div>
          <div>
            <h1 className="text-headline-md font-bold">{t("title")}</h1>
            <p className="text-body-md mt-2 opacity-90">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleAdd}
        className="bg-surface-container-lowest border-outline-variant/10 space-y-4 rounded-2xl border p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="shopping-list-title">{t("itemName")}</Label>
          <Input
            id="shopping-list-title"
            name="title"
            required
            placeholder={t("itemPlaceholder")}
            className="h-14 rounded-xl"
          />
        </div>
        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="btn-press bg-primary text-primary-foreground h-12 w-full rounded-xl font-bold"
        >
          {loading ? t("adding") : t("addBtn")}
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-title-md text-on-surface font-bold">
          {t("pendingTitle", { count: items.length })}
        </h2>
        {items.length === 0 ? (
          <p className="text-on-surface-variant text-body-md rounded-2xl border border-dashed border-outline-variant/30 p-8 text-center">
            {t("empty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="bg-surface-container-lowest border-outline-variant/10 flex items-center gap-3 rounded-2xl border px-4 py-4"
              >
                <MaterialIcon
                  name="check_box_outline_blank"
                  className="text-on-surface-variant shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body-lg text-on-surface truncate font-semibold">
                    {item.title}
                  </p>
                  {item.creator?.username && (
                    <p className="text-on-surface-variant text-label-sm mt-0.5">
                      {t("addedBy", { name: item.creator.username })}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id, item.title)}
                  className="btn-press text-on-surface-variant hover:text-destructive flex size-10 shrink-0 items-center justify-center rounded-full"
                  aria-label={t("removeItem", { title: item.title })}
                >
                  <MaterialIcon name="delete" size={22} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
