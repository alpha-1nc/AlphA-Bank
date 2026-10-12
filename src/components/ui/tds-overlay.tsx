"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";

/**
 * TDS OverlayExtension 훅(useToast / useDialog / useBottomSheet)의 자체 구현.
 * 앱 최상위(layout)에 <OverlayProvider>가 있어야 한다.
 * 실제 오버레이 코드(motion 포함)는 처음 열 때 불러온다 → 페이지 첫 로드에는 이 파일만 실린다.
 */

/* ── 옵션 타입 (토스 문서 기준) ─────────────────────────────────────────── */
export type OpenToastOptions = {
  type?: "top" | "bottom";
  /** 화면 끝에서의 거리(px). 우선 적용 */
  gap?: number;
  /** 토스는 아이콘 이름(문자열)을 받지만 우리는 lucide 컴포넌트를 받는다 */
  icon?: LucideIcon;
  iconType?: "circle" | "square";
  button?: { text: string; onClick: () => void };
  higherThanCTA?: boolean;
  /** 기본 3000, button이 있으면 5000 */
  duration?: number;
};

type DialogCommon = {
  title: ReactNode;
  description?: ReactNode;
  closeOnDimmerClick?: boolean;
  onEntered?: () => void;
  onExited?: () => void;
};
export type AlertOptions = DialogCommon & { alertButton?: ReactElement | string };
export type ConfirmOptions = DialogCommon & {
  confirmButton?: ReactElement | string;
  cancelButton?: ReactElement | string;
};
export type AsyncConfirmOptions = ConfirmOptions & {
  onConfirmClick?: () => Promise<void>;
  confirmButtonLoadingPropName?: string;
  onCancelClick?: () => Promise<void>;
  cancelButtonLoadingPropName?: string;
};

export type BottomSheetOptions = {
  children: ReactNode;
  header?: ReactNode;
  closeOnDimmerClick?: boolean;
  onEntered?: () => void;
  onExited?: () => void;
};
export type OneButtonOptions = BottomSheetOptions & {
  button?: string | ReactElement;
  closeOnButtonClick?: boolean;
};
export type AsyncOneButtonOptions = BottomSheetOptions & {
  button?: string | ReactElement;
  onClick?: () => Promise<void>;
  loadingPropName?: string;
};
export type TwoButtonOptions = BottomSheetOptions & {
  leftButton?: string | ReactElement;
  rightButton?: string | ReactElement;
  closeOnLeftButtonClick?: boolean;
  closeOnRightButtonClick?: boolean;
};
export type AsyncTwoButtonOptions = TwoButtonOptions & {
  onLeftButtonClick?: () => Promise<void>;
  onRightButtonClick?: () => Promise<void>;
};

/* ── 내부 상태 (Host와 공유) ───────────────────────────────────────────── */
export type ToastEntry = { id: number; open: boolean; message: string; options: OpenToastOptions };

export type DialogEntry = { id: number; open: boolean } & (
  | { kind: "alert"; options: AlertOptions; resolve: () => void }
  | { kind: "confirm"; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: "asyncConfirm"; options: AsyncConfirmOptions; resolve: (ok: boolean) => void }
);

export type SheetEntry = { id: number; open: boolean } & (
  | { kind: "basic"; options: BottomSheetOptions; resolve: () => void }
  | { kind: "one"; options: OneButtonOptions; resolve: () => void }
  | { kind: "asyncOne"; options: AsyncOneButtonOptions; resolve: () => void }
  | { kind: "two"; options: TwoButtonOptions; resolve: (right: boolean) => void }
  | { kind: "asyncTwo"; options: AsyncTwoButtonOptions; resolve: (right: boolean) => void }
);

export type OverlayHostProps = {
  toast: ToastEntry | null;
  dialog: DialogEntry | null;
  sheet: SheetEntry | null;
  closeToast: () => void;
  clearToast: (id: number) => void;
  closeDialog: (id: number) => void;
  clearDialog: (id: number) => void;
  closeSheet: (id?: number) => void;
  clearSheet: (id: number) => void;
};

const OverlayHost = dynamic(() => import("./tds-overlay-host"), { ssr: false });

type Api = {
  openToast: (message: string, options?: OpenToastOptions) => void;
  openAlert: (options: AlertOptions) => Promise<void>;
  openConfirm: (options: ConfirmOptions) => Promise<boolean>;
  openAsyncConfirm: (options: AsyncConfirmOptions) => Promise<boolean>;
  openSheet: (options: BottomSheetOptions) => void;
  closeSheet: () => void;
  openOneButtonSheet: (options: OneButtonOptions) => Promise<void>;
  openAsyncOneButtonSheet: (options: AsyncOneButtonOptions) => Promise<void>;
  openTwoButtonSheet: (options: TwoButtonOptions) => Promise<boolean>;
  openAsyncTwoButtonSheet: (options: AsyncTwoButtonOptions) => Promise<boolean>;
};

