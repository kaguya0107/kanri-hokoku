import "server-only";
import { db } from "@/lib/db";
import { toISODate } from "@/lib/format";

/** ウィザード各ステップで共通して使う選択肢 */
export async function loadMasters(accountId: string) {
  const [workers, hospitals, models, noteTemplates, ownNotes, confirmItems] = await Promise.all([
    db.worker.findMany({ where: { accountId, isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.hospital.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.equipmentModel.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.noteTemplate.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.reportNoteTemplate.findMany({ where: { accountId }, orderBy: { id: "asc" } }),
    db.confirmItem.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return {
    workerNames: workers.map((w) => w.name),
    hospitalNames: hospitals.map((h) => h.name),
    modelNames: models.map((m) => m.name),
    // 管理者配布の共通定型文と、自社で追加した分の2階層（B-16）
    notes: [
      ...noteTemplates.map((n) => ({ body: n.body, own: false })),
      ...ownNotes.map((n) => ({ body: n.body, own: true })),
    ],
    confirmItems,
  };
}

export async function loadReport(id: string, accountId: string) {
  return db.report.findFirst({
    where: { id, accountId },
    include: {
      workItems: { orderBy: { sortOrder: "asc" } },
      partItems: { orderBy: { sortOrder: "asc" } },
      measurements: { orderBy: { sortOrder: "asc" } },
      internal: true,
    },
  });
}

export function toBasicDefaults(r: Awaited<ReturnType<typeof loadReport>>) {
  if (!r) return null;
  return {
    id: r.id,
    createdDate: toISODate(r.createdDate),
    hospitalName: r.hospitalName,
    workDateFrom: toISODate(r.workDateFrom),
    workDateTo: toISODate(r.workDateTo),
    workPlace: r.workPlace,
    workerNames: r.workerNames,
    workTitle: r.workTitle,
  };
}
