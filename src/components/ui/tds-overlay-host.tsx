"use client";

import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { AlertDialog } from "./tds-alert-dialog";
import { BottomSheet } from "./tds-bottom-sheet";
import { Button } from "./tds-button";
import { ConfirmDialog } from "./tds-confirm-dialog";
import { Toast } from "./tds-toast";
import type { OverlayHostProps } from "./tds-overlay";

/**
 * useToast / useDialog / useBottomSheet가 여는 오버레이를 실제로 그리는 곳.
 * OverlayProvider가 처음 열 때 동적으로 불러온다.
 */

type ClickableProps = { onClick?: () => void } & Record<string, unknown>;

/** 문자열이면 기본 버튼, 요소면 onClick·loading prop을 덧붙여 복제 */
function withHandler(
  node: ReactElement | string | undefined,
  fallback: (label: string, onClick: () => void, loading: boolean) => ReactNode,
  defaultLabel: string,
  onClick: () => void,
  loading = false,
  loadingPropName = "loading"
): ReactNode {
  if (node == null || typeof node === "string") return fallback(node ?? defaultLabel, onClick, loading);
  if (!isValidElement<ClickableProps>(node)) return node;
  const original = node.props.onClick;
  return cloneElement(node, {
    onClick: () => {
      original?.();
      onClick();
    },
    [loadingPropName]: loading,
  });
}

