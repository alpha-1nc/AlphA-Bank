"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Clock } from "lucide-react";
import { BottomSheet, Button, ListRow, Switch, TextButton, useToast } from "@/components/ui";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
  updateNotificationSettings,
  type NotificationSettingsInput,
} from "@/app/actions/push";
import { urlBase64ToUint8Array } from "@/lib/vapid-key";
import SettingsSection, { SettingsIconBox } from "@/components/settings/SettingsSection";

export interface NotificationSettingsValues {
  notifyBudgetStart: boolean;
  notifyUncompleted: boolean;
  notifyPaydayEve: boolean;
  notifyMidCycle: boolean;
  notifyHour: number;
}

type PushState =
  | "loading"
  | "unsupported"
  | "ios-install"
  | "not-configured"
  | "denied"
  | "off"
  | "on";

type BoolKey = "notifyBudgetStart" | "notifyUncompleted" | "notifyPaydayEve" | "notifyMidCycle";

const SWITCHES: Array<{ key: BoolKey; title: string; desc: string; needsWorkplace?: boolean }> = [
  { key: "notifyBudgetStart", title: "예산 기간 시작 알림", desc: "기간 시작 7일 전에 알려드려요" },
  { key: "notifyUncompleted", title: "미집행 항목 알림", desc: "기간이 끝나기 하루 전에 알려드려요" },
  { key: "notifyPaydayEve", title: "월급 전날 알림", desc: "월급날 하루 전에 알려드려요", needsWorkplace: true },
  { key: "notifyMidCycle", title: "중간 점검 알림", desc: "월급 받고 15일 뒤에 알려드려요", needsWorkplace: true },
];

