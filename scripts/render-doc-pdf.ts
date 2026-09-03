/** 実装報告書HTMLを、A4のPDFとして書き出す */
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

async function main() {
  const html = readFileSync("docs/implementation-report.html", "utf-8");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--font-render-hinting=none"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  // section全体を1ページに収めようとすると空白ばかりのページができるため、
  // 見出しと図表それぞれの単位で改ページを制御する。
  await page.addStyleTag({
    content: `
      @page { size: A4; margin: 0; }
      html, body { background: #fff; }
      body { font-size: 12.5px; line-height: 1.6; }
      .wrap { max-width: none; padding: 0 4mm 6mm; }
      .mast { padding-top: 2mm; margin-bottom: 20px; }
      .tiles { margin-bottom: 26px; }

      section { display: block; margin-bottom: 30px; }
      .rail {
        position: static; display: flex; flex-direction: row; align-items: baseline;
        gap: 8px; border-top: none; padding-top: 0; margin-bottom: 4px;
      }
      .body { border-top: 2px solid var(--ink); padding-top: 8px; }
      .body > h2 { break-after: avoid; }

      figure, .tw, .note { break-inside: avoid; margin-bottom: 14px; }
      .figrow { display: block; }
      .figrow figure { display: inline-block; width: 47%; margin-right: 2%; vertical-align: top; }
      h2, h1 { break-after: avoid; }
      p { orphans: 3; widows: 3; }
    `,
  });
  await page.waitForTimeout(300);

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", right: "13mm", bottom: "16mm", left: "13mm" },
    displayHeaderFooter: true,
    footerTemplate: `<div style="font-size:8px;width:100%;text-align:center;color:#888;font-family:sans-serif;">
      作業完了報告書SYSTEM 実装報告　<span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>`,
    headerTemplate: `<div></div>`,
  });

  writeFileSync("docs/implementation-report.pdf", pdf);
  console.log(`written ${(pdf.length / 1024).toFixed(0)} KB`);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
