"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { kanaRow, normalizeKana } from "@/lib/kana";
import { getAdminSession } from "@/lib/session";

async function requireAdmin() {
  const s = await getAdminSession();
  if (!s) throw new Error("管理者としてログインしてください");
}

export type ImportRow = {
  line: number;
  code: string;
  name: string;
  kana: string;
  unit: string;
  priority: number;
};

export type ImportIssue = { line: number; message: string };

export type ImportPreview = {
  error?: string;
  /** 検証のみ行い、まだ書き込んでいない状態 */
  validated?: {
    token: string;
    rows: ImportRow[];
    issues: ImportIssue[];
    willInsert: number;
    willUpdate: number;
    willDeactivate: number;
  };
  done?: { inserted: number; updated: number; deactivated: number };
};

const rowSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(200),
  kana: z.string().trim().min(1).max(200),
  unit: z.string().trim().min(1).max(10),
  priority: z.number().int().min(0).max(9_999_999),
});

/** CSV（UTF-8）を1行ずつ解く。ダブルクォート内のカンマと改行に対応する。 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/**
 * 取込は「検証 → 結果確認 → 確定」の3段階（B-24）。
 * 概要書の「書き込む前にDBをクリア」は、途中で失敗するとマスタが全損するため採用しない。
 * 代わりに code をキーに upsert し、CSVに無い品目は論理削除する（B-23）。
 */
export async function validateImport(_prev: ImportPreview, fd: FormData): Promise<ImportPreview> {
  await requireAdmin();

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "CSVファイルを選択してください" };
  if (file.size > 8 * 1024 * 1024) return { error: "ファイルサイズが大きすぎます（上限8MB）" };

  const table = parseCsv(await file.text());
  if (table.length < 2) return { error: "見出し行とデータ行が必要です" };

  const header = table[0].map((h) => h.trim());
  const expect = ["部品コード", "部品名", "読み", "単位", "優先順位"];
  if (expect.some((e, i) => header[i] !== e)) {
    return { error: `見出し行が一致しません。1行目は「${expect.join(",")}」としてください（現在: ${header.join(",")}）` };
  }

  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Map<string, number>();
  const seenName = new Map<string, number>();

  table.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    const parsed = rowSchema.safeParse({
      code: cells[0] ?? "",
      name: cells[1] ?? "",
      kana: cells[2] ?? "",
      unit: cells[3] ?? "",
      priority: Number(cells[4] ?? 0) || 0,
    });
    if (!parsed.success) {
      issues.push({ line, message: parsed.error.issues[0].message });
      return;
    }
    const r = parsed.data;

    if (seen.has(r.code)) {
      issues.push({ line, message: `部品コード「${r.code}」が${seen.get(r.code)}行目と重複しています` });
      return;
    }
    // 概要書K-4「製品名の重複エラーは実施したい」
    if (seenName.has(r.name)) {
      issues.push({ line, message: `部品名「${r.name}」が${seenName.get(r.name)}行目と重複しています` });
      return;
    }
    const kana = normalizeKana(r.kana);
    if (!kanaRow(kana)) {
      issues.push({ line, message: `読み「${r.kana}」から50音の行を判定できません（ひらがな・カタカナで入力してください）` });
      return;
    }

    seen.set(r.code, line);
    seenName.set(r.name, line);
    rows.push({ line, ...r, kana });
  });

  const existing = await db.part.findMany({ select: { code: true, isActive: true } });
  const existingCodes = new Set(existing.map((e) => e.code));
  const incoming = new Set(rows.map((r) => r.code));

  const willInsert = rows.filter((r) => !existingCodes.has(r.code)).length;
  const willUpdate = rows.length - willInsert;
  const willDeactivate = existing.filter((e) => e.isActive && !incoming.has(e.code)).length;

  const token = crypto.randomUUID();
  pending.set(token, { rows, at: Date.now() });
  prunePending();

  return { validated: { token, rows, issues, willInsert, willUpdate, willDeactivate } };
}

/** 検証済みデータの一時保管。確定時に読み出す。 */
const pending = new Map<string, { rows: ImportRow[]; at: number }>();
function prunePending() {
  const cutoff = Date.now() - 30 * 60_000;
  for (const [k, v] of pending) if (v.at < cutoff) pending.delete(k);
}

export async function commitImport(_prev: ImportPreview, fd: FormData): Promise<ImportPreview> {
  await requireAdmin();

  const token = String(fd.get("token") ?? "");
  const entry = pending.get(token);
  if (!entry) return { error: "検証結果の有効期限が切れました。もう一度ファイルを選択してください" };

  const rows = entry.rows;
  const incoming = rows.map((r) => r.code);

  const before = await db.part.findMany({ select: { code: true, isActive: true } });
  const beforeCodes = new Set(before.map((b) => b.code));
  const inserted = rows.filter((r) => !beforeCodes.has(r.code)).length;
  const updated = rows.length - inserted;

  // 分割コミット。1万行でも実行時間・メモリの上限に当たらないようにする。
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    await db.$transaction(
      slice.map((r) =>
        db.part.upsert({
          where: { code: r.code },
          create: {
            code: r.code, name: r.name, kana: r.kana, kanaRow: kanaRow(r.kana),
            unit: r.unit, priority: r.priority, isActive: true,
          },
          update: {
            name: r.name, kana: r.kana, kanaRow: kanaRow(r.kana),
            unit: r.unit, priority: r.priority, isActive: true,
          },
        }),
      ),
    );
  }

  // CSVに無い品目は物理削除せず無効化する。過去の報告書は名称を控えているため影響を受けない。
  const { count: deactivated } = await db.part.updateMany({
    where: { code: { notIn: incoming }, isActive: true },
    data: { isActive: false },
  });

  pending.delete(token);
  revalidatePath("/admin/parts");
  return { done: { inserted, updated, deactivated } };
}
