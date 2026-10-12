"use client";

import { useState, type ReactNode } from "react";
import { Badge, Bubble, Button, Checkbox, Switch } from "@/components/ui";
import PreviewStage2 from "./PreviewStage2";
import PreviewStage3 from "./PreviewStage3";
import PreviewStage4 from "./PreviewStage4";
import type {
  BadgeColor,
  BadgeSize,
  BadgeVariant,
  ButtonColor,
  ButtonSize,
  ButtonVariant,
} from "@/components/ui";

const BUTTON_COLORS: ButtonColor[] = ["primary", "danger", "light", "dark"];
const BUTTON_VARIANTS: ButtonVariant[] = ["fill", "weak"];
const BUTTON_SIZES: ButtonSize[] = ["xlarge", "large", "medium", "small"];
const BADGE_COLORS: BadgeColor[] = ["blue", "teal", "green", "red", "yellow", "grey"];
const BADGE_VARIANTS: BadgeVariant[] = ["fill", "weak"];
const BADGE_SIZES: BadgeSize[] = ["xsmall", "small", "medium", "large"];

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

function Panel({ theme }: { theme: "light" | "dark" }) {
  const [sw, setSw] = useState(true);
  const [circle, setCircle] = useState(true);
  const [line, setLine] = useState(false);
  const [radio, setRadio] = useState("a");

  return (
    <div className={`${theme} flex min-w-0 flex-col gap-7 rounded-card bg-background p-5 text-foreground`}>
      <p className="t3 font-bold">{theme === "light" ? "라이트" : "다크"}</p>

      <Section title="Button">
        {BUTTON_COLORS.map((color) =>
          BUTTON_VARIANTS.map((variant) => (
            <div key={`${color}-${variant}`} className="flex flex-col gap-2">
              <Label>
                color={color} variant={variant}
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                {BUTTON_SIZES.map((size) => (
                  <Button key={size} color={color} variant={variant} size={size}>
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          ))
        )}
        <Label>display: inline / block / full</Label>
        <Button display="inline">inline</Button>
        <Button display="block">block</Button>
        <Button display="full">full</Button>
        <Label>loading / disabled</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button loading>저장</Button>
          <Button variant="weak" loading>
            저장
          </Button>
          <Button disabled>저장</Button>
          <Button variant="weak" disabled>
            저장
          </Button>
        </div>
        <Label>as=&quot;a&quot; (Next Link)</Label>
        <Button as="a" href="/budget" display="block">
          이번 달 예산 짜러 가기
        </Button>
      </Section>

      <Section title="Badge">
        {BADGE_VARIANTS.map((variant) => (
          <div key={variant} className="flex flex-col gap-2">
            <Label>variant={variant}</Label>
            <div className="flex flex-wrap items-center gap-2">
              {BADGE_COLORS.map((color) => (
                <Badge key={color} color={color} variant={variant} size="medium">
                  {color}
                </Badge>
              ))}
            </div>
          </div>
        ))}
        <Label>size (기본 color=grey variant=weak)</Label>
        <div className="flex flex-wrap items-center gap-2">
          {BADGE_SIZES.map((size) => (
            <Badge key={size} size={size}>
              {size}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Switch">
        <div className="flex items-center gap-4">
          <Switch checked={sw} onCheckedChange={setSw} aria-label="예시" />
          <Switch checked={false} disabled aria-label="꺼짐 비활성" />
          <Switch checked disabled aria-label="켜짐 비활성" />
          <Switch defaultChecked aria-label="비제어" />
        </div>
      </Section>

      <Section title="Checkbox">
        <Label>Circle: 제어 / 비제어 / disabled</Label>
        <div className="flex items-center gap-4">
          <Checkbox.Circle checked={circle} onCheckedChange={setCircle} aria-label="제어" />
          <Checkbox.Circle defaultChecked={false} aria-label="비제어" />
          <Checkbox.Circle checked disabled aria-label="비활성" />
        </div>
        <Label>Line: 제어 / 비제어 / disabled</Label>
        <div className="flex items-center gap-4">
          <Checkbox.Line checked={line} onCheckedChange={setLine} aria-label="제어" />
          <Checkbox.Line defaultChecked aria-label="비제어" />
          <Checkbox.Line checked disabled aria-label="비활성" />
        </div>
        <Label>inputType=&quot;radio&quot;</Label>
        <div className="flex items-center gap-4">
          {["a", "b", "c"].map((v) => (
            <Checkbox.Circle
              key={v}
              inputType="radio"
              name={`radio-${theme}`}
              value={v}
              checked={radio === v}
              onChange={(e) => setRadio(e.target.value)}
              aria-label={v}
            />
          ))}
        </div>
      </Section>

      <Section title="Bubble">
        <div className="flex flex-col gap-3">
          <Bubble background="grey">상대방 말풍선이에요</Bubble>
          <Bubble background="blue" className="self-end">
            내 말풍선이에요
          </Bubble>
          <Bubble background="grey" withTail={false}>
            꼬리 없음
          </Bubble>
          <Bubble background="blue" withTail={false} className="self-end">
            꼬리 없음
          </Bubble>
        </div>
      </Section>

      <PreviewStage2 />
      <PreviewStage3 />
      <PreviewStage4 />
    </div>
  );
}

export default function UiPreview() {
  return (
    <div className="px-4 py-6 md:p-7 min-h-full">
      <h1 className="t3 mb-6 font-bold text-foreground">UI 미리보기</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel theme="light" />
        <Panel theme="dark" />
      </div>
    </div>
  );
}
