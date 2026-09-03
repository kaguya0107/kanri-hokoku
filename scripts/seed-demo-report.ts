/** 資料用スクリーンショットのため、実データの入った報告書を用意する */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const db = new PrismaClient();

async function main() {
  const account = await db.account.findUniqueOrThrow({ where: { accountId: "ABC000" } });
  await db.report.deleteMany({ where: { workTitle: { contains: "保守点検作業" } } });

  const hospital = await db.hospital.findFirstOrThrow({ where: { name: "〇〇市立総合病院" } });
  const parts = await db.part.findMany({
    where: { code: { in: ["A01-001", "E05-003", "L12-002", "N14-001"] } },
  });
  const confirms = await db.confirmItem.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });

  // 署名は実際に手書きした線に近い曲線をPNGで用意する
  const signature = readFileSync("scripts/signature.txt", "utf-8").trim();

  const report = await db.report.create({
    data: {
      uuid: crypto.randomUUID(),
      accountId: account.id,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      createdDate: new Date("2026-09-03"),
      workDateFrom: new Date("2026-09-01"),
      workDateTo: new Date("2026-09-02"),
      workPlace: "4階 中央無菌室",
      workTitle: "無菌病室(MIU-201)×3台 保守点検作業",
      workerNames: ["鈴木太郎", "加藤次郎"],
      freeWorkNote: "以上、保守点検作業一式",
      reportBody:
        "水フィルター等、消耗部品は交換いたしました。\n" +
        "BCR3シャワーパンのゆるみ、BCR5、入口扉の動きは修正し動作良好です。その他、特に問題ありません。\n" +
        "室内清浄度はFDS209Dにてクラス100、および150にてクラス5をクリアーし良好です。",
      signerName: "鈴木太郎",
      signatureData: signature,
      checkedItems: confirms.map((c) => c.id),
      status: "SUBMITTED",
      submittedAt: new Date(),
      reportNo: 1001,
      workItems: {
        create: [
          { modelName: "無菌病室 MIU-201", quantity: 3, sortOrder: 0 },
          { modelName: "無菌病室 MIU-401", quantity: 2, sortOrder: 1 },
        ],
      },
      partItems: {
        create: parts.map((p, i) => ({
          partId: p.id, partCode: p.code, partName: p.name,
          unit: p.unit, quantity: [9, 5, 3, 2][i] ?? 1, sortOrder: i,
        })),
      },
      measurements: {
        create: [
          { roomName: "無菌病室A", modelName: "無菌病室 MIU-201", runningHours: 12480, serialNo: "A20481", manufacturedYm: "2019-04", sortOrder: 0 },
          { roomName: "無菌病室B", modelName: "無菌病室 MIU-201", runningHours: 11930, serialNo: "A20482", manufacturedYm: "2019-04", sortOrder: 1 },
          { roomName: "処置室",   modelName: "無菌病室 MIU-401", runningHours: 8260,  serialNo: "B10774", manufacturedYm: "2021-09", sortOrder: 2 },
        ],
      },
      internal: {
        create: {
          remainingWork: "3階west側の風速調整は、部材入荷待ちのため次回作業時に実施予定。",
          salesApproach: "来期の更新工事について施設課ご担当より打診あり。9月中に見積提示予定。",
          remarks: "入館証の受取は警備室にて。次回も同様の手順で対応のこと。",
          workTimes: {
            create: [
              { workDate: new Date("2026-09-01"), goStart: "08:10", goEnd: "09:40", workStart: "09:50", workEnd: "17:30", backStart: "17:45", backEnd: "19:10", sortOrder: 0 },
              { workDate: new Date("2026-09-02"), goStart: "08:00", goEnd: "09:20", workStart: "09:30", workEnd: "22:00", backStart: "22:15", backEnd: "01:30", sortOrder: 1 },
            ],
          },
          reorderItems: {
            create: parts.slice(0, 2).map((p, i) => ({
              partId: p.id, partCode: p.code, partName: p.name, unit: p.unit, quantity: i + 1, sortOrder: i,
            })),
          },
        },
      },
    },
  });

  // 一覧に厚みを出すための過去分
  const others = [
    { no: 1000, hp: "△△病院 東病棟", from: "2026-08-21", to: "2026-08-21", st: "COMPLETED" as const, w: ["山田健一"] },
    { no: 999,  hp: "市立中央病院",   from: "2026-08-15", to: "2026-08-16", st: "COMPLETED" as const, w: ["大谷翔"] },
    { no: 998,  hp: "□□記念病院",    from: "2026-08-01", to: "2026-08-01", st: "INTERNAL" as const,  w: ["木村拓"] },
  ];
  for (const o of others) {
    const h = await db.hospital.upsert({ where: { name: o.hp }, create: { name: o.hp }, update: {} });
    await db.report.create({
      data: {
        uuid: crypto.randomUUID(), accountId: account.id, hospitalId: h.id, hospitalName: o.hp,
        createdDate: new Date(o.from), workDateFrom: new Date(o.from), workDateTo: new Date(o.to),
        workPlace: "設備機械室", workTitle: "定期 保守点検作業", workerNames: o.w,
        status: o.st, submittedAt: new Date(o.from), reportNo: o.no,
        signerName: o.w[0], signatureData: signature,
        internal: { create: { remainingWork: "特になし", salesApproach: "特になし", remarks: "特になし" } },
      },
    });
  }

  console.log(`demo report: ${report.id}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
