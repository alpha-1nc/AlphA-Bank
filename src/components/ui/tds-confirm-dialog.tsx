"use client";

import { isValidElement, type ReactNode } from "react";
import { Button, type ButtonProps, type ButtonSize } from "./tds-button";
import { DialogDescription, DialogShell, DialogTitle, type DialogShellProps } from "./tds-alert-dialog";

/**
 * TDS ConfirmDialog API를 따르는 자체 구현 (취소·확인 두 버튼).
 * 문자열 버튼은 기본 버튼으로 감싸고 누르면 onClose. 동작이 필요하면 ConfirmDialog.ConfirmButton 등을 직접 넘긴다.
 */

export type ConfirmDialogProps = Omit<DialogShellProps, "footer"> & {
  cancelButton?: ReactNode;
  confirmButton?: ReactNode;
};

type LegacySize = "medium" | "big" | "large" | "tiny";
/** TDS 구 버튼 크기 → 우리 Button 크기 */
const LEGACY_SIZE: Record<LegacySize, ButtonSize> = {
  tiny: "small",
  medium: "medium",
  large: "large",
  big: "xlarge",
};

export type ConfirmDialogCancelButtonProps = Omit<ButtonProps, "color" | "variant" | "size" | "style" | "type"> & {
  type?: "primary" | "danger" | "light" | "dark";
  style?: "fill" | "weak";
  size?: LegacySize;
};

function CancelButton({ type = "dark", style = "weak", size = "large", ...rest }: ConfirmDialogCancelButtonProps) {
  return <Button {...(rest as object)} color={type} variant={style} size={LEGACY_SIZE[size]} display="block" />;
}

export type ConfirmDialogConfirmButtonProps = ButtonProps;

function ConfirmButton({ size = "large", ...rest }: ConfirmDialogConfirmButtonProps) {
  return <Button {...(rest as object)} size={size} display="block" />;
}

function ConfirmDialogRoot({ cancelButton = "취소", confirmButton = "확인", onClose, ...props }: ConfirmDialogProps) {
  const cancel = isValidElement(cancelButton) ? (
    cancelButton
  ) : (
    <CancelButton onClick={() => onClose?.()}>{cancelButton}</CancelButton>
  );
  const confirm = isValidElement(confirmButton) ? (
    confirmButton
  ) : (
    <ConfirmButton onClick={() => onClose?.()}>{confirmButton}</ConfirmButton>
  );
  return (
    <DialogShell
      {...props}
      onClose={onClose}
      footer={
        <div className="-mx-2 flex gap-2 pb-2 [&>*]:min-w-0 [&>*]:flex-1">
          {cancel}
          {confirm}
        </div>
      }
    />
  );
}

export const ConfirmDialog = Object.assign(ConfirmDialogRoot, {
  Title: DialogTitle,
  Description: DialogDescription,
  CancelButton,
  ConfirmButton,
});
