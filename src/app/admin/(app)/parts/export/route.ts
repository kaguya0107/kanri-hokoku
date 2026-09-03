import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

/**
 * 現在の登録内容をCSVで書き出す（概要書K-4「ダウンロード」）。
 * Excelで開いても文字化けしないようUTF-8のBOMを付ける。
 */
export async function GET() {
  if (!(await getAdminSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parts = await db.part.findMany({
    where: { isActive: true },
    orderBy: [{ priority: "desc" }, { kana: "asc" }, { code: "asc" }],
    select: { code: true, name: true, kana: true, unit: true, priority: true },
  });

  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = ["部品コード,部品名,読み,単位,優先順位"];
  for (const p of parts) {
    lines.push([p.code, p.name, p.kana, p.unit, p.priority].map(escape).join(","));
  }

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="parts_${stamp}.csv"`,
    },
  });
}
