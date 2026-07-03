/**
 * Visits every project in projects.json with headless Chromium, captures a
 * real screenshot into public/projects/<id>.png, and records up/down status
 * in lib/site-status.json. Sites that are down are automatically hidden from
 * the globe (see lib/regions.ts).
 *
 *   node scripts/check-sites.js
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const allProjects = JSON.parse(fs.readFileSync(path.join(root, "projects.json"), "utf8"));
const outDir = path.join(root, "public", "projects");
fs.mkdirSync(outDir, { recursive: true });

// Optional domain filter: `node scripts/check-sites.js x1app.fyi` re-checks
// just the matching site(s); results merge into the existing status file.
const filter = process.argv[2];
const projects = filter
  ? allProjects.filter((p) => p.domain.includes(filter))
  : allProjects;

// Per-site quirks that run after load, before gate handling.
const SITE_ACTIONS = {
  // x1app.fyi shows a click-anywhere splash over the real page
  "x1app.fyi": async (page) => {
    await page.mouse.click(640, 400);
    await page.waitForTimeout(2500);
  },
};

// keep in sync with lib/regions.ts
const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Try to click a visible "agree / accept / continue / enter" style gate
// button. Exact-match patterns only, so we never hit "Continue with Google".
const GATE_PATTERNS = [
  /^agree\s*(and|&)\s*continue$/i,
  /^accept\s*(&|and)\s*continue$/i,
  /^i agree\b/i, // "I agree", "I AGREE — ENTER PLATFORM"
  /^agree$/i,
  /^accept all$/i,
  /^accept$/i,
  /^i understand\b/i,
  /^continue$/i,
  /^enter\b/i, // "Enter", "Enter XDEX", "Enter App"
  /^got it$/i,
  /^ok$/i,
];

/** Does the page still look gated (ToS/disclaimer modal showing)? */
async function looksGated(page) {
  return page
    .getByText(/disclaimer|terms of (service|use)|i have read/i)
    .first()
    .isVisible({ timeout: 300 })
    .catch(() => false);
}

/**
 * Last resort for stubborn gates: delete the modal/backdrop from the DOM
 * instead of agreeing to anything (some gates carry legal representations we
 * deliberately do NOT accept — we just want to see the page behind).
 */
async function stripOverlays(page) {
  return page
    .evaluate(() => {
      let removed = 0;
      const vw = innerWidth;
      const vh = innerHeight;
      for (const el of Array.from(document.querySelectorAll("body *"))) {
        const s = getComputedStyle(el);
        if (
          (s.position === "fixed" || s.position === "absolute") &&
          (parseInt(s.zIndex) || 0) >= 10
        ) {
          const r = el.getBoundingClientRect();
          if (r.width >= vw * 0.5 && r.height >= vh * 0.5) {
            el.remove();
            removed++;
          }
        }
      }
      document.documentElement.style.overflow = "visible";
      document.body.style.overflow = "visible";
      return removed;
    })
    .catch(() => 0);
}

async function clickGateButton(page) {
  for (const pattern of GATE_PATTERNS) {
    // getByRole normalizes whitespace in the accessible name — most reliable
    for (const btn of [
      page.getByRole("button", { name: pattern }).first(),
      page.locator('button, [role="button"], a').filter({ hasText: pattern }).first(),
    ]) {
      try {
        if (await btn.isVisible({ timeout: 300 })) {
          await btn.click({ timeout: 2500 });
          return true;
        }
      } catch {
        // not there / not clickable — try the next candidate
      }
    }
  }
  return false;
}

