/** 顧客提示資料用のスクリーンショットを撮る。主要機能のみに絞る。 */
import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const db = new PrismaClient();
const BASE = "http://localhost:3000";
const OUT = "docs/screens";
/** 開発用オーバーレイを隠し、タブレット枠の外側余白を詰める */
const HIDE_DEV = `
  nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }
  body > div.min-h-dvh { padding-top: 0 !important; padding-bottom: 0 !important; }
`;

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-only-secret-change-in-production-0123456789abcdef");

async function main() {
  const account = await db.account.findUniqueOrThrow({ where: { accountId: "ABC000" } });
  const admin = await db.admin.findUniqueOrThrow({ where: { accountId: "admin" } });
  const report = await db.report.findFirstOrThrow({
    where: { reportNo: 1001 }, select: { id: true },
  });

  const sign = (p: Record<string, unknown>) =>
    new SignJWT(p).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(SECRET);

  const userJwt = await sign({ accountId: account.id, loginId: account.accountId, companyName: account.companyName });
  const adminJwt = await sign({ adminId: admin.id, loginId: admin.accountId });

  const browser = await chromium.launch({ args: ["--no-sandbox", "--font-render-hinting=none"] });

  // --- 現場用（タブレット 768×1024） ---
  const tablet = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    locale: "ja-JP",
  });
  await tablet.addCookies([{ name: "wcr_session", value: userJwt, url: BASE }]);

  const tabletShots: [string, string, number?][] = [
    ["01-login", "/login"],
    ["02-dashboard", "/dashboard"],
    ["03-basic", `/reports/${report.id}/basic`],
    ["04-parts", `/reports/${report.id}/parts`],
    ["05-measurements", `/reports/${report.id}/measurements`],
    ["06-signoff", `/reports/${report.id}/signoff`],
    ["07-list", "/reports"],
    ["08-times", `/reports/${report.id}/internal/times`],
  ];

  for (const [name, path] of tabletShots) {
    const page = await tablet.newPage();
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: HIDE_DEV });
    await page.evaluate(() => document.fonts.ready);

    // 部品検索は結果が出るまで待つ
    if (name === "04-parts") {
      await page.fill('input[aria-label="部品の検索"]', "フィルター");
      await page.waitForTimeout(900);
    }

    // <input type="month"> はヘッドレスChromiumのICUデータ次第で英語表記になるため、
    // 資料用の撮影では見た目だけ日本語の値に置き換えて撮る（実データ・実際の入力動作には影響しない）
    if (name === "05-measurements") {
      await page.evaluate(() => {
        document.querySelectorAll<HTMLInputElement>('input[type="month"]').forEach((el) => {
          const v = el.value; // YYYY-MM
          if (!v) return;
          const [y, m] = v.split("-");
          const span = document.createElement("div");
          span.textContent = `${y}年${Number(m)}月`;
          span.style.cssText = "width:118px;padding:9px 6px;font-size:13px;color:#141B17;display:flex;align-items:center;border:1px solid #9AA8A0;background:#fff;border-radius:2px;box-sizing:border-box;height:40px";
          el.replaceWith(span);
        });
      });
    }
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    await page.close();
    console.log(`  ${name}`);
  }

  // ログイン画面はCookieなしで撮る
  const anon = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, locale: "ja-JP" });
  const lp = await anon.newPage();
  await lp.goto(BASE + "/login", { waitUntil: "networkidle" });
  await lp.addStyleTag({ content: HIDE_DEV });
  await lp.evaluate(() => document.fonts.ready);
  await lp.screenshot({ path: `${OUT}/01-login.png` });
  await anon.close();

  // --- 管理者用（1600×900） ---
  const desktop = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 2,
    locale: "ja-JP",
  });
  await desktop.addCookies([{ name: "wcr_admin", value: adminJwt, url: BASE }]);

  const desktopShots: [string, string][] = [
    ["10-admin-dashboard", "/admin"],
    ["11-admin-users", "/admin/users"],
    ["12-admin-parts", "/admin/parts"],
  ];

  for (const [name, path] of desktopShots) {
    const page = await desktop.newPage();
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: HIDE_DEV });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    await page.close();
    console.log(`  ${name}`);
  }

  await browser.close();
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
