"use client";

import { useEffect, useState } from "react";

/**
 * 通信状態の表示（概要書8章「保存済み/端末保存中/サーバー送信済み などの状態を
 * 必要に応じて確認できる」）。オフライン検知は navigator.onLine による。
 */
export function AppHeader({ pendingCount = 0 }: { pendingCount?: number }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const offline = !online;
  const label = offline
    ? `端末保存中${pendingCount > 0 ? ` ${pendingCount}件` : ""}`
    : pendingCount > 0
      ? `未送信 ${pendingCount}件`
      : "サーバ保存済み";

  return (
    <header className="flex h-[46px] flex-none items-center gap-2.5 bg-brand-700 px-3.5 text-white">
      <span className="text-[15px] font-bold tracking-wide">作業完了報告書SYSTEM</span>
      <span
        className="ml-auto flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] whitespace-nowrap"
        aria-live="polite"
      >
        <span
          className={`h-[7px] w-[7px] rounded-full ${
            offline || pendingCount > 0 ? "bg-[#f2c14e]" : "bg-[#8fe3b0]"
          }`}
        />
        {label}
      </span>
    </header>
  );
}
