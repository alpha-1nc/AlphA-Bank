"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { JK_USER_ID, USER_PROFILES } from "@/lib/user-profiles";

export default function SelectProfilePage() {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleSelect(userId: string) {
    if (loadingId !== null) return;
    setLoadingId(userId);
    try {
      const res = await fetch("/api/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        setLoadingId(null);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setLoadingId(null);
    }
  }

  const busy = loadingId !== null;

  return (
    <>
      {busy ? <LoadingSpinner mode="overlay" /> : null}
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-lg flex flex-col items-center">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo-full.svg"
            alt="AlphA Bank"
            width={420}
            height={126}
            priority
            className="h-20 w-auto sm:h-24 md:h-28"
          />
        </div>

        <div className="flex w-full max-w-md flex-row flex-nowrap items-stretch justify-center gap-3 sm:gap-4 mx-auto">
          {USER_PROFILES.map((profile) => {
            const isJk = profile.id === JK_USER_ID;
            const avatarClass = isJk
              ? "bg-primary/15 text-primary"
              : "bg-secondary text-secondary-foreground";

            return (
              <button
                key={profile.id}
                type="button"
                disabled={busy}
                onClick={() => handleSelect(profile.id)}
                className="
                  group flex min-w-0 flex-1 basis-0
                  flex-col items-center gap-3 sm:gap-4 p-4 sm:p-6 rounded-3xl
                  bg-card border border-border
                  shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)]
                  hover:border-primary/40 hover:-translate-y-1
                  transition-all duration-200 cursor-pointer
                  disabled:opacity-60 disabled:pointer-events-none disabled:hover:translate-y-0
                "
              >
                <span
                  className={`
                    w-14 h-14 rounded-full flex items-center justify-center
                    text-xl font-black shrink-0
                    ${avatarClass}
                  `}
                >
                  {profile.initial}
                </span>
                <span className="text-lg font-bold text-foreground">{profile.name}</span>
              </button>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <h1 className="text-sm text-muted-foreground font-medium">
            사용자를 선택하세요
          </h1>
        </div>
      </div>
    </div>
    </>
  );
}
