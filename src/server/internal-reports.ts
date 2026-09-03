"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUserSession } from "@/lib/session";

async function requireUser() {
  const s = await getUserSession();
  if (!s) redirect("/login");
  return s;
}

async function ownedReport(id: string, accountId: string) {
  const r = await db.report.findFirst({ where: { id, accountId } });
  if (!r) redirect("/reports");
  return r;
}

/** 社内用は客先提出用の内容を引き継いで作る（4-1）。参照ではなくコピー。 */
async function ensureInternal(reportId: string) {
  const existing = await db.internalReport.findUnique({ where: { reportId } });
  if (existing) return existing;
  return db.internalReport.create({ data: { reportId } });
}

export type StepState = { error?: string; fieldErrors?: Record<string, string> };

function zodErrors(e: { issues: { path: PropertyKey[]; message: string }[] }): StepState {
  const fieldErrors: Record<string, string> = {};
  for (const i of e.issues) {
    const key = i.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = i.message;
  }
  return { error: e.issues[0]?.message, fieldErrors };
}

/** 4-1 基本情報。表示のみで入力項目が無いため、社内用レコードを用意して次へ進む。 */
export async function saveInternalBasic(fd: FormData) {
  const session = await requireUser();
  const id = String(fd.get("id"));
  await ownedReport(id, session.accountId);
  await ensureInternal(id);
  redirect(`/reports/${id}/internal/remaining`);
}

const textSchema = z.object({ body: z.string().trim().max(4000) });

/** 4-2 今回作業時の残作業 */
export async function saveRemainingWork(_prev: StepState, fd: FormData): Promise<StepState> {
  const session = await requireUser();
  const id = String(fd.get("id"));
  await ownedReport(id, session.accountId);

  const parsed = textSchema.safeParse({ body: fd.get("remainingWork") ?? "" });
  if (!parsed.success) return zodErrors(parsed.error);

  const internal = await ensureInternal(id);
  await db.internalReport.update({
    where: { id: internal.id },
    data: { remainingWork: parsed.data.body },
  });
  redirect(`/reports/${id}/internal/reorder`);
}

/** 4-3 再手配の必要な部材。B-11: 交換部品と同じマスタから選ぶ。 */
export async function saveReorderItems(_prev: StepState, fd: FormData): Promise<StepState> {
  const session = await requireUser();
  const id = String(fd.get("id"));
  await ownedReport(id, session.accountId);
  const internal = await ensureInternal(id);

  const schema = z.object({
    items: z.array(z.object({
      partId: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().min(1).max(9999),
    })),
  });
  const ids = fd.getAll("partId").map(String);
  const qtys = fd.getAll("quantity").map(String);
  const parsed = schema.safeParse({ items: ids.map((partId, i) => ({ partId, quantity: qtys[i] ?? 1 })) });
  if (!parsed.success) return zodErrors(parsed.error);

  const parts = await db.part.findMany({ where: { id: { in: parsed.data.items.map((i) => i.partId) } } });
  const byId = new Map(parts.map((p) => [p.id, p]));

  await db.$transaction([
    db.internalReorderItem.deleteMany({ where: { internalReportId: internal.id } }),
    db.internalReorderItem.createMany({
      data: parsed.data.items.flatMap((it, i) => {
        const p = byId.get(it.partId);
        if (!p) return [];
        // B-23: 名称・単位はスナップショット
        return [{
          internalReportId: internal.id, partId: p.id, partCode: p.code,
          partName: p.name, unit: p.unit, quantity: it.quantity, sortOrder: i,
        }];
      }),
    }),
  ]);
  redirect(`/reports/${id}/internal/times`);
}

/** 4-4 移動および作業時間。B-12: 明細に日付を持たせ、複数日・日跨ぎに対応する。 */
export async function saveWorkTimes(_prev: StepState, fd: FormData): Promise<StepState> {
  const session = await requireUser();
  const id = String(fd.get("id"));
  await ownedReport(id, session.accountId);
  const internal = await ensureInternal(id);

  const hhmm = z.string().regex(/^(\d{2}:\d{2})?$/, "時刻は HH:MM の形式で入力してください");
  const schema = z.object({
    rows: z.array(z.object({
      workDate: z.string().min(1, "日付を選択してください"),
      goStart: hhmm, goEnd: hhmm,
      workStart: hhmm, workEnd: hhmm,
      backStart: hhmm, backEnd: hhmm,
    })).min(1, "1日分以上を入力してください"),
  });

  const dates = fd.getAll("workDate").map(String);
  const rows = dates.map((workDate, i) => ({
    workDate,
    goStart: String(fd.getAll("goStart")[i] ?? ""),
    goEnd: String(fd.getAll("goEnd")[i] ?? ""),
    workStart: String(fd.getAll("workStart")[i] ?? ""),
    workEnd: String(fd.getAll("workEnd")[i] ?? ""),
    backStart: String(fd.getAll("backStart")[i] ?? ""),
    backEnd: String(fd.getAll("backEnd")[i] ?? ""),
  }));

  const parsed = schema.safeParse({ rows });
  if (!parsed.success) return zodErrors(parsed.error);

  await db.$transaction([
    db.internalWorkTime.deleteMany({ where: { internalReportId: internal.id } }),
    db.internalWorkTime.createMany({
      data: parsed.data.rows.map((r, i) => ({
        internalReportId: internal.id,
        workDate: new Date(r.workDate),
        goStart: r.goStart, goEnd: r.goEnd,
        workStart: r.workStart, workEnd: r.workEnd,
        backStart: r.backStart, backEnd: r.backEnd,
        sortOrder: i,
      })),
    }),
  ]);
  redirect(`/reports/${id}/internal/sales`);
}

/** 4-5 営業アプローチ・備考 */
export async function saveSalesAndRemarks(_prev: StepState, fd: FormData): Promise<StepState> {
  const session = await requireUser();
  const id = String(fd.get("id"));
  await ownedReport(id, session.accountId);
  const internal = await ensureInternal(id);

  const schema = z.object({
    salesApproach: z.string().trim().max(2000),
    remarks: z.string().trim().max(2000),
  });
  const parsed = schema.safeParse({
    salesApproach: fd.get("salesApproach") ?? "",
    remarks: fd.get("remarks") ?? "",
  });
  if (!parsed.success) return zodErrors(parsed.error);

  await db.internalReport.update({ where: { id: internal.id }, data: parsed.data });

  // 社内用が作成された時点でステータスを進める（B-19）
  const report = await db.report.findUniqueOrThrow({ where: { id } });
  if (report.status === "SUBMITTED") {
    await db.report.update({ where: { id }, data: { status: "INTERNAL" } });
  }

  revalidatePath("/reports");
  redirect(`/reports/${id}/internal/done`);
}

/**
 * 4-6「完了」。ステータスを完了（請求済）にする。
 * B-19: 概要書の完／－の2値では業務フロー8段階を表現できないため4区分にしている。
 */
export async function completeReport(fd: FormData) {
  const session = await requireUser();
  const id = String(fd.get("id"));
  await ownedReport(id, session.accountId);

  await db.report.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date(), version: { increment: 1 } },
  });

  revalidatePath("/reports");
  redirect("/reports");
}