const OverlayContext = createContext<Api | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const seq = useRef(0);
  const [used, setUsed] = useState(false);
  const [toast, setToast] = useState<ToastEntry | null>(null);
  const [dialog, setDialog] = useState<DialogEntry | null>(null);
  const [sheet, setSheet] = useState<SheetEntry | null>(null);

  const next = () => {
    setUsed(true);
    seq.current += 1;
    return seq.current;
  };

  const openSheetEntry = useCallback(<T,>(make: (id: number, resolve: (v: T) => void) => SheetEntry) => {
    return new Promise<T>((resolve) => {
      const id = next();
      setSheet((prev) => {
        // 이미 열린 시트가 있으면 그 Promise는 "닫힘"으로 끝낸다
        if (prev?.open) (prev.resolve as (v: boolean) => void)(false);
        return make(id, resolve);
      });
    });
  }, []);

  const openDialogEntry = useCallback(<T,>(make: (id: number, resolve: (v: T) => void) => DialogEntry) => {
    return new Promise<T>((resolve) => {
      const id = next();
      setDialog((prev) => {
        if (prev?.open) (prev.resolve as (v: boolean) => void)(false);
        return make(id, resolve);
      });
    });
  }, []);

  const api = useMemo<Api>(
    () => ({
      openToast: (message, options = {}) => {
        const id = next();
        setToast({ id, open: true, message, options });
      },
      openAlert: (options) =>
        openDialogEntry<void>((id, resolve) => ({ id, open: true, kind: "alert", options, resolve })),
      openConfirm: (options) =>
        openDialogEntry<boolean>((id, resolve) => ({ id, open: true, kind: "confirm", options, resolve })),
      openAsyncConfirm: (options) =>
        openDialogEntry<boolean>((id, resolve) => ({ id, open: true, kind: "asyncConfirm", options, resolve })),
      openSheet: (options) => {
        void openSheetEntry<void>((id, resolve) => ({ id, open: true, kind: "basic", options, resolve }));
      },
      closeSheet: () =>
        setSheet((prev) => {
          if (!prev) return prev;
          if (prev.open) (prev.resolve as (v: boolean) => void)(false);
          return { ...prev, open: false };
        }),
      openOneButtonSheet: (options) =>
        openSheetEntry<void>((id, resolve) => ({ id, open: true, kind: "one", options, resolve })),
      openAsyncOneButtonSheet: (options) =>
        openSheetEntry<void>((id, resolve) => ({ id, open: true, kind: "asyncOne", options, resolve })),
      openTwoButtonSheet: (options) =>
        openSheetEntry<boolean>((id, resolve) => ({ id, open: true, kind: "two", options, resolve })),
      openAsyncTwoButtonSheet: (options) =>
        openSheetEntry<boolean>((id, resolve) => ({ id, open: true, kind: "asyncTwo", options, resolve })),
    }),
    [openDialogEntry, openSheetEntry]
  );

  const hostProps: OverlayHostProps = {
    toast,
    dialog,
    sheet,
    closeToast: () => setToast((p) => (p ? { ...p, open: false } : p)),
    clearToast: (id) => setToast((p) => (p?.id === id ? null : p)),
    closeDialog: (id) => setDialog((p) => (p?.id === id ? { ...p, open: false } : p)),
    clearDialog: (id) => setDialog((p) => (p?.id === id ? null : p)),
    closeSheet: (id) => setSheet((p) => (p && (id === undefined || p.id === id) ? { ...p, open: false } : p)),
    clearSheet: (id) => setSheet((p) => (p?.id === id ? null : p)),
  };

  return (
    <OverlayContext.Provider value={api}>
      {children}
      {used && <OverlayHost {...hostProps} />}
    </OverlayContext.Provider>
  );
}

function useOverlayApi(name: string): Api {
  const api = useContext(OverlayContext);
  if (!api) throw new Error(`${name}는 OverlayProvider 안에서 써야 합니다.`);
  return api;
}

/** 토스 문서: const toast = useToast(); toast.openToast('메시지', { type: 'bottom' }) */
export function useToast() {
  const { openToast } = useOverlayApi("useToast");
  return useMemo(() => ({ openToast }), [openToast]);
}

/** 토스 문서: openAlert / openConfirm / openAsyncConfirm. 반환 Promise는 문서에 없어 직접 정함 (confirm: 확인이면 true) */
export function useDialog() {
  const { openAlert, openConfirm, openAsyncConfirm } = useOverlayApi("useDialog");
  return useMemo(() => ({ openAlert, openConfirm, openAsyncConfirm }), [openAlert, openConfirm, openAsyncConfirm]);
}

/** 토스 문서: open / close / openOneButtonSheet / openAsyncOneButtonSheet / openTwoButtonSheet / openAsyncTwoButtonSheet */
export function useBottomSheet() {
  const api = useOverlayApi("useBottomSheet");
  return useMemo(
    () => ({
      open: api.openSheet,
      close: api.closeSheet,
      openOneButtonSheet: api.openOneButtonSheet,
      openAsyncOneButtonSheet: api.openAsyncOneButtonSheet,
      openTwoButtonSheet: api.openTwoButtonSheet,
      openAsyncTwoButtonSheet: api.openAsyncTwoButtonSheet,
    }),
    [api]
  );
}
