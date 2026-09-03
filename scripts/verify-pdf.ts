/** A-1 の確認：Excel変換なしでHTML/CSSからPDFを生成し、日本語が正しく出るか */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { customerReportHtml, internalReportHtml } from "../src/lib/report-html";
import { renderPdf } from "../src/lib/pdf";

const db = new PrismaClient();

async function main() {
  const account = await db.account.findUniqueOrThrow({ where: { accountId: "ABC000" } });
  const hospital = await db.hospital.findFirstOrThrow();
  const parts = await db.part.findMany({ take: 6, orderBy: { code: "asc" } });

  const report = await db.report.create({
    data: {
      uuid: crypto.randomUUID(), accountId: account.id, hospitalId: hospital.id,
      hospitalName: hospital.name, createdDate: new Date("2026-09-03"),
      workDateFrom: new Date("2026-09-01"), workDateTo: new Date("2026-09-03"),
      workPlace: "4階 中央無菌室", workTitle: "無菌病室(MIU-201)×3台 保守点検作業",
      workerNames: ["鈴木太郎", "加藤次郎"],
      freeWorkNote: "以上、保守点検作業一式",
      reportBody:
        "水フィルター等、消耗部品は交換いたしました。\n" +
        "BCR3シャワーパンのゆるみ、BCR5、入口扉の動きは修正し動作良好です。その他、特に問題ありません。\n" +
        "室内清浄度はFDS209Dにてクラス100、および150にてクラス5をクリアーし良好です。",
      signerName: "鈴木太郎", status: "SUBMITTED", reportNo: 1001,
      workItems: { create: [
        { modelName: "無菌病室 MIU-201", quantity: 3, sortOrder: 0 },
        { modelName: "無菌病室 MIU-401", quantity: 2, sortOrder: 1 },
      ]},
      partItems: { create: parts.map((p, i) => ({
        partId: p.id, partCode: p.code, partName: p.name, unit: p.unit, quantity: i + 1, sortOrder: i,
      }))},
      measurements: { create: [
        { roomName: "無菌病室A", modelName: "無菌病室 MIU-201", runningHours: 12480, serialNo: "A20481", manufacturedYm: "2019-04", sortOrder: 0 },
        { roomName: "無菌病室B", modelName: "無菌病室 MIU-201", runningHours: 11930, serialNo: "A20482", manufacturedYm: "2019-04", sortOrder: 1 },
        { roomName: "処置室",   modelName: "無菌病室 MIU-401", runningHours: 8260,  serialNo: "B10774", manufacturedYm: "2021-09", sortOrder: 2 },
      ]},
      internal: { create: {
        remainingWork: "3階west側の風速調整は部材入荷待ちのため次回対応。",
        salesApproach: "来期の更新工事について施設課より打診あり。9月中に見積提示予定。",
        remarks: "入館証は警備室にて受取。次回も同手順。",
        workTimes: { create: [
          { workDate: new Date("2026-09-01"), goStart: "08:10", goEnd: "09:40", workStart: "09:50", workEnd: "17:30", backStart: "17:45", backEnd: "19:10", sortOrder: 0 },
          { workDate: new Date("2026-09-02"), goStart: "08:00", goEnd: "09:20", workStart: "09:30", workEnd: "22:00", backStart: "22:15", backEnd: "01:30", sortOrder: 1 },
        ]},
      }},
    },
    include: {
      workItems: true, partItems: true, measurements: true,
      internal: { include: { reorderItems: true, workTimes: true } },
    },
  });

  const t0 = Date.now();
  const customer = await renderPdf(customerReportHtml(report));
  const t1 = Date.now();
  const internal = await renderPdf(internalReportHtml({ ...report, internal: report.internal! }));
  const t2 = Date.now();

  const dir = "/tmp/claude-1000/-home-blast-Working-demo/521672ab-09df-46cb-a427-ae409880c835/scratchpad";
  writeFileSync(`${dir}/customer.pdf`, customer);
  writeFileSync(`${dir}/internal.pdf`, internal);

  console.log(`客先提出用: ${(customer.length / 1024).toFixed(0)} KB / ${t1 - t0} ms`);
  console.log(`社内用    : ${(internal.length / 1024).toFixed(0)} KB / ${t2 - t1} ms`);
  console.log(`PDFヘッダ : ${customer.subarray(0, 5).toString()}`);

  await db.report.delete({ where: { id: report.id } });
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
