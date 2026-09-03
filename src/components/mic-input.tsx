"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 音声入力（概要書「任意のテキスト入力は『マイク入力』ができるようにする」）
 *
 * A-2: ブラウザの音声認識はクラウドに音声を送るため通信が必要で、地下・機械室では動かない。
 * 圏外では端末キーボードの音声入力を使う運用を案内する。
 */
type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function MicButton({ targetId }: { targetId: string }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const recRef = useRef<InstanceType<SpeechCtor> | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    setSupported(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
    return () => recRef.current?.stop();
  }, []);

  const start = () => {
    const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;

    if (!navigator.onLine) {
      setMessage("圏外では音声認識を利用できません。キーボードのマイクをお使いください。");
      return;
    }

    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = "ja-JP";
    rec.interimResults = false;
    rec.continuous = false;

    rec.onresult = (e) => {
      const text = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join("");
      const el = document.getElementById(targetId) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el && text) {
        el.value = el.value ? `${el.value}${el.value.endsWith("\n") ? "" : " "}${text}` : text;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };
    rec.onerror = (e) => {
      setMessage(
        e.error === "not-allowed"
          ? "マイクの使用が許可されていません。キーボードのマイクをお使いください。"
          : "音声を認識できませんでした。",
      );
      setListening(false);
    };
    rec.onend = () => setListening(false);

    setMessage("");
    setListening(true);
    rec.start();
  };

  const stop = () => { recRef.current?.stop(); setListening(false); };

  if (!supported) {
    return (
      <button
        type="button"
        title="この端末では、キーボードのマイクキーから音声入力をご利用ください"
        onClick={() => setMessage("キーボードのマイクキーから音声入力をご利用ください。")}
        className="flex h-11 w-11 flex-none items-center justify-center rounded-sm border border-line bg-white text-[17px] text-ink-3"
        aria-label="音声入力について"
      >
        🎤
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-pressed={listening}
        aria-label={listening ? "音声入力を停止" : "音声入力を開始"}
        className={`flex h-11 w-11 flex-none items-center justify-center rounded-sm border text-[17px] ${
          listening ? "animate-pulse border-alert bg-[#fdf2ef] text-alert" : "border-line bg-white"
        }`}
      >
        🎤
      </button>
      {message && (
        <p role="status" className="mt-1 basis-full text-[11px] leading-relaxed text-ink-3">{message}</p>
      )}
    </>
  );
}