async function dismissGate(page) {
  let did = false;
  let ticked = 0;

  // Many gates disable their button until an "I agree" checkbox is ticked.
  // Real inputs first (force-click — they're often visually hidden)…
  try {
    const boxes = page.locator('input[type="checkbox"], [role="checkbox"]');
    const n = Math.min(await boxes.count(), 4);
    for (let i = 0; i < n; i++) {
      try {
        await boxes.nth(i).click({ timeout: 800, force: true });
        ticked++;
        did = true;
      } catch {
        // ignore — next box
      }
    }
  } catch {
    // no checkboxes — fine
  }

  // …then, ONLY if no real input existed, click the agree-label text
  // (clicking both would toggle the box back off).
  if (ticked === 0) {
    try {
      const label = page.getByText(/i have read|i agree|i understand/i).first();
      if (await label.isVisible({ timeout: 300 })) {
        await label.click({ timeout: 1000 });
        did = true;
      }
    } catch {
      // fine
    }
  }

  if (did) await page.waitForTimeout(700); // let the button enable

  if (await clickGateButton(page)) did = true;
  return did;
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
    ignoreHTTPSErrors: true,
  });
  // merge into prior results so filtered runs don't wipe other sites
  const statusPath = path.join(root, "lib", "site-status.json");
  let status = {};
  try {
    status = JSON.parse(fs.readFileSync(statusPath, "utf8"));
  } catch {
    // first run
  }

  for (const p of projects) {
    const id = slugify(`${p.project}-${p.domain}`);
    const url = p.domain.startsWith("http") ? p.domain : `https://${p.domain}`;
    const page = await ctx.newPage();
    let ok = false;
    let note = "";
    try {
      // slow sites get a second chance before being declared down
      let res = null;
      for (let attempt = 0; attempt < 2 && !res; attempt++) {
        try {
          res = await page.goto(url, { timeout: 25000, waitUntil: "domcontentloaded" });
        } catch (e) {
          if (attempt === 1) throw e;
        }
      }
      const code = res ? res.status() : 0;
      // give SPAs a moment to paint
      await page.waitForTimeout(3500);
      ok = code > 0 && code < 400;
      note = `HTTP ${code}`;
      if (ok) {
        // per-site quirk (e.g. click-through splash screens)
        if (SITE_ACTIONS[p.domain]) {
          await SITE_ACTIONS[p.domain](page);
          note += " +action";
        }
        // Click through disclaimer/consent gates so we capture the real site
        // (per repo owner's request). Second pass only if still gated.
        if (await looksGated(page)) {
          for (let pass = 0; pass < 2; pass++) {
            const clicked = await dismissGate(page);
            if (!clicked) break;
            note += " +gate";
            await page.waitForTimeout(2000);
            if (!(await looksGated(page))) break;
          }
          // still gated? strip the modal from the DOM — agree to nothing
          if (await looksGated(page)) {
            const n = await stripOverlays(page);
            if (n > 0) {
              note += " +strip";
              await page.waitForTimeout(800);
            }
          }
        }
        await page.screenshot({ path: path.join(outDir, `${id}.png`) });
      }
    } catch (err) {
      ok = false;
      note = String(err.message || err).split("\n")[0].slice(0, 120);
    }

    // scrape lightweight metadata: description + social links
    let meta = { description: "", twitter: "", telegram: "" };
    if (ok) {
      try {
        meta = await page.evaluate(() => {
          const pick = (sel) => document.querySelector(sel)?.getAttribute("content") || "";
          const description = (
            pick('meta[name="description"]') ||
            pick('meta[property="og:description"]') ||
            pick('meta[name="twitter:description"]')
          )
            .trim()
            .slice(0, 280);
          const links = [...document.querySelectorAll("a[href]")].map((a) => a.href);
          const twitter =
            links.find((h) => /^https?:\/\/(www\.)?(twitter|x)\.com\/[^/]+/i.test(h)) || "";
          const telegram = links.find((h) => /^https?:\/\/(www\.)?t\.me\//i.test(h)) || "";
          return { description, twitter, telegram };
        });
      } catch {
        // page navigated away or blocked evaluate — keep empty meta
      }
    }

    status[id] = {
      ok,
      note,
      domain: p.domain,
      project: p.project,
      ...meta,
      checkedAt: new Date().toISOString(),
    };
    console.log(`${ok ? "✅ UP  " : "❌ DOWN"}  ${p.project.padEnd(28)} ${p.domain.padEnd(30)} ${note}`);
    await page.close();
  }

  await browser.close();
  fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
  const checkedIds = projects.map((p) => slugify(`${p.project}-${p.domain}`));
  const down = checkedIds.filter((id) => !status[id]?.ok);
  console.log(
    `\n${checkedIds.length - down.length}/${checkedIds.length} up · status written to lib/site-status.json`,
  );
  if (down.length) console.log(`down: ${down.map((id) => status[id]?.domain ?? id).join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
