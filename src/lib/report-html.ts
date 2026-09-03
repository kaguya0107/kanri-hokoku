import { formatMinutes, jpDate, jpDateRange, minutesBetween } from "@/lib/format";

/** 差し込む値はすべてエスケープする（自由入力がそのままHTMLになるのを防ぐ） */
function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** 発注元の情報。実運用では管理者マスタから読み込む。 */
export const COMPANY = {
  name: "株式会社〇〇テック",
  address: "東京都〇〇区〇〇 1-2-3 〇〇ビル 5F",
  contact: "TEL 03-0000-0000　FAX 03-0000-0001",
};

/**
 * 帳票共通のスタイル。
 * A4縦・余白は帳票側で持ち、Chromium側の余白は0にしている。
 * 日本語は明朝（Noto Serif CJK JP）。帳票の慣習に合わせる。
 */
const BASE_CSS = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Noto Serif CJK JP", "Yu Mincho", "Hiragino Mincho ProN", serif;
    color: #000; background: #fff;
    font-size: 10.5pt; line-height: 1.5;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { width: 210mm; padding: 12mm 13mm; }
  /* 余白と高さの合算で空ページが出ないよう、最後の要素の余白を切る */
  .sheet > *:last-child { margin-bottom: 0; }
  .org { font-size: 7pt; color: #333; margin-bottom: 2mm; }
  h1 {
    text-align: center; font-size: 19pt; font-weight: 600;
    letter-spacing: 0.55em; text-indent: 0.55em; margin: 2mm 0 5mm;
  }
  .top { display: flex; justify-content: space-between; align-items: flex-end; gap: 8mm; margin-bottom: 3mm; }
  .hosp { flex: 1; font-size: 13pt; border-bottom: 0.4mm solid #000; padding: 0 6mm 1mm 1mm; }
  .date { font-size: 10pt; white-space: nowrap; }
  .co { text-align: right; margin-bottom: 4mm; }
  .co .nm { font-size: 12.5pt; font-weight: 600; letter-spacing: 0.2em; }
  .co .ad { font-size: 7pt; color: #222; line-height: 1.45; }
  table.hdr { width: 100%; border-collapse: collapse; font-size: 10pt; }
  table.hdr td { border: 0.3mm solid #000; padding: 1.4mm 2mm; vertical-align: top; }
  table.hdr td.lb {
    width: 24mm; white-space: nowrap; font-size: 9.5pt;
    text-align: justify; text-align-last: justify;
  }
  .split { display: flex; border: 0.3mm solid #000; border-top: 0; }
  .split .l { flex: 1; min-width: 0; border-right: 0.3mm solid #000; }
  .split .r { width: 74mm; flex: none; }
  .hd { border-bottom: 0.3mm solid #000; padding: 1mm 2mm; font-size: 9.5pt; text-align: center; }
  .bd { padding: 2mm; font-size: 10pt; white-space: pre-wrap; word-break: break-word; line-height: 1.7; }
  table.items { width: 100%; border-collapse: collapse; }
  table.items td { border-bottom: 0.2mm solid #ccc; padding: 0.8mm 1.5mm; font-size: 8.5pt; vertical-align: top; }
  table.items td.i { width: 6mm; color: #666; font-size: 7.5pt; text-align: right; }
  table.items td.q { width: 16mm; text-align: right; white-space: nowrap; }
  .block { border: 0.3mm solid #000; border-top: 0; }
  .block .rh { border-bottom: 0.2mm dotted #999; padding: 1mm 2mm; font-size: 9.5pt; }
  .block .rb { padding: 2mm; font-size: 10pt; white-space: pre-wrap; word-break: break-word; line-height: 1.75; }
  .foot { border: 0.3mm solid #000; border-top: 0; padding: 2mm; display: flex; align-items: flex-end; gap: 5mm; }
  .foot .fx { font-size: 9.5pt; align-self: flex-start; }
  .foot .sg { margin-left: auto; display: flex; align-items: flex-end; gap: 2mm; }
  .foot .sg span { font-size: 9.5pt; }
  .foot .sg .ln {
    width: 42mm; height: 14mm; border-bottom: 0.3mm solid #000;
    display: flex; align-items: flex-end; justify-content: center; overflow: hidden;
  }
  .foot .sg .ln img { max-height: 14mm; max-width: 100%; }
  .foot .sg .tx { width: 28mm; border-bottom: 0.3mm solid #000; text-align: center; font-size: 11pt; }
  .meas { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  .meas th { border-bottom: 0.2mm solid #999; padding: 0.8mm 1.5mm; font-weight: 600; text-align: left; white-space: nowrap; }
  .meas td { border-bottom: 0.2mm solid #ddd; padding: 0.8mm 1.5mm; }
  .meas td.n { text-align: right; white-space: nowrap; }
`;

type ReportData = {
  hospitalName: string;
  createdDate: Date;
  workDateFrom: Date;
  workDateTo: Date | null;
  workPlace: string;
  workTitle: string;
  workerNames: string[];
  freeWorkNote: string;
  partsFreeNote: string;
  reportBody: string;
  signerName: string;
  signatureData: string | null;
  workItems: { modelName: string; quantity: number }[];
  partItems: { partName: string; unit: string; quantity: number }[];
  measurements: {
    roomName: string; modelName: string;
    runningHours: number | null; serialNo: string; manufacturedYm: string;
  }[];
};

function shell(inner: string): string {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>${inner}</body></html>`;
}

function header(d: { hospitalName: string; createdDate: Date; workDateFrom: Date; workDateTo: Date | null; workPlace: string; workerNames: string[]; workTitle: string }, org: string) {
  return `
    <div class="org">${esc(org)}</div>
    <h1>作業完了報告書</h1>
    <div class="top">
      <div class="hosp">${esc(d.hospitalName)}　御中</div>
      <div class="date">${esc(jpDate(d.createdDate, false))}</div>
    </div>
    <div class="co">
      <div class="nm">${esc(COMPANY.name)}</div>
      <div class="ad">${esc(COMPANY.address)}<br>${esc(COMPANY.contact)}</div>
    </div>
    <table class="hdr">
      <tr><td class="lb">作業日</td><td>${esc(jpDateRange(d.workDateFrom, d.workDateTo))}</td></tr>
      <tr><td class="lb">作業場所</td><td>${esc(d.workPlace)}</td></tr>
      <tr><td class="lb">作業者</td><td>${esc(d.workerNames.join("、"))}</td></tr>
      <tr><td class="lb">作業件名</td><td>${esc(d.workTitle)}</td></tr>
    </table>`;
}

/** 客先提出用（2-8） */
export function customerReportHtml(d: ReportData): string {
  const work = [
    ...d.workItems.filter((w) => w.quantity > 0).map((w) => `・${w.modelName} ×${w.quantity}台`),
    ...(d.freeWorkNote ? [d.freeWorkNote] : []),
  ].join("\n");

  // 概要書の指摘どおり明細が多いと溢れるため、最低12行を確保しつつ行数に応じて詰める
  const rows = d.partItems.map(
    (p) => `<tr><td class="i"></td><td>${esc(p.partName)}</td><td class="q">${p.quantity}${esc(p.unit)}</td></tr>`,
  );
  while (rows.length < 12) rows.push(`<tr><td class="i"></td><td>&nbsp;</td><td class="q"></td></tr>`);

  const meas = d.measurements.length
    ? `<table class="meas">
        <tr><th>部屋名</th><th>型式</th><th>積算時間</th><th>製造No.</th><th>製造年月</th></tr>
        ${d.measurements.map((m) => `<tr>
          <td>${esc(m.roomName)}</td><td>${esc(m.modelName)}</td>
          <td class="n">${m.runningHours === null ? "" : `${m.runningHours.toLocaleString()}h`}</td>
          <td>${esc(m.serialNo)}</td><td>${esc(m.manufacturedYm.replace("-", "/"))}</td>
        </tr>`).join("")}
      </table>`
    : "";

  return shell(`<div class="sheet">
    ${header(d, "(原本 社内用1)")}
    <div class="split">
      <div class="l"><div class="hd">作 業 内 容</div><div class="bd">${esc(work)}</div></div>
      <div class="r"><div class="hd">交 換 部 品 名 ／ 数 量</div><table class="items">${rows.join("")}</table></div>
    </div>
    ${d.partsFreeNote ? `<div class="block"><div class="rh">交換部品 補足</div><div class="rb">${esc(d.partsFreeNote)}</div></div>` : ""}
    ${meas ? `<div class="block"><div class="rh">測 定 値</div><div class="rb">${meas}</div></div>` : ""}
    <div class="block"><div class="rh">報 告 事 項</div><div class="rb">${esc(d.reportBody)}</div></div>
    <div class="foot">
      <span class="fx">上記の内容を検収致します。</span>
      <span class="sg">
        <span>サイン</span>
        <span class="ln">${d.signatureData ? `<img src="${esc(d.signatureData)}" alt="">` : ""}</span>
        <span>担当</span>
        <span class="tx">${esc(d.signerName)}</span>
      </span>
    </div>
  </div>`);
}

type InternalData = ReportData & {
  internal: {
    remainingWork: string; salesApproach: string; remarks: string;
    reorderItems: { partName: string; unit: string; quantity: number }[];
    workTimes: {
      workDate: Date; goStart: string; goEnd: string;
      workStart: string; workEnd: string; backStart: string; backEnd: string;
    }[];
  };
};

/** 社内用（4-7） */
export function internalReportHtml(d: InternalData): string {
  const rows = d.internal.reorderItems.map(
    (p, i) => `<tr><td class="i">${i + 1}</td><td>${esc(p.partName)}</td><td class="q">${p.quantity}${esc(p.unit)}</td></tr>`,
  );
  while (rows.length < 10) rows.push(`<tr><td class="i">${rows.length + 1}</td><td>&nbsp;</td><td class="q"></td></tr>`);

  let travel = 0;
  let work = 0;
  const times = d.internal.workTimes.map((t) => {
    const go = minutesBetween(t.goStart, t.goEnd);
    const wk = minutesBetween(t.workStart, t.workEnd);
    const bk = minutesBetween(t.backStart, t.backEnd);
    travel += go + bk;
    work += wk;
    return `${jpDate(t.workDate)}
　I 往　${t.goStart} 〜 ${t.goEnd}
　S 作業　${t.workStart} 〜 ${t.workEnd}
　I 復　${t.backStart} 〜 ${t.backEnd}`;
  }).join("\n\n");

  const timesBlock = times
    ? `${times}\n\n合計　移動 ${formatMinutes(travel)}　作業 ${formatMinutes(work)}`
    : "";

  return shell(`<div class="sheet">
    ${header(d, "(社内用)")}
    <div class="split">
      <div class="l"><div class="hd">今回作業時の残作業</div><div class="bd">${esc(d.internal.remainingWork)}</div></div>
      <div class="r"><div class="hd">再手配の必要な部材 ／ 数量</div><table class="items">${rows.join("")}</table></div>
    </div>
    <div class="split">
      <div class="l"><div class="hd">移動及び作業時間の推移</div><div class="bd" style="font-size:9pt">${esc(timesBlock)}</div></div>
      <div class="r"><div class="hd">客先への営業アプローチ</div><div class="bd">${esc(d.internal.salesApproach)}</div></div>
    </div>
    <div class="block"><div class="rh">備考（社内への報告事項等）</div><div class="rb">${esc(d.internal.remarks)}</div></div>
  </div>`);
}
