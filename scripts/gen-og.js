/**
 * Generates social preview assets from the site itself:
 *   - public/og.png        (1200×630 screenshot of the live hero)
 *   - app/apple-icon.png   (180×180 render of app/icon.svg)
 *
 * Run with the dev server up:  node scripts/gen-og.js [url]
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const url = process.argv[2] || "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();

  // 1) OG card: the hero console at exactly 1200×630
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(url, { timeout: 30000, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000); // let the 3D scene settle
  await page.screenshot({ path: path.join(root, "public", "og.png") });
  console.log("wrote public/og.png (1200×630)");

  // 2) Apple touch icon from the favicon SVG
  const svg = fs.readFileSync(path.join(root, "app", "icon.svg"), "utf8");
  const iconPage = await browser.newPage({ viewport: { width: 180, height: 180 } });
  await iconPage.setContent(
    `<body style="margin:0"><div style="width:180px;height:180px">${svg.replace(
      "<svg ",
      '<svg width="180" height="180" ',
    )}</div></body>`,
  );
  await iconPage.waitForTimeout(300);
  await iconPage.screenshot({ path: path.join(root, "app", "apple-icon.png"), omitBackground: true });
  console.log("wrote app/apple-icon.png (180×180)");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
