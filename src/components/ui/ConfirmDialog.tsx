"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button (destructive actions) */
  danger?: boolean;
};

/**
 * Promise-based confirm — render `dialog` next to your page root (e.g. <>{content}{dialog}</>).
 */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | undefined>(undefined);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setPayload(opts);
      setOpen(true);
    });
  }, []);

  const finish = useCallback((v: boolean) => {
    setOpen(false);
    setPayload(null);
    const r = resolveRef.current;
    resolveRef.current = undefined;
    r?.(v);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  const dialog =
    open &&
    payload &&
    typeof document !== "undefined" &&
    createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => finish(false)}
          aria-hidden
        />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-desc"
          className="relative w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl animate-scale-in p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="confirm-dialog-title" className="text-lg font-bold text-[var(--color-gold)] mb-2">
            {payload.title ?? (payload.danger ? "Confirm action" : "Please confirm")}
          </h2>
          <p id="confirm-dialog-desc" className="text-sm text-[var(--color-text)] whitespace-pre-wrap mb-6">
            {payload.message}
          </p>
          <div className="flex gap-2 justify-end flex-wrap">
            <button type="button" onClick={() => finish(false)} className="btn-secondary">
              {payload.cancelLabel ?? "Cancel"}
            </button>
            <button
              type="button"
              onClick={() => finish(true)}
              className={payload.danger ? "btn-danger" : "btn-primary"}
            >
              {payload.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  return { confirm, dialog };
}

export type AlertOptions = {
  title?: string;
  message: string;
  buttonLabel?: string;
};

export function useAlert() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<AlertOptions | null>(null);
  const resolveRef = useRef<(() => void) | undefined>(undefined);

  const alert = useCallback((message: string, title?: string) => {
    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      setPayload({ message, title });
      setOpen(true);
    });
  }, []);

  const alertWith = useCallback((opts: AlertOptions) => {
    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      setPayload(opts);
      setOpen(true);
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setPayload(null);
    resolveRef.current?.();
    resolveRef.current = undefined;
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const dialog =
    open &&
    payload &&
    typeof document !== "undefined" &&
    createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} aria-hidden />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-desc"
          className="relative w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl animate-scale-in p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="alert-dialog-title" className="text-lg font-bold text-[var(--color-gold)] mb-2">
            {payload.title ?? "Notice"}
          </h2>
          <p id="alert-dialog-desc" className="text-sm text-[var(--color-text)] whitespace-pre-wrap mb-6">
            {payload.message}
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={close} className="btn-primary">
              {payload.buttonLabel ?? "OK"}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  return { alert, alertWith, dialog };
}

export type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Controlled confirm modal (same visuals as `useConfirm`). */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="controlled-confirm-title"
        aria-describedby="controlled-confirm-desc"
        className="relative w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl animate-scale-in p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="controlled-confirm-title" className="text-lg font-bold text-[var(--color-gold)] mb-2">
          {title ?? (danger ? "Confirm action" : "Please confirm")}
        </h2>
        <p id="controlled-confirm-desc" className="text-sm text-[var(--color-text)] whitespace-pre-wrap mb-6">
          {message}
        </p>
        <div className="flex gap-2 justify-end flex-wrap">
          <button type="button" onClick={onCancel} className="btn-secondary">
            {cancelLabel ?? "Cancel"}
          </button>
          <button type="button" onClick={onConfirm} className={danger ? "btn-danger" : "btn-primary"}>
            {confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
