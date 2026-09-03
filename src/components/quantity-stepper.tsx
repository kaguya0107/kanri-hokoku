"use client";

import { useState } from "react";

/** −／＋と直接入力。タップ領域は36px以上を確保する。 */
export function QuantityStepper({
  name,
  defaultValue = 0,
  min = 0,
  max = 9999,
  onChange,
}: {
  name?: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  onChange?: (v: number) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  const set = (v: number) => {
    const next = Math.min(max, Math.max(min, Number.isNaN(v) ? min : v));
    setValue(next);
    onChange?.(next);
  };

  return (
    <div className="flex flex-none items-center overflow-hidden rounded-sm border border-line">
      <button
        type="button"
        onClick={() => set(value - 1)}
        aria-label="1減らす"
        className="h-9 w-9 bg-[#f2f6f3] text-[17px] leading-none active:bg-brand-100"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        name={name}
        value={value}
        onChange={(e) => set(parseInt(e.target.value.replace(/[^\d]/g, ""), 10))}
        className="h-9 w-12 border-x border-line-2 text-center text-[15px] focus:outline-2 focus:-outline-offset-2 focus:outline-brand-500"
        aria-label="数量"
      />
      <button
        type="button"
        onClick={() => set(value + 1)}
        aria-label="1増やす"
        className="h-9 w-9 bg-[#f2f6f3] text-[17px] leading-none active:bg-brand-100"
      >
        ＋
      </button>
    </div>
  );
}
