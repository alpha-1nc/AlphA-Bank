"use client";

import { useRef, useState, type ReactNode } from "react";
import { Bell, Search, Settings, Plus } from "lucide-react";
import {
  IconButton,
  ListRow,
  SegmentedControl,
  Tab,
  TextButton,
  TextField,
} from "@/components/ui";
import type { ListRowRef, TextButtonSize, TextFieldVariant } from "@/components/ui";

/** /ui-preview 2단계 컴포넌트 (TextField · ListRow · Tab · SegmentedControl · IconButton · TextButton) */

const VARIANTS: TextFieldVariant[] = ["box", "line", "big", "hero"];
const TEXT_BUTTON_SIZES: TextButtonSize[] = ["xsmall", "small", "medium", "large", "xlarge", "xxlarge"];

const won = {
  transform: (v: string) => (v === "" ? "" : Number(v).toLocaleString("ko-KR")),
  reset: (v: string) => v.replace(/[^0-9]/g, ""),
};

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

export default function PreviewStage2() {
  const [amount, setAmount] = useState("12000");
  const [tab, setTab] = useState(0);
  const [tabFluid, setTabFluid] = useState(0);
  const [seg, setSeg] = useState("month");
  const [picked, setPicked] = useState("");
  const rowRef = useRef<ListRowRef>(null);

  return (
    <>
      <Section title="TextField">
        {VARIANTS.map((variant) => (
          <div key={variant} className="flex flex-col gap-1">
            <Label>variant={variant} (labelOption appear — 입력하면 라벨 등장)</Label>
            <TextField variant={variant} label="메모" placeholder="입력해 주세요" />
          </div>
        ))}
        <Label>sustain · prefix/suffix · format(천 단위) · help</Label>
        <TextField
          variant="box"
          label="금액"
          labelOption="sustain"
          suffix="원"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          format={won}
          help={`저장 값: ${amount || "(비어 있음)"}`}
        />
        <Label>hasError · disabled</Label>
        <TextField variant="line" label="계좌번호" labelOption="sustain" defaultValue="123-45" hasError help="숫자만 입력해 주세요" />
        <TextField variant="box" label="비활성" labelOption="sustain" defaultValue="수정할 수 없어요" disabled />
        <Label>TextField.Clearable / Password / Button</Label>
        <TextField.Clearable variant="box" label="검색어" defaultValue="월세" placeholder="검색어" />
        <TextField.Password variant="box" label="비밀번호" labelOption="sustain" placeholder="비밀번호" />
        <TextField.Button
          variant="box"
          label="은행"
          labelOption="sustain"
          placeholder="은행을 골라 주세요"
          value={picked}
          onClick={() => setPicked(picked ? "" : "신한은행")}
        />
      </Section>

      <Section title="ListRow">
        <div className="overflow-hidden rounded-card bg-card">
          <ListRow
            ref={rowRef}
            left={<ListRow.AssetIcon src="/bank_logos/신한은행.svg" alt="신한은행" />}
            contents={<ListRow.Texts type="2RowTypeA" top="신한은행 주거래" bottom="110-123-456789" />}
            right={<ListRow.Texts type="Right2RowTypeA" top="1,250,000원" bottom="생활비" />}
            withArrow
            withTouchEffect
            onClick={() => undefined}
          />
          <ListRow
            left={<ListRow.AssetIcon src="/bank_logos/카카오뱅크.svg" shape="circle-masking" />}
            contents={<ListRow.Texts type="1RowTypeA" top="1RowTypeA · circle-masking" />}
            right={<ListRow.Texts type="Right1RowTypeA" top="30,000원" />}
          />
          <ListRow
            left={<ListRow.AssetIcon src="/bank_logos/토스뱅크.svg" shape="circle-background" />}
            contents={<ListRow.Texts type="3RowTypeA" top="3RowTypeA 위" middle="가운데 (주 텍스트)" bottom="아래" />}
            verticalPadding="large"
            leftAlignment="top"
          />
          <ListRow
            left={
              <ListRow.AssetIcon
                src="/bank_logos/국민은행.svg"
                variant="fill"
                acc={<span className="h-full w-full rounded-full bg-positive" />}
                accMasking="circle"
              />
            }
            contents={<ListRow.Texts type="2RowTypeA" top="variant fill + acc" bottom="accMasking circle" />}
          />
          <ListRow
            left={<ListRow.AssetIcon src="/bank_logos/하나은행.svg" shape="card" size="medium" />}
            contents={<ListRow.Texts type="1RowTypeA" top="shape card" />}
          />
          <ListRow
            left={<ListRow.AssetIcon src="/bank_logos/우리은행.svg" shape="original" size="small" />}
            contents={<ListRow.Texts type="1RowTypeA" top="disabled type1" />}
            disabled
          />
          <ListRow
            left={<ListRow.AssetIcon src="/bank_logos/농협.svg" size="xsmall" />}
            contents={<ListRow.Texts type="1RowTypeA" top="disabled type2 · xsmall" />}
            disabled
            disabledStyle="type2"
            border="none"
          />
          <ListRow.Loader type="square" />
          <ListRow.Loader type="circle" />
          <ListRow.Loader type="bar" verticalPadding="small" />
        </div>
        <Label>verticalPadding small 8 / medium 12 / large 16 / xlarge 24 · horizontalPadding small 20 / medium 24</Label>
        <div className="flex gap-2">
          <TextButton size="small" variant="underline" onClick={() => rowRef.current?.shine(2)}>
            첫 행 shine(2)
          </TextButton>
          <TextButton size="small" variant="underline" onClick={() => rowRef.current?.blink(2)}>
            첫 행 blink(2)
          </TextButton>
        </div>
      </Section>

      <Section title="Tab">
        <Label>size=large · 눌러서 밑줄 이동 · 두 번째에 redBean</Label>
        <Tab onChange={(i) => setTab(i)} ariaLabel="예시 탭">
          {["전체", "수입", "지출", "저축"].map((t, i) => (
            <Tab.Item key={t} selected={tab === i} redBean={i === 1}>
              {t}
            </Tab.Item>
          ))}
        </Tab>
        <Label>size=small · fluid · itemGap 8</Label>
        <Tab onChange={(i) => setTabFluid(i)} size="small" fluid itemGap={8} ariaLabel="fluid 탭">
          {["편의점 A점", "카페 B", "학원 C", "물류센터 D", "서점 E", "베이커리 F"].map((t, i) => (
            <Tab.Item key={t} selected={tabFluid === i}>
              {t}
            </Tab.Item>
          ))}
        </Tab>
      </Section>

      <Section title="SegmentedControl">
        <Label>size=small · fixed · 제어</Label>
        <SegmentedControl value={seg} onChange={setSeg} aria-label="기간">
          <SegmentedControl.Item value="week">주</SegmentedControl.Item>
          <SegmentedControl.Item value="month">월</SegmentedControl.Item>
          <SegmentedControl.Item value="year">년</SegmentedControl.Item>
        </SegmentedControl>
        <Label>size=large · fluid · 비제어(defaultValue)</Label>
        <SegmentedControl size="large" alignment="fluid" defaultValue="b" aria-label="정렬">
          <SegmentedControl.Item value="a">최신순</SegmentedControl.Item>
          <SegmentedControl.Item value="b">금액 높은순</SegmentedControl.Item>
          <SegmentedControl.Item value="c">이름순</SegmentedControl.Item>
        </SegmentedControl>
      </Section>

      <Section title="IconButton">
        <Label>variant clear / fill / border · iconSize 24, 20</Label>
        <div className="flex items-center gap-3">
          <IconButton aria-label="알림" icon={Bell} />
          <IconButton aria-label="검색" icon={Search} variant="fill" />
          <IconButton aria-label="설정" icon={Settings} variant="border" />
          <IconButton aria-label="추가" icon={Plus} variant="fill" color="var(--primary)" bgColor="var(--accent-soft)" iconSize={20} />
          <IconButton aria-label="비활성" icon={Bell} disabled />
        </div>
      </Section>

      <Section title="TextButton">
        {(["clear", "underline", "arrow"] as const).map((variant) => (
          <div key={variant} className="flex flex-col gap-1">
            <Label>variant={variant}</Label>
            <div className="flex flex-wrap items-center gap-3">
              {TEXT_BUTTON_SIZES.map((size) => (
                <TextButton key={size} size={size} variant={variant}>
                  {size}
                </TextButton>
              ))}
            </div>
          </div>
        ))}
        <TextButton size="medium" variant="arrow" disabled>
          disabled
        </TextButton>
      </Section>
    </>
  );
}
