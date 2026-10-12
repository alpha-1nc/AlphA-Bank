"use client";

import { useCallback, useState, useTransition } from "react";
import { AMOUNT_INPUT_FORMAT } from "@/lib/number-input";
import {
  BottomSheet,
  SegmentedControl,
  TextButton,
  TextField,
  useDialog,
  useToast,
} from "@/components/ui";
import { addBucket, updateBucket, deleteBucket } from "@/app/actions/bucket";
import { compressImageForUpload } from "@/lib/compress-image";
import type { BucketItem } from "./BucketBoard";

const IMPORTANCE_OPTIONS = ["1", "2", "3", "4", "5"] as const;

/** 목표 추가 / 수정 공용 시트. 수정 모드에서는 삭제도 여기서 한다 */
export default function BucketFormSheet({
  bucket,
  open,
  onClose,
}: {
  /** 있으면 수정, 없으면 추가 */
  bucket?: BucketItem;
  open: boolean;
  onClose: () => void;
}) {
  const isEdit = !!bucket;
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const { openToast } = useToast();
  const { openConfirm } = useDialog();

  const [title, setTitle] = useState(bucket?.title ?? "");
  const [importance, setImportance] = useState(bucket ? String(bucket.importance) : "3");
  const [targetAmount, setTargetAmount] = useState(bucket ? String(bucket.targetAmount) : "");
  const [currentAmount, setCurrentAmount] = useState(bucket ? String(bucket.currentAmount) : "");
  const [imageUrl, setImageUrl] = useState(bucket?.imageUrl ?? "");
  const [imgPreviewError, setImgPreviewError] = useState(false);

  const parsedTarget = parseInt(targetAmount.replace(/,/g, ""), 10);
  const parsedCurrent = parseInt(currentAmount.replace(/,/g, ""), 10);
  const valid =
    !!title.trim() &&
    !isNaN(parsedTarget) &&
    parsedTarget >= 0 &&
    (!isEdit || (!isNaN(parsedCurrent) && parsedCurrent >= 0));

  function resetToInitial() {
    setTitle(bucket?.title ?? "");
    setImportance(bucket ? String(bucket.importance) : "3");
    setTargetAmount(bucket ? String(bucket.targetAmount) : "");
    setCurrentAmount(bucket ? String(bucket.currentAmount) : "");
    setImageUrl(bucket?.imageUrl ?? "");
    setImgPreviewError(false);
  }

  function handleClose() {
    onClose();
    resetToInitial();
  }

  const handlePasteImage = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          compressImageForUpload(file)
            .then((compressed) => {
              setImageUrl(compressed);
              setImgPreviewError(false);
            })
            .catch(() => setImgPreviewError(true));
        }
        break;
      }
    }
  }, []);

  function handleSubmit() {
    if (!valid) return;

    startTransition(async () => {
      try {
        let finalImageUrl: string | null = imageUrl.trim() || null;
        if (finalImageUrl?.startsWith("data:image/")) {
          finalImageUrl = await compressImageForUpload(finalImageUrl);
        }
        if (bucket) {
          await updateBucket(bucket.id, {
            title: title.trim(),
            importance: Number(importance),
            targetAmount: parsedTarget,
            currentAmount: parsedCurrent,
            imageUrl: finalImageUrl,
          });
        } else {
          await addBucket({
            title: title.trim(),
            importance: Number(importance),
            targetAmount: parsedTarget,
            imageUrl: finalImageUrl,
          });
          resetToInitial();
        }
        onClose();
      } catch {
        openToast(
          `목표 ${isEdit ? "수정" : "추가"}에 실패했습니다. 네트워크를 확인하거나 잠시 후 다시 시도해 주세요.`,
          { type: "bottom" },
        );
      }
    });
  }

  async function handleDelete() {
    if (!bucket) return;
    const ok = await openConfirm({
      title: `"${bucket.title}" 목표를 삭제하시겠습니까?`,
      confirmButton: "삭제",
      cancelButton: "취소",
    });
    if (!ok) return;
    startDelete(async () => {
      await deleteBucket(bucket.id);
      onClose();
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      hasTextField
      header={<BottomSheet.Header>{isEdit ? "목표 수정" : "새 목표 추가"}</BottomSheet.Header>}
      cta={
        <div className="flex flex-col gap-3">
          <BottomSheet.CTA loading={pending} disabled={!valid} onClick={handleSubmit}>
            저장
          </BottomSheet.CTA>
          {isEdit && (
            <div className="flex justify-center">
              <TextButton
                size="small"
                variant="clear"
                disabled={deleting}
                style={{ color: "var(--tk-negative)" }}
                onClick={handleDelete}
              >
                목표 삭제
              </TextButton>
            </div>
          )}
        </div>
      }
    >
        <div className="flex flex-col gap-4 pb-1 pt-2" onPaste={handlePasteImage}>
          <div className="flex flex-col gap-2">
            <p className="t7 font-medium text-fg-tertiary">이미지 (선택)</p>
            <p className="st12 text-fg-tertiary">URL 입력 또는 이미지 복사 후 여기 붙여넣기 (Ctrl+V / ⌘V)</p>
            <div className="relative aspect-video w-full overflow-hidden rounded-control bg-divider">
              {!imageUrl.trim() ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <span className="t7 text-fg-tertiary">URL 입력 시 또는 이미지 붙여넣기 시 미리보기</span>
                </div>
              ) : imgPreviewError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-accent-soft">
                  <span className="t7 text-fg-tertiary">이미지를 불러올 수 없습니다</span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="미리보기"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={() => setImgPreviewError(true)}
                />
              )}
            </div>
          </div>
          <TextField
            variant="box"
            label="이미지 URL"
            labelOption="sustain"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setImgPreviewError(false);
            }}
          />
          <TextField
            variant="box"
            label="제목"
            labelOption="sustain"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <p className="t7 font-medium text-fg-tertiary">중요도</p>
            <SegmentedControl size="large" alignment="fixed" value={importance} onChange={setImportance} aria-label="중요도">
              {IMPORTANCE_OPTIONS.map((n) => (
                <SegmentedControl.Item key={n} value={n}>
                  {n}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl>
          </div>
          <TextField
            variant="box"
            label="목표 금액"
            labelOption="sustain"
            type="text"
            inputMode="numeric"
            format={AMOUNT_INPUT_FORMAT}
            suffix="원"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
          {isEdit && (
            <TextField
              variant="box"
              label="누적 납입 금액"
              labelOption="sustain"
              help="지금까지 모은 금액입니다. 숫자로 직접 수정할 수 있습니다."
              type="text"
              inputMode="numeric"
              format={AMOUNT_INPUT_FORMAT}
              suffix="원"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
            />
          )}
        </div>
    </BottomSheet>
  );
}