export default function OverlayHost({
  toast,
  dialog,
  sheet,
  closeToast,
  clearToast,
  closeDialog,
  clearDialog,
  closeSheet,
  clearSheet,
}: OverlayHostProps) {
  const [busy, setBusy] = useState<null | "confirm" | "cancel" | "left" | "right" | "one">(null);

  /* ── Toast ── */
  let toastNode: ReactNode = null;
  if (toast) {
    const o = toast.options;
    const id = toast.id;
    toastNode = (
      <Toast
        key={id}
        open={toast.open}
        position={o.type ?? "bottom"}
        text={toast.message}
        gap={o.gap}
        higherThanCTA={o.higherThanCTA}
        duration={o.duration}
        leftAddon={o.icon ? <Toast.Icon icon={o.icon} iconType={o.iconType} /> : undefined}
        button={
          o.button ? (
            <Toast.Button
              onClick={() => {
                o.button?.onClick();
                closeToast();
              }}
            >
              {o.button.text}
            </Toast.Button>
          ) : undefined
        }
        onClose={closeToast}
        onExited={() => clearToast(id)}
      />
    );
  }

  /* ── Dialog ── */
  let dialogNode: ReactNode = null;
  if (dialog) {
    const id = dialog.id;
    const finish = (ok: boolean) => {
      setBusy(null);
      closeDialog(id);
      (dialog.resolve as (v: boolean) => void)(ok);
    };
    const common = {
      open: dialog.open,
      title: dialog.options.title,
      description: dialog.options.description,
      closeOnDimmerClick: dialog.options.closeOnDimmerClick ?? false,
      onClose: () => finish(false),
      onEntered: dialog.options.onEntered,
      onExited: () => {
        clearDialog(id);
        dialog.options.onExited?.();
      },
    };

    if (dialog.kind === "alert") {
      dialogNode = (
        <AlertDialog
          key={id}
          {...common}
          alertButton={withHandler(
            dialog.options.alertButton,
            (label, onClick) => (
              <AlertDialog.AlertButton onClick={onClick}>
                {label}
              </AlertDialog.AlertButton>
            ),
            "확인",
            () => finish(true)
          )}
        />
      );
    } else {
      const o = dialog.options;
      const isAsync = dialog.kind === "asyncConfirm";
      const asyncOpts = isAsync ? (o as typeof dialog.options & { kind?: never }) : null;
      const run = async (which: "confirm" | "cancel") => {
        const fn =
          which === "confirm"
            ? (asyncOpts as { onConfirmClick?: () => Promise<void> } | null)?.onConfirmClick
            : (asyncOpts as { onCancelClick?: () => Promise<void> } | null)?.onCancelClick;
        if (fn) {
          setBusy(which);
          try {
            await fn();
          } finally {
            setBusy(null);
          }
        }
        finish(which === "confirm");
      };
      const confirmLoadingProp =
        (asyncOpts as { confirmButtonLoadingPropName?: string } | null)?.confirmButtonLoadingPropName ?? "loading";
      const cancelLoadingProp =
        (asyncOpts as { cancelButtonLoadingPropName?: string } | null)?.cancelButtonLoadingPropName ?? "loading";
      dialogNode = (
        <ConfirmDialog
          key={id}
          {...common}
          onClose={() => (busy ? undefined : finish(false))}
          cancelButton={withHandler(
            o.cancelButton,
            (label, onClick, loading) => (
              <ConfirmDialog.CancelButton onClick={onClick} loading={loading} disabled={busy === "confirm"}>
                {label}
              </ConfirmDialog.CancelButton>
            ),
            "취소",
            () => void run("cancel"),
            busy === "cancel",
            cancelLoadingProp
          )}
          confirmButton={withHandler(
            o.confirmButton,
            (label, onClick, loading) => (
              <ConfirmDialog.ConfirmButton onClick={onClick} loading={loading} disabled={busy === "cancel"}>
                {label}
              </ConfirmDialog.ConfirmButton>
            ),
            "확인",
            () => void run("confirm"),
            busy === "confirm",
            confirmLoadingProp
          )}
        />
      );
    }
  }

  /* ── BottomSheet ── */
  let sheetNode: ReactNode = null;
  if (sheet) {
    const id = sheet.id;
    const o = sheet.options;
    const finish = (v: boolean, close = true) => {
      setBusy(null);
      if (close) closeSheet(id);
      (sheet.resolve as (x: boolean) => void)(v);
    };
    const runAsync = async (which: "one" | "left" | "right", fn: (() => Promise<void>) | undefined, value: boolean) => {
      if (fn) {
        setBusy(which);
        try {
          await fn();
        } finally {
          setBusy(null);
        }
      }
      finish(value);
    };

    let cta: ReactNode = undefined;
    if (sheet.kind === "one" || sheet.kind === "asyncOne") {
      const isAsync = sheet.kind === "asyncOne";
      const opts = sheet.options as { button?: string | ReactElement; closeOnButtonClick?: boolean; onClick?: () => Promise<void>; loadingPropName?: string };
      cta = withHandler(
        opts.button,
        (label, onClick, loading) => (
          <BottomSheet.CTA onClick={onClick} loading={loading}>
            {label}
          </BottomSheet.CTA>
        ),
        "확인",
        () => (isAsync ? void runAsync("one", opts.onClick, true) : finish(true, opts.closeOnButtonClick ?? true)),
        busy === "one",
        opts.loadingPropName ?? "loading"
      );
    } else if (sheet.kind === "two" || sheet.kind === "asyncTwo") {
      const isAsync = sheet.kind === "asyncTwo";
      const opts = sheet.options as {
        leftButton?: string | ReactElement;
        rightButton?: string | ReactElement;
        closeOnLeftButtonClick?: boolean;
        closeOnRightButtonClick?: boolean;
        onLeftButtonClick?: () => Promise<void>;
        onRightButtonClick?: () => Promise<void>;
      };
      cta = (
        <BottomSheet.DoubleCTA
          leftButton={withHandler(
            opts.leftButton,
            (label, onClick, loading) => (
              <Button size="xlarge" display="block" color="light" onClick={onClick} loading={loading} disabled={busy === "right"}>
                {label}
              </Button>
            ),
            "취소",
            () => (isAsync ? void runAsync("left", opts.onLeftButtonClick, false) : finish(false, opts.closeOnLeftButtonClick ?? true)),
            busy === "left"
          )}
          rightButton={withHandler(
            opts.rightButton,
            (label, onClick, loading) => (
              <Button size="xlarge" display="block" onClick={onClick} loading={loading} disabled={busy === "left"}>
                {label}
              </Button>
            ),
            "확인",
            () => (isAsync ? void runAsync("right", opts.onRightButtonClick, true) : finish(true, opts.closeOnRightButtonClick ?? true)),
            busy === "right"
          )}
        />
      );
    }

    sheetNode = (
      <BottomSheet
        key={id}
        open={sheet.open}
        header={o.header}
        cta={cta}
        onClose={() => (busy ? undefined : finish(false))}
        onDimmerClick={() => {
          if ((o.closeOnDimmerClick ?? true) && !busy) finish(false);
        }}
        onEntered={o.onEntered}
        onExited={() => {
          clearSheet(id);
          o.onExited?.();
        }}
      >
        {o.children}
      </BottomSheet>
    );
  }

  return (
    <>
      {toastNode}
      {dialogNode}
      {sheetNode}
    </>
  );
}
