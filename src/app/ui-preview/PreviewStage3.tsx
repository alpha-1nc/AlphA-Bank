"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, Info } from "lucide-react";
import {
  AlertDialog,
  BottomSheet,
  Button,
  ConfirmDialog,
  Loader,
  Modal,
  Skeleton,
  Toast,
  useBottomSheet,
  useDialog,
  useToast,
} from "@/components/ui";
import type { SkeletonPattern } from "@/components/ui";

/** /ui-preview 3단계 컴포넌트 (Toast · BottomSheet · Modal · AlertDialog · ConfirmDialog · Loader · Skeleton · 오버레이 훅) */

const PATTERNS: SkeletonPattern[] = [
  "topList",
  "topListWithIcon",
  "amountTopList",
  "amountTopListWithIcon",
  "subtitleList",
  "subtitleListWithIcon",
  "listOnly",
  "listWithIconOnly",
  "cardOnly",
];

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export default function PreviewStage3() {
  // 컴포넌트 직접 사용
  const [toast, setToast] = useState<null | "top" | "bottom" | "button" | "cta">(null);
  const [sheet, setSheet] = useState<null | "basic" | "double" | "select" | "expand" | "noDimmer">(null);
  const [selectValue, setSelectValue] = useState("month");
  const [modal, setModal] = useState(false);
  const [alert, setAlert] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [skeletonPlay, setSkeletonPlay] = useState<"show" | "hide">("show");
  const [log, setLog] = useState("");

  // 훅
  const { openToast } = useToast();
  const { openAlert, openConfirm, openAsyncConfirm } = useDialog();
  const bottomSheet = useBottomSheet();

  return (
    <>
      <Section title="Toast">
        <Label>Dialog·Toast·BottomSheet는 body에 띄우므로 패널이 아닌 현재 앱 테마를 따른다. 끌어서 닫을 수 있다.</Label>
        <Row>
          <Button size="small" color="light" onClick={() => setToast("top")}>top</Button>
          <Button size="small" color="light" onClick={() => setToast("bottom")}>bottom + 아이콘</Button>
          <Button size="small" color="light" onClick={() => setToast("button")}>bottom + 버튼(5초)</Button>
          <Button size="small" color="light" onClick={() => setToast("cta")}>higherThanCTA</Button>
        </Row>
        <Toast open={toast === "top"} position="top" text="위에서 내려오는 토스트예요" onClose={() => setToast(null)} />
        <Toast
          open={toast === "bottom"}
          position="bottom"
          text="저장했어요"
          leftAddon={<Toast.Icon icon={CheckCircle2} />}
          onClose={() => setToast(null)}
          onExited={() => setLog("Toast onExited")}
        />
        <Toast
          open={toast === "button"}
          position="bottom"
          text="항목을 삭제했어요"
          button={<Toast.Button onClick={() => setToast(null)}>되돌리기</Toast.Button>}
          onClose={() => setToast(null)}
        />
        <Toast open={toast === "cta"} position="bottom" higherThanCTA text="CTA 위에 떠요" onClose={() => setToast(null)} />
      </Section>

      <Section title="BottomSheet">
        <Row>
          <Button size="small" color="light" onClick={() => setSheet("basic")}>기본 + CTA</Button>
          <Button size="small" color="light" onClick={() => setSheet("double")}>DoubleCTA</Button>
          <Button size="small" color="light" onClick={() => setSheet("select")}>Select</Button>
          <Button size="small" color="light" onClick={() => setSheet("expand")}>expandBottomSheet</Button>
          <Button size="small" color="light" onClick={() => setSheet("noDimmer")}>disableDimmer</Button>
        </Row>
        <BottomSheet
          open={sheet === "basic"}
          header="예산 기준일을 바꿀까요?"
          headerDescription="바꾸면 이번 달 예산 기간이 다시 계산돼요."
          cta={<BottomSheet.CTA onClick={() => setSheet(null)}>바꾸기</BottomSheet.CTA>}
          onClose={() => setSheet(null)}
          onEntered={() => setLog("BottomSheet onEntered")}
          onExited={() => setLog("BottomSheet onExited")}
        >
          <p className="t6 text-fg-secondary">핸들바를 아래로 끌거나 바깥을 누르면 닫혀요.</p>
        </BottomSheet>
        <BottomSheet
          open={sheet === "double"}
          header="구독을 해지할까요?"
          cta={
            <BottomSheet.DoubleCTA
              leftButton={<Button size="xlarge" display="block" color="light" onClick={() => setSheet(null)}>닫기</Button>}
              rightButton={<Button size="xlarge" display="block" color="danger" onClick={() => setSheet(null)}>해지하기</Button>}
            />
          }
          onClose={() => setSheet(null)}
        >
          <p className="t6 text-fg-secondary">다음 결제일부터 청구되지 않아요.</p>
        </BottomSheet>
        <BottomSheet open={sheet === "select"} header="기간 선택" onClose={() => setSheet(null)}>
          <BottomSheet.Select
            value={selectValue}
            onChange={(v) => {
              setSelectValue(v);
              setSheet(null);
            }}
            options={[
              { name: "이번 주", value: "week" },
              { name: "이번 달", value: "month" },
              { name: "올해", value: "year" },
              { name: "직접 선택 (준비 중)", value: "custom", disabled: true },
              { name: "체크 숨김 항목", value: "hidden", hideUnCheckedCheckBox: true },
            ]}
          />
        </BottomSheet>
        <BottomSheet
          open={sheet === "expand"}
          header="긴 내용"
          expandBottomSheet
          maxHeight={360}
          onExpanded={() => setLog("BottomSheet onExpanded")}
          onClose={() => setSheet(null)}
        >
          {Array.from({ length: 30 }, (_, i) => (
            <p key={i} className="t6 py-2 text-fg-secondary">
              {i + 1}번째 줄 — 핸들바를 위로 끌면 전체 화면으로 커져요
            </p>
          ))}
        </BottomSheet>
        <BottomSheet open={sheet === "noDimmer"} header="딤 없음" disableDimmer onClose={() => setSheet(null)}>
          <p className="t6 pb-2 text-fg-secondary">뒤 화면을 계속 쓸 수 있어요. 핸들바를 끌어 닫아요.</p>
        </BottomSheet>
      </Section>

      <Section title="Modal">
        <Button size="small" color="light" onClick={() => setModal(true)}>Modal 열기</Button>
        <Modal open={modal} onOpenChange={setModal} onExited={() => setLog("Modal onExited")}>
          <Modal.Overlay />
          <Modal.Content className="w-full max-w-[320px] rounded-card bg-card p-6">
            <p className="t5 font-bold text-foreground">범용 모달</p>
            <p className="t6 mt-2 text-fg-secondary">모양은 사용처가 className으로 정해요.</p>
            <Button className="mt-5" size="large" display="block" onClick={() => setModal(false)}>닫기</Button>
          </Modal.Content>
        </Modal>
      </Section>

      <Section title="AlertDialog / ConfirmDialog">
        <Row>
          <Button size="small" color="light" onClick={() => setAlert(true)}>AlertDialog</Button>
          <Button size="small" color="light" onClick={() => setConfirm(true)}>ConfirmDialog</Button>
        </Row>
        <AlertDialog
          open={alert}
          title="알려드릴게요"
          description={"작업이 완료됐어요.\n두 줄도 돼요."}
          alertButton="확인"
          onClose={() => setAlert(false)}
        />
        <ConfirmDialog
          open={confirm}
          title={<ConfirmDialog.Title>삭제할까요?</ConfirmDialog.Title>}
          description={<ConfirmDialog.Description>이 작업은 되돌릴 수 없어요.</ConfirmDialog.Description>}
          cancelButton={<ConfirmDialog.CancelButton onClick={() => setConfirm(false)}>취소</ConfirmDialog.CancelButton>}
          confirmButton={
            <ConfirmDialog.ConfirmButton color="danger" onClick={() => setConfirm(false)}>
              삭제하기
            </ConfirmDialog.ConfirmButton>
          }
          onClose={() => setConfirm(false)}
        />
      </Section>

      <Section title="Loader">
        <Label>size small / medium / large · type primary / dark / light(어두운 배경)</Label>
        <Row>
          <Loader size="small" />
          <Loader />
          <Loader size="large" />
          <Loader type="dark" />
          <span className="flex items-center rounded-control bg-foreground p-3">
            <Loader type="light" size="small" />
          </span>
        </Row>
        <Loader label={"김토스님의 카드를\n불러오고있어요."} />
      </Section>

      <Section title="Skeleton">
        <Row>
          <Button size="small" color="light" onClick={() => setSkeletonPlay((p) => (p === "show" ? "hide" : "show"))}>
            play: {skeletonPlay}
          </Button>
        </Row>
        {PATTERNS.map((p) => (
          <div key={p} className="flex flex-col gap-1">
            <Label>pattern={p} · repeatLastItemCount=2</Label>
            <div className="rounded-card bg-card px-4">
              <Skeleton pattern={p} repeatLastItemCount={2} play={skeletonPlay} />
            </div>
          </div>
        ))}
        <Label>custom=[title, subtitle, spacer(20), card] · background greyOpacity100</Label>
        <div className="rounded-card bg-card px-4">
          <Skeleton custom={["title", "subtitle", "spacer(20)", "card"]} repeatLastItemCount={1} background="greyOpacity100" />
        </div>
        <Label>background white (어두운 배경용)</Label>
        <div className="rounded-card bg-foreground px-4">
          <Skeleton pattern="listWithIconOnly" repeatLastItemCount={2} background="white" />
        </div>
      </Section>

      <Section title="훅 (useToast · useDialog · useBottomSheet)">
        <Row>
          <Button size="small" color="light" onClick={() => openToast("useToast로 띄웠어요", { icon: Info, iconType: "circle" })}>
            openToast
          </Button>
          <Button
            size="small"
            color="light"
            onClick={() =>
              openToast("버튼이 있는 토스트", { type: "bottom", button: { text: "확인", onClick: () => setLog("toast 버튼 클릭") } })
            }
          >
            openToast + 버튼
          </Button>
          <Button
            size="small"
            color="light"
            onClick={async () => {
              await openAlert({ title: "알려드릴게요", description: "작업이 완료됐어요.", alertButton: "확인하기" });
              setLog("openAlert 닫힘");
            }}
          >
            openAlert
          </Button>
          <Button
            size="small"
            color="light"
            onClick={async () => {
              const ok = await openConfirm({ title: "삭제할까요?", description: "이 작업은 되돌릴 수 없어요.", confirmButton: "삭제하기" });
              setLog(`openConfirm → ${ok}`);
            }}
          >
            openConfirm
          </Button>
          <Button
            size="small"
            color="light"
            onClick={async () => {
              const ok = await openAsyncConfirm({
                title: "상담을 종료할까요?",
                confirmButton: "종료하기",
                onConfirmClick: () => delay(1500),
              });
              setLog(`openAsyncConfirm → ${ok}`);
            }}
          >
            openAsyncConfirm
          </Button>
        </Row>
        <Row>
          <Button
            size="small"
            color="light"
            onClick={() =>
              bottomSheet.open({
                header: "기본 바텀시트",
                children: (
                  <div className="pb-2">
                    <p className="t6 text-fg-secondary">close()로 닫을 수 있어요.</p>
                    <Button className="mt-4" size="large" display="block" color="light" onClick={() => bottomSheet.close()}>
                      close()
                    </Button>
                  </div>
                ),
              })
            }
          >
            open
          </Button>
          <Button
            size="small"
            color="light"
            onClick={async () => {
              await bottomSheet.openOneButtonSheet({ header: "단일 버튼", children: <p className="t6 text-fg-secondary">확인을 누르면 닫혀요.</p> });
              setLog("openOneButtonSheet 끝");
            }}
          >
            openOneButtonSheet
          </Button>
          <Button
            size="small"
            color="light"
            onClick={async () => {
              await bottomSheet.openAsyncOneButtonSheet({
                header: "비동기 단일 버튼",
                children: <p className="t6 text-fg-secondary">누르면 1.5초 로딩 후 닫혀요.</p>,
                onClick: () => delay(1500),
              });
              setLog("openAsyncOneButtonSheet 끝");
            }}
          >
            openAsyncOneButtonSheet
          </Button>
          <Button
            size="small"
            color="light"
            onClick={async () => {
              const right = await bottomSheet.openTwoButtonSheet({
                header: "이중 버튼 바텀시트예요",
                children: <p className="t6 text-fg-secondary">두 개의 버튼이 있는 바텀시트예요.</p>,
                leftButton: "취소",
                rightButton: "확인",
              });
              setLog(`openTwoButtonSheet → ${right ? "오른쪽" : "왼쪽/닫힘"}`);
            }}
          >
            openTwoButtonSheet
          </Button>
          <Button
            size="small"
            color="light"
            onClick={async () => {
              const right = await bottomSheet.openAsyncTwoButtonSheet({
                header: "비동기 이중 버튼",
                children: <p className="t6 text-fg-secondary">오른쪽을 누르면 1.5초 로딩 후 닫혀요.</p>,
                onRightButtonClick: () => delay(1500),
              });
              setLog(`openAsyncTwoButtonSheet → ${right ? "오른쪽" : "왼쪽/닫힘"}`);
            }}
          >
            openAsyncTwoButtonSheet
          </Button>
        </Row>
        <p className="st12 numeric text-fg-tertiary">마지막 이벤트: {log || "-"}</p>
      </Section>
    </>
  );
}
