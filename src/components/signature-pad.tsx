"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

/**
 * 手書きサイン（2-6）。
 * 唯一お客様が操作する画面のため、別画面として開く。
 * Pointer Events で指・スタイラス双方に対応し、描画中はページがスクロールしないようにする。
 */
export function SignaturePad({
  initial,
  onSave,
  onCancel,
}: {
  initial?: string | null;
  onSave: (dataUrl: string | null) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [hasInk, setHasInk] = useState(Boolean(initial));

  const ctxOf = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return null;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#101614";
    ctx.lineWidth = 2.4;
    return ctx;
  }, []);

  // 端末の解像度に合わせて描画バッファを用意する（Retinaでぼやけないように）
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (initial) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = initial;
    }
  }, [initial]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = ctxOf();
    if (!ctx) return;
    drawing.current = true;
    dirty.current = true;
    setHasInk(true);
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = ctxOf();
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const up = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = ctxOf();
    if (!c || !ctx) return;
    const rect = c.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    dirty.current = false;
    setHasInk(false);
  };

  const save = () => {
    const c = canvasRef.current;
    if (!c) return;
    onSave(hasInk ? c.toDataURL("image/png") : null);
  };

  return (
    <div className="px-4.5 py-4">
      <p className="mb-2.5 text-[13.5px]">点線内に署名をしてください</p>
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        className="signature-pad block h-[250px] w-full border-2 border-dashed border-[#8a968f] bg-white"
        aria-label="署名欄"
      />
      <div className="mt-5 flex justify-center gap-3.5">
        <Button type="button" variant="ghost" onClick={onCancel}>やめる</Button>
        <Button type="button" variant="ghost" onClick={clear}>消去</Button>
        <Button type="button" onClick={save}>保存</Button>
      </div>
      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-ink-3">
        指またはスタイラスペンでご署名いただけます。
      </p>
    </div>
  );
}
