"use client";

import { useEffect, useRef, useState } from "react";

/**
 * PDFプレビュー（2-8 / 4-7）。
 * iPadOS Safari は iframe 内のPDF表示が不安定なため、
 * 埋め込みが機能しない場合は別タブで開く導線を出す。
 */
export function PdfViewer({ src, autoPrint = false }: { src: string; autoPrint?: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 一定時間 load が来ない場合は埋め込み不可とみなす
    const timer = setTimeout(() => { if (loading) setFailed(true); }, 6000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!autoPrint || loading || failed) return;
    const w = ref.current?.contentWindow;
    if (!w) return;
    const t = setTimeout(() => { try { w.focus(); w.print(); } catch { /* 別タブ導線に任せる */ } }, 700);
    return () => clearTimeout(t);
  }, [autoPrint, loading, failed]);

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <p className="text-[13px] leading-relaxed text-ink-2">
          この端末では画面内にPDFを表示できません。
          <br />
          下のボタンから別のタブで開いてご確認ください。
        </p>
        <a
          href={src}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-[44px] items-center rounded-full bg-brand-600 px-6 text-sm text-white"
        >
          PDFを開く
        </a>
      </div>
    );
  }

  return (
    <div className="relative bg-[#6e7b74]" style={{ height: "calc(100dvh - 96px)" }}>
      {loading && (
        <p className="absolute inset-0 flex items-center justify-center text-[13px] text-white/90">
          PDFを作成しています…
        </p>
      )}
      <iframe
        ref={ref}
        src={src}
        title="報告書プレビュー"
        onLoad={() => { setLoading(false); setFailed(false); }}
        className="h-full w-full border-0"
      />
    </div>
  );
}
