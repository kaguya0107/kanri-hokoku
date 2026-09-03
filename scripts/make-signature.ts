/** 手書きサインらしい曲線をブラウザのcanvasで描き、PNGのdataURLとして書き出す */
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

async function main() {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 560; c.height = 200;
    const x = c.getContext("2d")!;
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = "#101614"; x.lineWidth = 4.5; x.lineCap = "round"; x.lineJoin = "round";

    // 「鈴木」に見える程度の連続した筆致
    const strokes: [number, number][][] = [
      [[70,120],[95,72],[120,120],[150,74],[176,124],[150,132],[104,130],[76,124]],
      [[92,150],[168,146]],
      [[210,66],[214,150]],
      [[186,96],[248,92]],
      [[214,110],[188,152]],
      [[214,110],[250,150]],
      [[300,70],[306,158]],
      [[272,104],[344,100]],
      [[306,120],[276,160]],
      [[306,120],[346,158]],
      [[386,74],[392,150]],
      [[364,108],[420,104]],
      [[392,124],[366,160]],
      [[392,124],[424,158]],
    ];
    for (const s of strokes) {
      x.beginPath();
      x.moveTo(s[0][0], s[0][1]);
      for (let i = 1; i < s.length; i++) {
        const [px, py] = s[i - 1];
        const [cx, cy] = s[i];
        x.quadraticCurveTo(px, py, (px + cx) / 2, (py + cy) / 2);
      }
      x.stroke();
    }
    return c.toDataURL("image/png");
  });
  await browser.close();
  writeFileSync("scripts/signature.txt", dataUrl);
  console.log(`signature dataURL: ${dataUrl.length} chars`);
}
main().catch((e) => { console.error(e); process.exit(1); });
