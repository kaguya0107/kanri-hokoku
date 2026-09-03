import "server-only";
import type { Browser } from "playwright-core";

/**
 * 帳票のPDF化（A-1）。
 *
 * 指定サーバ（さくらのレンタルサーバ）ではExcel→PDF変換が動かせないため、
 * 帳票をHTML/CSSで組み、Chromiumで印刷してPDFにする。
 * レイアウトはブラウザの表示と完全に一致する。
 */
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const { chromium } = await import("playwright-core");
      const launched = await chromium.launch({
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
      });
      launched.on("disconnected", () => { browserPromise = null; });
      return launched;
    })().catch((e) => { browserPromise = null; throw e; });
  }
  return browserPromise;
}

export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    // フォントの読み込み完了を待つ（待たないと日本語が置き換わることがある）
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await context.close();
  }
}

export function pdfFilename(hospital: string, date: string, kind: "報告書" | "社内用報告書"): string {
  // ファイル名に使えない文字と空白を除く
  const safe = hospital.replace(/[\\/:*?"<>|\s]/g, "_").slice(0, 40);
  return `作業完了${kind}_${safe}_${date.replace(/-/g, "")}.pdf`;
}
