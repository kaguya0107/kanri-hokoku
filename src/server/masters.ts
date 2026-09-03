"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/session";

async function requireAdmin() {
  if (!(await getAdminSession())) throw new Error("管理者としてログインしてください");
}

export type MasterState = { error?: string; ok?: string };

/* ---------- 機種名マスタ（K-5） ---------- */

const modelSchema = z.object({ name: z.string().trim().min(1, "機種名を入力してください").max(80) });

export async function saveModel(_prev: MasterState, fd: FormData): Promise<MasterState> {
  await requireAdmin();
  const id = fd.get("id") ? Number(fd.get("id")) : null;
  const parsed = modelSchema.safeParse({ name: fd.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name } = parsed.data;
  const dup = await db.equipmentModel.findUnique({ where: { name } });
  if (dup && dup.id !== id) return { error: `機種名「${name}」は既に登録されています` };

  if (id) await db.equipmentModel.update({ where: { id }, data: { name } });
  else {
    const max = await db.equipmentModel.aggregate({ _max: { sortOrder: true } });
    await db.equipmentModel.create({ data: { name, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  }

  revalidatePath("/admin/models");
  return { ok: id ? "更新しました" : "登録しました" };
}

/** 過去の報告書は機種名を控えているため、無効化しても帳票は変わらない */
export async function toggleModel(_prev: MasterState, fd: FormData): Promise<MasterState> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const m = await db.equipmentModel.findUnique({ where: { id } });
  if (!m) return { error: "対象が見つかりません" };
  await db.equipmentModel.update({ where: { id }, data: { isActive: !m.isActive } });
  revalidatePath("/admin/models");
  return { ok: m.isActive ? "無効にしました" : "有効にしました" };
}

/* ---------- 報告事項マスタ（K-6） ---------- */

const noteSchema = z.object({ body: z.string().trim().min(1, "報告事項を入力してください").max(1000) });

export async function saveNote(_prev: MasterState, fd: FormData): Promise<MasterState> {
  await requireAdmin();
  const id = fd.get("id") ? Number(fd.get("id")) : null;
  const parsed = noteSchema.safeParse({ body: fd.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { body } = parsed.data;
  if (id) await db.noteTemplate.update({ where: { id }, data: { body } });
  else {
    const max = await db.noteTemplate.aggregate({ _max: { sortOrder: true } });
    await db.noteTemplate.create({ data: { body, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  }

  revalidatePath("/admin/notes");
  return { ok: id ? "更新しました" : "登録しました" };
}

export async function toggleNote(_prev: MasterState, fd: FormData): Promise<MasterState> {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const n = await db.noteTemplate.findUnique({ where: { id } });
  if (!n) return { error: "対象が見つかりません" };
  await db.noteTemplate.update({ where: { id }, data: { isActive: !n.isActive } });
  revalidatePath("/admin/notes");
  return { ok: n.isActive ? "無効にしました" : "有効にしました" };
}
