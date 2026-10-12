"use client";

import { Badge, Top } from "@/components/ui";

/** 대시보드 상단. md 미만은 모바일 상단 바에 제목이 있어 렌더하지 않음 */
export default function DashboardHeader({ title, asOfLabel }: { title: string; asOfLabel: string }) {
  return (
    <Top
      className="hidden px-0 md:block"
      upperGap={0}
      lowerGap={0}
      title={
        <div className="flex min-w-0 items-center gap-2">
          <Top.TitleParagraph size={22}>{title}</Top.TitleParagraph>
          <Badge color="grey" variant="weak" size="small">
            {asOfLabel}
          </Badge>
        </div>
      }
      subtitleBottom={<Top.SubtitleParagraph size={15}>이번 달 월급과 예산 한눈에 보기</Top.SubtitleParagraph>}
    />
  );
}
