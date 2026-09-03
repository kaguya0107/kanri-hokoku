import "server-only";
import { db } from "@/lib/db";

/** 帳票生成に必要な一式をまとめて読む */
export async function loadForPdf(id: string, accountId: string) {
  return db.report.findFirst({
    where: { id, accountId },
    include: {
      workItems: { orderBy: { sortOrder: "asc" } },
      partItems: { orderBy: { sortOrder: "asc" } },
      measurements: { orderBy: { sortOrder: "asc" } },
      internal: {
        include: {
          reorderItems: { orderBy: { sortOrder: "asc" } },
          workTimes: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
}

export type PdfReport = NonNullable<Awaited<ReturnType<typeof loadForPdf>>>;
