"use client";

import { useState, type ReactNode } from "react";
import { Info, Sparkles, Wallet } from "lucide-react";
import {
  BarChart,
  Border,
  BottomCTA,
  Button,
  Highlight,
  ListRow,
  Paragraph,
  ProgressBar,
  Top,
} from "@/components/ui";
import type { BarChartData } from "@/components/ui";

/** /ui-preview 4단계 컴포넌트 (BarChart · Top · ProgressBar · BottomCTA · Paragraph · Border · Highlight) */

const SIX: BarChartData[] = [6, 5, 4, 3, 2, 1].map((v, i) => ({
  maxValue: 10,
  value: v,
  label: `${i + 1}월`,
  barAnnotation: v,
}));

const FOURTEEN: BarChartData[] = Array.from({ length: 14 }, (_, i) => ({
  value: Math.round(20 + 60 * Math.abs(Math.sin(i * 0.9))),
  label: `${i + 1}일`,
  barAnnotation: `${i + 1}`,
}));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <p className="t5 font-bold text-foreground">{title}</p>
      {children}
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="st12 text-fg-tertiary">{children}</p>;
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-card bg-card ${className ?? ""}`}>{children}</div>;
}

export default function PreviewStage4() {
  const [shuffle, setShuffle] = useState(0);
  const [progress, setProgress] = useState(0.35);
  const [hl, setHl] = useState<null | "text" | "fn">(null);
  const [hlLog, setHlLog] = useState("");

  const animated = SIX.map((d, i) => ({ ...d, value: ((d.value + shuffle * (i + 2)) % 10) + 1 }));

  return (
    <>
      <Section title="BarChart">
        <Label>fill all-bar · theme green</Label>
        <Card className="p-4">
          <BarChart data={SIX} fill={{ type: "all-bar", theme: "green" }} />
        </Card>
        <Label>fill single-bar · barIndex 0 · theme blue(accent)</Label>
        <Card className="p-4">
          <BarChart data={SIX} fill={{ type: "single-bar", barIndex: 0, theme: "blue" }} />
        </Card>
        <Label>fill auto · count 6 (오른쪽부터 blue→green→yellow→orange→red→grey) · 값 바꾸기로 스프링 확인</Label>
        <Card className="p-4">
          <BarChart data={animated} fill={{ type: "auto", count: 6 }} />
        </Card>
        <Button size="small" color="light" onClick={() => setShuffle((s) => s + 1)}>
          값 바꾸기
        </Button>
        <Label>데이터 14개 (12개 초과 → 처음·마지막만 라벨·주석) · maxValue 자동 · height 160</Label>
        <Card className="p-4">
          <BarChart data={FOURTEEN} fill={{ type: "single-bar", barIndex: 13, theme: "red" }} height={160} />
        </Card>
      </Section>

      <Section title="Top">
        <Card>
          <Top
            title="이번 달 예산"
            subtitleTop={<Top.SubtitleBadges badges={[{ text: "10월", color: "blue", variant: "weak" }, { text: "진행 중", color: "green", variant: "fill" }]} />}
            subtitleBottom="10월 10일 ~ 11월 9일"
            right={<Top.RightButton color="light">편집</Top.RightButton>}
          />
        </Card>
        <Card>
          <Top
            upper={<Top.UpperAssetContent content={<Wallet className="h-9 w-9 text-primary" />} />}
            title={<Top.TitleParagraph size={28}>1,250,000원</Top.TitleParagraph>}
            subtitleTop={<Top.SubtitleParagraph size={15}>쓸 수 있는 생활비</Top.SubtitleParagraph>}
            lower={
              <Top.LowerCTA
                type="2-button"
                leftButton={<Top.LowerCTAButton color="light">내역</Top.LowerCTAButton>}
                rightButton={<Top.LowerCTAButton>예산 짜기</Top.LowerCTAButton>}
              />
            }
          />
        </Card>
        <Card>
          <Top
            title={<Top.TitleSelector>신한은행 주거래</Top.TitleSelector>}
            subtitleBottom={<Top.SubtitleSelector size={13}>계좌 바꾸기</Top.SubtitleSelector>}
            right={<Top.RightAssetContent content={<Sparkles className="h-8 w-8 text-fg-tertiary" />} />}
            rightVerticalAlign="end"
            upperGap={16}
            lowerGap={16}
            lower={<Top.LowerButton color="primary" variant="weak">자세히 보기</Top.LowerButton>}
          />
        </Card>
        <Card>
          <Top
            title={<Top.TitleTextButton variant="arrow">전체 자산 보기</Top.TitleTextButton>}
            subtitleBottom={<Top.SubtitleTextButton>최근 6개월</Top.SubtitleTextButton>}
          />
        </Card>
      </Section>

      <Section title="ProgressBar">
        <Label>size light / normal / bold · animate · color</Label>
        <ProgressBar progress={progress} size="light" animate />
        <ProgressBar progress={progress} animate />
        <ProgressBar progress={progress} size="bold" animate color="var(--positive)" />
        <ProgressBar progress={progress} size="bold" />
        <Label>마지막 줄은 animate=false (바로 바뀜)</Label>
        <div className="flex gap-2">
          <Button size="small" color="light" onClick={() => setProgress((p) => Math.max(0, Math.round((p - 0.2) * 100) / 100))}>
            −20%
          </Button>
          <Button size="small" color="light" onClick={() => setProgress((p) => Math.min(1, Math.round((p + 0.2) * 100) / 100))}>
            +20%
          </Button>
        </div>
      </Section>

      <Section title="BottomCTA (fixed 아님)">
        <Label>Single · background default (위쪽 그라데이션)</Label>
        <BottomCTA>저장하기</BottomCTA>
        <Label>Double · background none · topAccessory · bottomAccessory</Label>
        <BottomCTA.Double
          background="none"
          leftButton="이전"
          rightButton="다음"
          topAccessory={<p className="t7 text-center text-fg-tertiary">3단계 중 2단계</p>}
          bottomAccessory={<p className="st12 text-center text-fg-tertiary">언제든 다시 바꿀 수 있어요</p>}
        />
        <Label>showAfterDelay slide / fade / scale (1초 뒤 등장 — 새로고침 시 확인)</Label>
        <BottomCTA showAfterDelay={{ animation: "slide", delay: 1 }} background="none">slide</BottomCTA>
        <BottomCTA showAfterDelay={{ animation: "fade", delay: 1 }} background="none">fade</BottomCTA>
        <BottomCTA showAfterDelay={{ animation: "scale", delay: 1 }} background="none">scale</BottomCTA>
        <Label>hideOnScroll (아래로 스크롤하면 숨고 위로 올리면 나타남) · hasSafeAreaPadding false</Label>
        <BottomCTA hideOnScroll hasSafeAreaPadding={false} background="none">
          스크롤하면 숨어요
        </BottomCTA>
      </Section>

      <Section title="Paragraph">
        <Paragraph typography="t5" fontWeight="medium">
          이번 달 생활비가 <Paragraph.Text fontWeight="bold" color="var(--primary)">320,000원</Paragraph.Text> 남았어요.
        </Paragraph>
        <Paragraph typography="t6" color="var(--fg-secondary)">
          <Paragraph.Icon icon={Info} typography="t6" /> 정기 지출{" "}
          <Paragraph.Badge color="red" variant="weak" typography="t6">3건</Paragraph.Badge> 이 다음 주에 빠져나가요.{" "}
          <Paragraph.Link type="underline" href="/subscription">구독 보기</Paragraph.Link>
        </Paragraph>
        <Label>ellipsisAfterLines 2 · textAlign center</Label>
        <Paragraph typography="t7" ellipsisAfterLines={2} textAlign="center" color="var(--fg-tertiary)">
          아주 긴 설명이 들어가면 두 줄까지만 보여주고 나머지는 말줄임표로 처리해요. 아주 긴 설명이 들어가면 두 줄까지만 보여주고 나머지는 말줄임표로 처리해요. 아주 긴 설명이 들어가면 두 줄까지만 보여주고 나머지는 말줄임표로 처리해요.
        </Paragraph>
        <Label>Badge 크기는 typography 글자 크기로 결정 (t7 / t6 / t5)</Label>
        <Paragraph typography="t7">
          <Paragraph.Badge color="grey" variant="weak" typography="t7">grey</Paragraph.Badge>
          <Paragraph.Badge color="blue" variant="fill" typography="t6">blue</Paragraph.Badge>
          <Paragraph.Badge color="yellow" variant="fill" typography="t5">yellow</Paragraph.Badge>
        </Paragraph>
      </Section>

      <Section title="Border">
        <Card>
          <ListRow contents={<ListRow.Texts type="1RowTypeA" top="full" />} border="none" />
          <Border />
          <ListRow contents={<ListRow.Texts type="1RowTypeA" top="padding24" />} border="none" />
          <Border variant="padding24" />
          <ListRow contents={<ListRow.Texts type="1RowTypeA" top="height16 (구간 구분)" />} border="none" />
          <Border variant="height16" />
          <ListRow contents={<ListRow.Texts type="1RowTypeA" top="height16 · height 32" />} border="none" />
          <Border variant="height16" height={32} />
          <ListRow contents={<ListRow.Texts type="1RowTypeA" top="끝" />} border="none" />
        </Card>
      </Section>

      <Section title="Highlight">
        <div className="flex flex-wrap gap-2">
          <Button size="small" color="light" onClick={() => setHl("text")}>문자열 메시지</Button>
          <Button size="small" color="light" onClick={() => setHl("fn")}>함수 메시지 · padding 8 · delay 0.3</Button>
        </div>
        <Highlight
          open={hl === "text"}
          message={"여기서 예산을 짤 수 있어요\n바깥을 누르면 닫혀요"}
          onClick={() => setHl(null)}
          onExited={() => setHlLog("onExited")}
        >
          <Card className="p-4">
            <p className="t6 text-foreground">강조할 영역 1</p>
          </Card>
        </Highlight>
        <Highlight
          open={hl === "fn"}
          padding={8}
          delay={0.3}
          highlighterClassname="ring-2 ring-primary"
          messageXAlignment="right"
          message={({ style }) => (
            <span className="t6 inline-flex items-center gap-1 font-semibold" style={style}>
              <Sparkles className="h-4 w-4" /> 함수로 만든 메시지
            </span>
          )}
          onClick={() => setHl(null)}
          onExited={() => setHlLog("onExited")}
        >
          <Button size="medium" variant="weak">강조할 버튼</Button>
        </Highlight>
        <p className="st12 text-fg-tertiary">마지막 이벤트: {hlLog || "-"}</p>
      </Section>
    </>
  );
}
