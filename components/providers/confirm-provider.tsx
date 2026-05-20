"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type ConfirmOptions = {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type DialogState = ConfirmOptions & {
  confirmLabel: string;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const tc = useTranslations("common");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    setDialog(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current?.(false);
        resolveRef.current = resolve;
        setDialog({
          ...options,
          confirmLabel: options.confirmLabel ?? tc("confirm"),
        });
      }),
    [tc],
  );

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <ConfirmDialog
          open
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          destructive={dialog.destructive}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx.confirm;
}
