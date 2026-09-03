"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  basicInfoSchema,
  measurementsSchema,
  partItemsSchema,
  signOffSchema,
  workItemsSchema,
} from "@/lib/report-schema";
import { getUserSession } from "@/lib/session";

async function requireUser() {
  const s = await getUserSession();
  if (!s) redirect("/login");
  return s;
}

/** 会社スコープ外の報告書に触れないようにする */
async function ownedReport(id: string, accountId: string) {
  const r = await db.report.findFirst({ where: { id, accountId } });
  if (!r) redirect("/reports");
  return r;
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

/**
 * 新規作成（2-1）。
 * A-4: uuid は端末側で採番し、サーバは uuid で upsert する。
 * 通信が不安定で同じ内容が二重に届いても1件にまとまる。
 */
export async function createReport(_prev: StepState, fd: FormData): Promise<StepState> {
  const session = await requireUser();

  const parsed = basicInfoSchema.safeParse({
    createdDate: fd.get("createdDate"),
    hospitalName: fd.get("hospitalName"),
    workDateFrom: fd.get("workDateFrom"),
    workDateTo: fd.get("workDateTo") ?? "",
    workPlace: fd.get("workPlace"),
    workerNames: fd.getAll("workerNames").map(String).filter(Boolean),
    workTitle: fd.get("workTitle"),
  });
  if (!parsed.success) return zodErrors(parsed.error);
  const v = parsed.data;

  const uuid = String(fd.get("uuid") || crypto.randomUUID());

  // 病院マスタに無ければ登録しておく（B-02: 表記ゆれを抑える）
  const hospital = await db.hospital.upsert({
    where: { name: v.hospitalName },
    create: { name: v.hospitalName },
    update: {},
  });

  const report = await db.report.upsert({
    where: { uuid },
    create: {
      uuid,
      accountId: session.accountId,
      hospitalId: hospital.id,
      hospitalName: v.hospitalName,
      createdDate: new Date(v.createdDate),
      workDateFrom: new Date(v.workDateFrom),
      workDateTo: v.workDateTo ? new Date(v.workDateTo) : null,
      workPlace: v.workPlace,
      workTitle: v.workTitle,
      workerNames: v.workerNames,
    },
    update: {
      hospitalId: hospital.id,
      hospitalName: v.hospitalName,
      createdDate: new Date(v.createdDate),
      workDateFrom: new Date(v.workDateFrom),
      workDateTo: v.workDateTo ? new Date(v.workDateTo) : null,
      workPlace: v.workPlace,
      workTitle: v.workTitle,
      workerNames: v.workerNames,
      version: { increment: 1 },
    },
  });

  revalidatePath("/reports");
  redirect(`/reports/${report.id}/work`);
}

export async function saveBasicInfo(_prev: StepState, fd: FormData): Promise<StepState> {
  const session = await requireUser();
  const id = String(fd.get("id"));
  await ownedReport(id, session.accountId);

  const parsed = basicInfoSchema.safeParse({
    createdDate: fd.get("createdDate"),
    hospitalName: fd.get("hospitalName"),
    workDateFrom: fd.get("workDateFrom"),
    workDateTo: fd.get("workDateTo") ?? "",
    workPlace: fd.get("workPlace"),
    workerNames: fd.getAll("workerNames").map(String).filter(Boolean),
    workTitle: fd.get("workTitle"),
  });
  if (!parsed.success) return zodErrors(parsed.error);
  const v = parsed.data;

  const hospital = await db.hospital.upsert({
    where: { name: v.hospitalName },
    create: { name: v.hospitalName },
    update: {},
  });

  await db.report.update({
    where: { id },
    data: {
      hospitalId: hospital.id,
      hospitalName: v.hospitalName,
      createdDate: new Date(v.createdDate),
      workDateFrom: new Date(v.workDateFrom),
      workDateTo: v.workDateTo ? new Date(v.workDateTo) : null,
      workPlace: v.workPlace,
      workTitle: v.workTitle,
      workerNames: v.workerNames,
      version: { increment: 1 },
    },
  });

  redirect(`/reports/${id}/work`);
}

/** 作業内容（2-2） */
export async function saveWorkItems(_prev: StepState, fd: FormData): Promise<StepState> {
  const session = await requireUser();
  const id = String(fd.get("id"));
  await ownedReport(id, session.accountId);

  const names = fd.getAll("modelName").map(String);
  const qtys = fd.getAll("quantity").map(String);
  const parsed = workItemsSchema.safeParse({
    items: names.map((modelName, i) => ({ modelName, quantity: qtys[i] ?? 0 })),
    freeWorkNote: fd.get("freeWorkNote") ?? "",
  });
  if (!parsed.success) return zodErrors(parsed.error);

  await db.$transaction([
    db.reportWorkItem.deleteMany({ where: { reportId: id } }),
    db.reportWorkItem.createMany({
      data: parsed.data.items.map((it, i) => ({
        reportId: id,
        modelName: it.modelName,
        quantity: it.quantity,
        sortOrder: i,
      })),
    }),
    db.report.update({
      where: { id },
      data: { freeWorkNote: parsed.data.freeWorkNote, version: { increment: 1 } },
    }),
  ]);

  redirect(`/reports/${id}/parts`);
}

/** 交換部品（2-3）。B-23: 名称・単位をスナップショットで保存する。 */
export async function savePartItems(_prev: StepState, fd: FormData): Promise<StepState> {
  const session = await requireUser();
  const id = String(fd.get("id"));
  await ownedReport(id, session.accountId);

  const ids = fd.getAll("partId").map(String);
  const qtys = fd.getAll("quantity").map(String);
  const parsed = partItemsSchema.safeParse({
    items: ids.map((partId, i) => ({ partId, quantity: qtys[i] ?? 1 })),
    partsFreeNote: fd.get("partsFreeNote") ?? "",
  });
  if (!parsed.success) return zodErrors(parsed.error);

  const parts = await db.part.findMany({
    where: { id: { in: parsed.data.items.map((i) => i.partId) } },
  });
  const byId = new Map(parts.map((p) => [p.id, p]));

  await db.$transaction([
    db.reportPartItem.deleteMany({ where: { reportId: id } }),
    db.reportPartItem.createMany({
      data: parsed.data.items.flatMap((it, i) => {
        const p = byId.get(it.partId);
        if (!p) return [];
        return [{
          reportId: id,
          partId: p.id,
          partCode: p.code,
          partName: p.name,   // スナップショット
          unit: p.unit,       // スナップショット
          quantity: it.quantity,
          sortOrder: i,
        }];
      }),
    }),
    db.report.update({
      where: { id },
      data: { partsFreeNote: parsed.data.partsFreeNote, version: { increment: 1 } },
    }),
  ]);

  redirect(`/reports/${id}/measurements`);
}

/** 測定値・報告事項（2-4）。B-07: 行数は可変。 */
export async function saveMeasurements(_prev: StepState, fd: FormData): Promise<StepState> {
  const session = await requireUser();
  const id = String(fd.get("id"));
  await ownedReport(id, session.accountId);

  const rooms = fd.getAll("roomName").map(String);
  const rows = rooms.map((_, i) => ({
    roomName: rooms[i],
    modelName: String(fd.getAll("measModelName")[i] ?? ""),
    runningHours: String(fd.getAll("runningHours")[i] ?? ""),
    serialNo: String(fd.getAll("serialNo")[i] ?? ""),
    manufacturedYm: String(fd.getAll("manufacturedYm")[i] ?? ""),
  }));

  const parsed = measurementsSchema.safeParse({
    rows,
    reportBody: fd.get("reportBody") ?? "",
  });
  if (!parsed.success) return zodErrors(parsed.error);

  // 全項目が空の行は保存しない
  const filled = parsed.data.rows.filter(
    (r) => r.roomName || r.modelName || r.serialNo || r.manufacturedYm || (r.runningHours !== "" && r.runningHours !== undefined),
  );

  await db.$transaction([
    db.reportMeasurement.deleteMany({ where: { reportId: id } }),
    db.reportMeasurement.createMany({
      data: filled.map((r, i) => ({
        reportId: id,
        roomName: r.roomName,
        modelName: r.modelName,
        runningHours: r.runningHours === "" || r.runningHours === undefined ? null : Number(r.runningHours),
        serialNo: r.serialNo,
        manufacturedYm: r.manufacturedYm,
        sortOrder: i,
      })),
    }),
    db.report.update({
      where: { id },
      data: { reportBody: parsed.data.reportBody, version: { increment: 1 } },
    }),
  ]);

  redirect(`/reports/${id}/signoff`);
}

/**
 * 確認・署名（2-5）。
 * 概要書は「つぎへ」で全情報をDBに登録するとしているが、それでは通信断で入力が失われるため
 * 各ステップで保存済みとし、ここではステータスを提出済に変えるだけにしている（B-06）。
 */
export async function submitReport(_prev: StepState, fd: FormData): Promise<StepState> {
  const session = await requireUser();
  const id = String(fd.get("id"));
  await ownedReport(id, session.accountId);

  const parsed = signOffSchema.safeParse({
    checkedItems: fd.getAll("checkedItems").map(String),
    signerName: fd.get("signerName"),
    signatureData: fd.get("signatureData") ?? "",
  });
  if (!parsed.success) return zodErrors(parsed.error);

  const required = await db.confirmItem.count({ where: { isActive: true } });
  if (parsed.data.checkedItems.length < required) {
    return { error: `確認事項${required}件すべてにチェックを入れてください` };
  }

  const sig = parsed.data.signatureData;
  if (sig && !sig.startsWith("data:image/png;base64,")) {
    return { error: "署名データの形式が正しくありません" };
  }

  // 帳票No.はサーバ側で採番する（A-4）
  const report = await db.report.findUniqueOrThrow({ where: { id } });
  await db.$transaction(async (tx) => {
    let no = report.reportNo;
    if (no === null) {
      const counter = await tx.reportCounter.update({
        where: { id: 1 },
        data: { lastNo: { increment: 1 } },
      });
      no = counter.lastNo;
    }
    await tx.report.update({
      where: { id },
      data: {
        checkedItems: parsed.data.checkedItems,
        signerName: parsed.data.signerName,
        signatureData: sig || null,
        status: report.status === "DRAFT" ? "SUBMITTED" : report.status,
        submittedAt: report.submittedAt ?? new Date(),
        reportNo: no,
        version: { increment: 1 },
      },
    });
  });

  revalidatePath("/reports");
  redirect(`/reports/${id}/done`);
}

/** 一覧からの複製（B-03）。署名・PDF・メール履歴は引き継がない。 */
export async function duplicateReport(fd: FormData) {
  const session = await requireUser();
  const id = String(fd.get("id"));
  const src = await db.report.findFirst({
    where: { id, accountId: session.accountId },
    include: { workItems: true, partItems: true, measurements: true },
  });
  if (!src) redirect("/reports");

  const today = new Date();
  const copy = await db.report.create({
    data: {
      uuid: crypto.randomUUID(),
      accountId: session.accountId,
      hospitalId: src.hospitalId,
      hospitalName: src.hospitalName,
      createdDate: today,
      workDateFrom: today,
      workDateTo: null,
      workPlace: src.workPlace,
      workTitle: src.workTitle,
      workerNames: src.workerNames,
      freeWorkNote: src.freeWorkNote,
      partsFreeNote: src.partsFreeNote,
      reportBody: src.reportBody,
      // 引き継がない: checkedItems / signerName / signatureData / reportNo / status
      workItems: {
        create: src.workItems.map((w) => ({
          modelName: w.modelName, quantity: w.quantity, sortOrder: w.sortOrder,
        })),
      },
      partItems: {
        create: src.partItems.map((p) => ({
          partId: p.partId, partCode: p.partCode, partName: p.partName,
          unit: p.unit, quantity: p.quantity, sortOrder: p.sortOrder,
        })),
      },
      measurements: {
        create: src.measurements.map((m) => ({
          roomName: m.roomName, modelName: m.modelName, runningHours: m.runningHours,
          serialNo: m.serialNo, manufacturedYm: m.manufacturedYm, sortOrder: m.sortOrder,
        })),
      },
    },
  });

  revalidatePath("/reports");
  redirect(`/reports/${copy.id}/basic`);
}

export async function deleteDraft(fd: FormData) {
  const session = await requireUser();
  const id = String(fd.get("id"));
  const r = await db.report.findFirst({ where: { id, accountId: session.accountId } });
  if (r && r.status === "DRAFT") await db.report.delete({ where: { id } });
  revalidatePath("/reports");
  redirect("/reports");
}
