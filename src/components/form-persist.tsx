"use client";

import { useEffect, useRef } from "react";

/**
 * 概要書「その他、仕様」：
 * 「画面の入力情報はブラウザキャッシュ等で保存し前画面等に移動しても入力情報が無くならいようにする」
 *
 * フォーム内の入力を localStorage に保存し、再訪時に復元する。
 * 送信に成功したら破棄する。プライベートブラウズ等で使えない場合は黙って無効化する。
 */
export function FormPersist({ formId, storageKey }: { formId: string; storageKey: string }) {
  const restored = useRef(false);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const read = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        return raw ? (JSON.parse(raw) as Record<string, string | string[]>) : null;
      } catch {
        return null;
      }
    };

    const write = () => {
      try {
        const data: Record<string, string | string[]> = {};
        for (const el of Array.from(form.elements)) {
          const f = el as HTMLInputElement;
          if (!f.name || f.type === "hidden" || f.type === "password" || f.type === "file") continue;
          if (f.type === "checkbox" || f.type === "radio") {
            if (f.checked) {
              const prev = data[f.name];
              data[f.name] = Array.isArray(prev) ? [...prev, f.value] : prev ? [prev as string, f.value] : [f.value];
            }
          } else {
            data[f.name] = f.value;
          }
        }
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {
        /* 保存できない環境では何もしない */
      }
    };

    if (!restored.current) {
      restored.current = true;
      const saved = read();
      if (saved) {
        for (const [name, value] of Object.entries(saved)) {
          const fields = form.querySelectorAll<HTMLInputElement>(`[name="${CSS.escape(name)}"]`);
          fields.forEach((f) => {
            if (f.type === "checkbox" || f.type === "radio") {
              f.checked = Array.isArray(value) ? value.includes(f.value) : value === f.value;
            } else if (!f.value && typeof value === "string") {
              // サーバから値が来ている場合はそちらを優先する
              f.value = value;
            }
          });
        }
      }
    }

    const onInput = () => write();
    const onSubmit = () => {
      try { localStorage.removeItem(storageKey); } catch { /* noop */ }
    };

    form.addEventListener("input", onInput);
    form.addEventListener("change", onInput);
    form.addEventListener("submit", onSubmit);
    return () => {
      form.removeEventListener("input", onInput);
      form.removeEventListener("change", onInput);
      form.removeEventListener("submit", onSubmit);
    };
  }, [formId, storageKey]);

  return null;
}
