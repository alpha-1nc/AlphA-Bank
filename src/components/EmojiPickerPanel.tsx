"use client";

import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import ko from "@emoji-mart/data/i18n/ko.json";

/** 팝오버를 열 때만 지연 로드되는 emoji-mart 피커 (데이터·한국어 로케일 포함) */
export default function EmojiPickerPanel({
  theme,
  onSelect,
}: {
  theme: "light" | "dark";
  onSelect: (native: string) => void;
}) {
  // @emoji-mart/react 가 만드는 중간 <div> 도 h-full 이어야 호스트의 h-full 이 퍼센트로 풀린다 (없으면 호스트 기본 435px)
  // 호스트 요소의 고정 폭/높이를 컨테이너에 맞춤 (폭 → perLine 은 emoji-mart 가 ResizeObserver 로 계산)
  return (
    <div className="h-full w-full overflow-y-hidden [&>div]:h-full [&_em-emoji-picker]:!h-full [&_em-emoji-picker]:!max-h-none [&_em-emoji-picker]:!w-full">
    <Picker
      data={data}
      i18n={ko}
      locale="ko"
      theme={theme}
      dynamicWidth
      previewPosition="none"
      skinTonePosition="none"
      onEmojiSelect={(e: { native: string }) => onSelect(e.native)}
    />
    </div>
  );
}
