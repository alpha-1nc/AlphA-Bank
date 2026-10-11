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
  return (
    <Picker
      data={data}
      i18n={ko}
      locale="ko"
      theme={theme}
      perLine={8}
      previewPosition="none"
      skinTonePosition="none"
      onEmojiSelect={(e: { native: string }) => onSelect(e.native)}
    />
  );
}