function hourLabel(h: number): string {
  const period = h < 12 ? "오전" : "오후";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${display}시`;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** 서비스 워커 준비를 기다리되, 개발 모드처럼 SW 가 꺼져 있으면 무한 대기하지 않도록 제한 */
async function getRegistration(timeoutMs = 4000): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

async function fetchPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/public-key", { cache: "no-store" });
    const json = (await res.json()) as { configured?: boolean; publicKey?: string | null };
    return json.configured && json.publicKey ? json.publicKey : null;
  } catch {
    return null;
  }
}

export default function NotificationSettingsCard({
  initialSettings,
  hasActiveWorkplace,
}: {
  initialSettings: NotificationSettingsValues;
  hasActiveWorkplace: boolean;
}) {
  const { openToast } = useToast();
  const [state, setState] = useState<PushState>("loading");
  const [settings, setSettings] = useState(initialSettings);
  const [hourOpen, setHourOpen] = useState(false);
  const [busy, setBusy] = useState<null | "enable" | "test" | "disable">(null);

  const detect = useCallback(async () => {
    // iOS Safari 탭은 PushManager 자체가 없으므로 미지원보다 먼저 판별
    if (isIos() && !isStandalone()) return setState("ios-install");
    if (!("Notification" in window) || !("PushManager" in window)) return setState("unsupported");
    const publicKey = await fetchPublicKey();
    if (!publicKey) return setState("not-configured");
    if (Notification.permission === "denied") return setState("denied");
    if (Notification.permission === "granted") {
      const reg = await getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) return setState("on");
    }
    setState("off");
  }, []);

  useEffect(() => {
    void detect();
  }, [detect]);

  async function handleEnable() {
    setBusy("enable");
    try {
      // 클릭 핸들러 안에서 가장 먼저 권한 요청 (iOS 는 사용자 제스처 필요)
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        openToast("알림 권한이 허용되지 않았어요", { type: "bottom" });
        return;
      }
      const publicKey = await fetchPublicKey();
      if (!publicKey) return setState("not-configured");
      const reg = await getRegistration(8000);
      if (!reg) throw new Error("서비스 워커를 찾지 못했어요");
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));
      const json = sub.toJSON();
      const result = await savePushSubscription(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
        },
        navigator.userAgent,
      );
      if (!result.ok) {
        await sub.unsubscribe().catch(() => undefined);
        throw new Error(result.error);
      }
      setState("on");
      openToast("이 기기에서 알림을 켰어요", { type: "bottom" });
    } catch (e) {
      openToast(`알림을 켜지 못했어요: ${e instanceof Error ? e.message : "알 수 없는 오류"}`, { type: "bottom" });
    } finally {
      setBusy(null);
    }
  }

  async function handleDisable() {
    setBusy("disable");
    try {
      const reg = await getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await removePushSubscription(endpoint);
      }
      setState("off");
      openToast("이 기기에서 알림을 껐어요", { type: "bottom" });
    } catch (e) {
      openToast(`알림을 끄지 못했어요: ${e instanceof Error ? e.message : "알 수 없는 오류"}`, { type: "bottom" });
    } finally {
      setBusy(null);
    }
  }

  async function handleTest() {
    setBusy("test");
    try {
      const r = await sendTestNotification();
      if (!r.ok) {
        openToast(
          r.reason === "not-configured" ? "서버에 알림 키가 설정되지 않았어요" : "등록된 기기가 없어요",
          { type: "bottom" },
        );
      } else if (r.sent === 0) {
        openToast(`테스트 알림을 보내지 못했어요 (실패 ${r.failed}대${r.removed ? `, 만료 ${r.removed}대 정리` : ""})`, {
          type: "bottom",
        });
        if (r.removed > 0) void detect();
      } else {
        openToast(`테스트 알림을 보냈어요 (성공 ${r.sent}대${r.failed ? `, 실패 ${r.failed}대` : ""})`, {
          type: "bottom",
        });
      }
    } catch {
      openToast("테스트 알림을 보내지 못했어요", { type: "bottom" });
    } finally {
      setBusy(null);
    }
  }

  async function saveSetting(partial: NotificationSettingsInput) {
    const prev = settings;
    setSettings({ ...settings, ...partial });
    try {
      const r = await updateNotificationSettings(partial);
      if (!r.ok) throw new Error(r.error);
    } catch {
      setSettings(prev);
      openToast("저장하지 못했어요", { type: "bottom" });
    }
  }

  const message: Partial<Record<PushState, string>> = {
    loading: "알림 상태를 확인하고 있어요",
    unsupported: "이 브라우저는 알림을 지원하지 않아요",
    "ios-install":
      "아이폰에서는 홈 화면에 추가한 앱에서만 알림을 받을 수 있어요. 사파리에서 공유 → 홈 화면에 추가 후 그 아이콘으로 열어주세요.",
    "not-configured": "알림 기능이 아직 설정되지 않았어요",
    denied: "알림이 차단되어 있어요. iOS 설정 → 알림 → AlphA Bank 에서 허용해주세요.",
  };

  const bellBox = (
    <SettingsIconBox>
      <Bell className="h-5 w-5 text-fg-tertiary" aria-hidden />
    </SettingsIconBox>
  );

  return (
    <SettingsSection title="알림">
      {state === "on" ? (
        <>
          {SWITCHES.map((item) => {
            const noWorkplace = item.needsWorkplace && !hasActiveWorkplace;
            return (
              <ListRow
                key={item.key}
                border="indented"
                verticalPadding="medium"
                left={bellBox}
                contents={
                  <div className="flex flex-col">
                    <ListRow.Texts type="2RowTypeA" top={item.title} bottom={item.desc} />
                    {noWorkplace && (
                      <span className="st12 mt-1 text-fg-tertiary">현재 재직 중인 근무지가 없어 발송되지 않아요</span>
                    )}
                  </div>
                }
                right={
                  <span onClick={(e) => e.stopPropagation()}>
                    <Switch
                      aria-label={item.title}
                      checked={settings[item.key]}
                      onCheckedChange={(v) => void saveSetting({ [item.key]: v })}
                    />
                  </span>
                }
              />
            );
          })}
          <ListRow
            withTouchEffect
            withArrow
            border="none"
            verticalPadding="medium"
            onClick={() => setHourOpen(true)}
            left={
              <SettingsIconBox>
                <Clock className="h-5 w-5 text-fg-tertiary" aria-hidden />
              </SettingsIconBox>
            }
            contents={<ListRow.Texts type="1RowTypeA" top="알림 받는 시각" />}
            right={<span className="t5 numeric font-medium text-fg-secondary">{hourLabel(settings.notifyHour)}</span>}
          />
        </>
      ) : state === "off" ? (
        <div className="flex flex-col gap-3 p-5">
          <p className="t6 text-fg-secondary">예산 일정과 월급 소식을 푸시 알림으로 받아보세요.</p>
          <Button size="medium" color="primary" variant="fill" display="block" loading={busy === "enable"} onClick={handleEnable}>
            알림 켜기
          </Button>
        </div>
      ) : (
        <p className="t6 p-5 text-fg-secondary">{message[state]}</p>
      )}

      {state === "on" && (
        <div className="flex flex-col items-center gap-3 border-t border-divider p-5">
          <Button size="medium" color="light" variant="fill" display="block" loading={busy === "test"} onClick={handleTest}>
            테스트 알림 보내기
          </Button>
          <TextButton
            size="small"
            variant="clear"
            style={{ color: "var(--tk-negative)" }}
            disabled={busy === "disable"}
            onClick={handleDisable}
          >
            이 기기에서 알림 끄기
          </TextButton>
        </div>
      )}

      <BottomSheet open={hourOpen} onClose={() => setHourOpen(false)} header={<BottomSheet.Header>알림 받는 시각</BottomSheet.Header>}>
        <div className="-mx-6 flex flex-col">
          {Array.from({ length: 24 }, (_, h) => (
            <ListRow
              key={h}
              withTouchEffect
              border="none"
              verticalPadding="medium"
              contents={<ListRow.Texts type="1RowTypeA" top={hourLabel(h)} />}
              right={h === settings.notifyHour ? <Check className="h-5 w-5 text-primary" aria-hidden /> : undefined}
              onClick={() => {
                setHourOpen(false);
                if (h !== settings.notifyHour) void saveSetting({ notifyHour: h });
              }}
            />
          ))}
        </div>
      </BottomSheet>
    </SettingsSection>
  );
}
