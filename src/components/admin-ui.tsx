import type { ReactNode } from "react";

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line-2 bg-white">
      <table className="w-full border-collapse text-[12.5px]">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className = "",
  width,
}: {
  children?: ReactNode;
  className?: string;
  width?: string;
}) {
  return (
    <th
      style={width ? { width } : undefined}
      className={`whitespace-nowrap bg-brand-500 px-2.5 py-2.5 text-left text-[11.5px] font-bold text-white ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-[#e3eae5] px-2.5 py-2 ${className}`}>{children}</td>;
}

export function Pager({ from, to, total }: { from: number; to: number; total: number }) {
  return (
    <span className="ml-auto font-mono text-xs text-ink-2 tabular-nums">
      {total === 0 ? "0 件" : `${from}-${to} / ${total}`}
    </span>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-2.5 py-10 text-center text-[13px] text-ink-3">
        {children}
      </td>
    </tr>
  );
}
