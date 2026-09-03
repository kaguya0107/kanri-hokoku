import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* 概要書のワイヤーに合わせつつ、タブレットの操作性を優先して
   タップ領域を最低44pxに広げている（開発の背景「入力作業そのものが負担にならない」） */

export function Button({
  variant = "solid",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: "solid" | "ghost" | "grey"; size?: "sm" | "md" }) {
  const base =
    "inline-flex items-center justify-center rounded-full font-sans whitespace-nowrap transition-colors " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed";
  const variants = {
    solid: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-[#b9c4be]",
    ghost: "bg-white text-brand-600 border border-brand-600 hover:bg-brand-50 disabled:text-[#b9c4be] disabled:border-[#c3cdc7]",
    grey: "bg-[#5e6b65] text-white hover:bg-[#4c5852]",
  }[variant];
  const sizes = { sm: "px-3 py-2 text-xs min-h-[36px]", md: "px-4 py-2.5 text-sm min-h-[44px]" }[size];
  return <button className={`${base} ${variants} ${sizes} ${className}`} {...props} />;
}

export function TextInput({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`w-full min-w-0 rounded-sm border border-line bg-white px-2.5 py-2.5 text-[15px] text-ink
        focus:border-brand-500 focus:outline-2 focus:-outline-offset-1 focus:outline-brand-500
        disabled:bg-[#f2f4f2] disabled:text-ink-3 ${className}`}
      {...props}
    />
  );
}

export function TextArea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`w-full min-w-0 resize-y rounded-sm border border-line bg-white px-2.5 py-2.5 text-[15px]
        leading-relaxed text-ink focus:border-brand-500 focus:outline-2 focus:-outline-offset-1
        focus:outline-brand-500 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <select
      className={`w-full min-w-0 rounded-sm border border-line bg-white px-2 py-2.5 text-[15px] text-ink
        focus:border-brand-500 focus:outline-2 focus:-outline-offset-1 focus:outline-brand-500 ${className}`}
      {...props}
    />
  );
}

/** 右寄せラベル + 入力欄。概要書2-1のレイアウトに合わせている */
export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="grid grid-cols-[88px_1fr] items-center gap-x-2.5 gap-y-2">
        <label className="text-right text-[13.5px] text-ink-2">
          {label}
          {required && <span className="ml-0.5 text-[10px] text-alert">＊</span>}
        </label>
        <div className="flex min-w-0 items-center gap-1.5">{children}</div>
      </div>
      {hint && <p className="mt-1 pl-[98px] text-[11.5px] text-ink-3">{hint}</p>}
    </div>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3.5 border-b-2 border-brand-500 pb-2 text-[15px] font-bold">{children}</h2>
  );
}

/** 入力ステップの見出し。概要書の［1 基本情報］［2 作業内容］… をそのまま踏襲 */
export function StepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav
      aria-label="入力ステップ"
      className="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5 border-b border-line-2 bg-brand-50 px-3 py-2.5 text-[11.5px] text-ink-2"
    >
      {steps.map((s, i) => (
        <span key={s} className={i === current ? "font-bold text-alert" : ""}>
          ［{s}］
        </span>
      ))}
    </nav>
  );
}

export const REPORT_STEPS = ["1 基本情報", "2 作業内容", "3 交換部品", "4 測定値・報告事項", "5 確認・署名"];
export const INTERNAL_STEPS = [
  "1 基本情報",
  "2 今回作業時の残作業",
  "3 再手配の必要な部材",
  "4 移動および作業時間の推移",
  "5 客先への営業アプローチ",
  "6 備考（社内への報告事項等）",
];

/** もどる / つぎへ。概要書の大きな矢印ボタンを踏襲 */
export function NavButtons({
  backHref,
  children,
}: {
  backHref?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mt-6 flex justify-center gap-5 border-t border-line-2 pt-4">
      {backHref && (
        <Link
          href={backHref}
          className="flex h-[60px] w-[78px] flex-col items-center justify-center gap-px rounded-[10px]
            border-2 border-brand-600 bg-white text-[11px] leading-tight text-brand-600
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span className="text-[15px] leading-none">◀</span>もどる
        </Link>
      )}
      {children}
    </div>
  );
}

export function NavSubmit({ label = "つぎへ", disabled }: { label?: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex h-[60px] w-[78px] flex-col items-center justify-center gap-px rounded-[10px]
        border-2 border-brand-600 bg-brand-600 text-[11px] leading-tight text-white
        disabled:border-[#c3cdc7] disabled:bg-[#b9c4be]
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <span className="text-[15px] leading-none">▶</span>
      {label}
    </button>
  );
}
