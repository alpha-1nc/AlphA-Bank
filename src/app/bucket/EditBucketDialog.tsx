"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { updateBucket } from "@/app/actions/bucket";
import { compressImageForUpload } from "@/lib/compress-image";
import type { BucketItem } from "@/components/BucketCard";

const IMPORTANCE_OPTIONS = [1, 2, 3, 4, 5] as const;

interface Props {
  bucket: BucketItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditBucketDialog({ bucket, open, onOpenChange }: Props) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(bucket.title);
  const [importance, setImportance] = useState<number>(bucket.importance);
  const [targetAmount, setTargetAmount] = useState(String(bucket.targetAmount));
  const [currentAmount, setCurrentAmount] = useState(String(bucket.currentAmount));
  const [imageUrl, setImageUrl] = useState(bucket.imageUrl || "");
  const [imgPreviewError, setImgPreviewError] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(bucket.title);
      setImportance(bucket.importance);
      setTargetAmount(String(bucket.targetAmount));
      setCurrentAmount(String(bucket.currentAmount));
      setImageUrl(bucket.imageUrl || "");
      setImgPreviewError(false);
    }
  }, [open, bucket]);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedTarget = parseInt(targetAmount.replace(/,/g, ""), 10);
    const parsedCurrent = parseInt(currentAmount.replace(/,/g, ""), 10);
    if (
      !title.trim() ||
      isNaN(parsedTarget) ||
      parsedTarget < 0 ||
      isNaN(parsedCurrent) ||
      parsedCurrent < 0
    )
      return;

    startTransition(async () => {
      try {
        let finalImageUrl: string | null = imageUrl.trim() || null;
        if (finalImageUrl?.startsWith("data:image/")) {
          finalImageUrl = await compressImageForUpload(finalImageUrl);
        }
        await updateBucket(bucket.id, {
          title: title.trim(),
          importance,
          targetAmount: parsedTarget,
          currentAmount: parsedCurrent,
          imageUrl: finalImageUrl,
        });
        onOpenChange(false);
      } catch {
        alert(
          "목표 수정에 실패했습니다. 네트워크를 확인하거나 잠시 후 다시 시도해 주세요."
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-card">
        <DialogHeader>
          <DialogTitle className="t5 font-bold text-foreground">
            목표 수정
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} onPaste={handlePasteImage} className="mt-2 space-y-4">
          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary ml-1">
              이미지 (선택)
            </label>
            <p className="t8 text-fg-tertiary">
              URL 입력 또는 이미지 복사 후 여기 붙여넣기 (Ctrl+V / ⌘V)
            </p>
            <div className="aspect-video w-full rounded-control overflow-hidden relative bg-background">
              {!imageUrl.trim() ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <span className="t7 text-fg-tertiary">
                    URL 입력 시 또는 이미지 붙여넣기 시 미리보기
                  </span>
                </div>
              ) : imgPreviewError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-accent-soft">
                  <span className="t7 text-fg-tertiary">
                    이미지를 불러올 수 없습니다
                  </span>
                </div>
              ) : (
                <img
                  src={imageUrl}
                  alt="미리보기"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setImgPreviewError(true)}
                />
              )}
            </div>
            <Input
              type="text"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImgPreviewError(false);
              }}
              placeholder="이미지 URL 입력"
              className="t6 h-11 rounded-control border-0 bg-background text-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary ml-1">
              제목 *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="t6 h-11 rounded-control border-0 bg-background text-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary ml-1">
              중요도 *
            </label>
            <ResponsiveSelect
              value={String(importance)}
              onValueChange={(v) => setImportance(Number(v))}
              options={IMPORTANCE_OPTIONS.map((n) => ({
                value: String(n),
                label: String(n),
              }))}
              triggerClassName="t6 h-11 rounded-control border-0 bg-background text-foreground"
              contentClassName="rounded-control"
            />
          </div>
          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary ml-1">
              목표 금액 (원) *
            </label>
            <Input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
              min={0}
              className="t6 h-11 rounded-control border-0 bg-background text-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="t7 font-medium text-fg-tertiary ml-1">
              누적 납입 금액 (원) *
            </label>
            <p className="t8 text-fg-tertiary">
              지금까지 모은 금액입니다. 숫자로 직접 수정할 수 있습니다.
            </p>
            <Input
              type="number"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              required
              min={0}
              className="t6 h-11 rounded-control border-0 bg-background text-foreground"
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <DialogClose
              render={
                <Button type="button" variant="outline" size="sm" className="rounded-control border-0 bg-divider text-foreground hover:bg-divider">
                  취소
                </Button>
              }
            />
            <Button type="submit" size="sm" disabled={pending} className="rounded-control bg-primary font-bold text-primary-foreground">
              {pending ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
