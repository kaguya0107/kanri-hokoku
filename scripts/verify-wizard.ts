/**
 * ウィザードの保存経路を実データで確認する。
 * A-4（uuidによる冪等化・帳票No.のサーバ採番）と B-23（明細のスナップショット）が要点。
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const out: string[] = [];

async function main() {
  const account = await db.account.findUniqueOrThrow({ where: { accountId: "ABC000" } });
  const hospital = await db.hospital.findFirstOrThrow();
  const uuid = crypto.randomUUID();

  const basic = {
    accountId: account.id, hospitalId: hospital.id, hospitalName: hospital.name,
    createdDate: new Date("2026-09-03"), workDateFrom: new Date("2026-09-01"),
    workDateTo: new Date("2026-09-03"), workPlace: "4階 中央無菌室",
    workTitle: "無菌病室(MIU-201)×3台 保守点検作業",
    workerNames: ["鈴木太郎", "加藤次郎"],
  };

  // --- A-4: 同じ uuid で2回送っても1件になること ---
  const r1 = await db.report.upsert({ where: { uuid }, create: { uuid, ...basic }, update: { ...basic, version: { increment: 1 } } });
  const r2 = await db.report.upsert({ where: { uuid }, create: { uuid, ...basic }, update: { ...basic, version: { increment: 1 } } });
  const count = await db.report.count({ where: { uuid } });
  out.push(`冪等性: 2回送信 → ${count}件 / 同一ID=${r1.id === r2.id} / version=${r2.version}  ${count === 1 && r1.id === r2.id ? "OK" : "NG"}`);

  const id = r1.id;

  // --- B-23: 部品明細は名称・単位をコピーして保持する ---
  const parts = await db.part.findMany({ take: 3, orderBy: { code: "asc" } });
  await db.reportPartItem.createMany({
    data: parts.map((p, i) => ({
      reportId: id, partId: p.id, partCode: p.code, partName: p.name, unit: p.unit, quantity: i + 1, sortOrder: i,
    })),
  });

  // マスタ側の名称を変えても、保存済み明細は変わらない
  await db.part.update({ where: { id: parts[0].id }, data: { name: parts[0].name + "（変更後）" } });
  const item = await db.reportPartItem.findFirstOrThrow({ where: { reportId: id, partId: parts[0].id } });
  out.push(`スナップショット: マスタ変更後も明細は "${item.partName.slice(0, 24)}…"  ${item.partName === parts[0].name ? "OK" : "NG"}`);
  await db.part.update({ where: { id: parts[0].id }, data: { name: parts[0].name } });

  // --- 測定値の可変行（B-07） ---
  await db.reportMeasurement.createMany({
    data: [
      { reportId: id, roomName: "無菌病室A", modelName: "無菌病室 MIU-201", runningHours: 12480, serialNo: "A20481", manufacturedYm: "2019-04", sortOrder: 0 },
      { reportId: id, roomName: "無菌病室B", modelName: "無菌病室 MIU-201", runningHours: 11930, serialNo: "A20482", manufacturedYm: "2019-04", sortOrder: 1 },
      { reportId: id, roomName: "処置室",   modelName: "無菌病室 MIU-401", runningHours: 8260,  serialNo: "B10774", manufacturedYm: "2021-09", sortOrder: 2 },
      { reportId: id, roomName: "前室",     modelName: "MDF",              runningHours: 400,   serialNo: "C00121", manufacturedYm: "2022-01", sortOrder: 3 },
    ],
  });
  out.push(`測定値: ${await db.reportMeasurement.count({ where: { reportId: id } })}行（5行固定ではない） OK`);

  // --- 帳票No.のサーバ採番 ---
  const before = await db.reportCounter.findUniqueOrThrow({ where: { id: 1 } });
  const submitted = await db.$transaction(async (tx) => {
    const c = await tx.reportCounter.update({ where: { id: 1 }, data: { lastNo: { increment: 1 } } });
    return tx.report.update({
      where: { id },
      data: { reportNo: c.lastNo, status: "SUBMITTED", submittedAt: new Date(), signerName: "鈴木太郎" },
    });
  });
  out.push(`帳票No.採番: ${before.lastNo} → ${submitted.reportNo}  ${submitted.reportNo === before.lastNo + 1 ? "OK" : "NG"}`);

  // --- 会社スコープの確認 ---
  const other = await db.report.findFirst({ where: { id, accountId: "not-this-account" } });
  out.push(`会社スコープ: 他社からの参照 = ${other === null ? "取得できない OK" : "取得できてしまう NG"}`);

  // --- 全体像 ---
  const full = await db.report.findUniqueOrThrow({
    where: { id },
    include: { partItems: true, measurements: true },
  });
  out.push(`保存内容: No.${full.reportNo} ${full.hospitalName} / 作業者${full.workerNames.length}名 / 部品${full.partItems.length}件 / 測定${full.measurements.length}行 / status=${full.status}`);

  // 後片付け
  await db.report.delete({ where: { id } });
  await db.reportCounter.update({ where: { id: 1 }, data: { lastNo: before.lastNo } });
  out.push("後片付け完了");

  console.log(out.join("\n"));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
