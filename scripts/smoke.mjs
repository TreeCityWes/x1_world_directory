/**
 * Boot-and-play smoke test — the game must START, RENDER, and TICK.
 *
 *   npm run build && node scripts/smoke.mjs
 *
 * Asserts, in a real headless Chrome (playwright-core, system browser):
 *   1. the landing menu renders (start button present)
 *   2. a run starts and the time-attack countdown TICKS DOWN
 *   3. the WebGL scene actually draws (renderer draw calls > threshold —
 *      catches the black-canvas class of regression)
 *   4. holding W moves the world (planet quaternion changes)
 *   5. if a rigged hero is in the scene, its bones animate while moving
 *      (the floating-legs regression, permanently pinned)
 *   6. zero page errors / uncaught exceptions end to end
 *
 * Exit code 0 = pass. Non-zero = fail with a reason list.
 */
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "playwright-core";

const PORT = 3210;
const URL = `http://localhost:${PORT}`;
const failures = [];
const note = (s) => console.log(`  ${s}`);
const fail = (s) => {
  failures.push(s);
  console.error(`  ✗ ${s}`);
};
const pass = (s) => console.log(`  ✓ ${s}`);

// ---- 1. serve the production build ----
console.log("smoke: starting next start on :" + PORT);
const server = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "start", "-p", String(PORT)],
  { stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" },
);
server.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));

// Windows: server.kill() only kills the npx shell wrapper — the node child
// keeps the port and poisons the NEXT run with EADDRINUSE. Kill the tree.
const killServer = () => {
  if (process.platform === "win32") {
    try {
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      /* already gone */
    }
  } else {
    server.kill();
  }
};

const up = await (async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(URL);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
})();
if (!up) {
  console.error("smoke: server never came up — did you run `next build` first?");
  killServer();
  process.exit(1);
}

// ---- 2. drive a real browser ----
// system Chrome (CI ubuntu images ship it); fall back to Edge on Windows
let browser;
for (const channel of ["chrome", "msedge"]) {
  try {
    browser = await chromium.launch({ channel, headless: true });
    break;
  } catch {
    /* try next channel */
  }
}
if (!browser) {
  console.error("smoke: no system Chrome/Edge found for playwright-core");
  killServer();
  process.exit(1);
}

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") pageErrors.push(m.text());
});

try {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });

  // DOM-dispatched clicks: Playwright's actionability check fights the
  // framer-motion roster cards (whileHover keeps them animating under the
  // pointer), and text-locators are brittle here ("Balanced Starter …
  // your first run" matches /start .* run/ when the ninja card is
  // unselected). Element.click() sidesteps both.
  const clickButton = (pattern) =>
    page.evaluate((src) => {
      const rx = new RegExp(src, "i");
      const b = [...document.querySelectorAll("button")].find((el) => rx.test(el.textContent));
      if (b) b.click();
      return !!b;
    }, pattern);

  // menu is the landing experience — the big CTA starts with ▶
  await page.waitForFunction(
    () => [...document.querySelectorAll("button")].some((b) => /▶\s*start/i.test(b.textContent)),
    undefined,
    { timeout: 30_000 },
  );
  pass("landing menu rendered");

  // the canvas debug hook mounts with the 3D bundle
  await page.waitForFunction(() => !!window.__x1dbg, undefined, { timeout: 30_000 });
  pass("3D scene mounted (__x1dbg)");

  // play as JACK — he's the RIGGED hero, which makes the gait probe below a
  // required assertion instead of a skip (a fresh browser defaults to the
  // procedural ninja, whose limbs three can't probe by bone name)
  const jackSelected = await clickButton("Jack Levin");
  if (!jackSelected) note("Jack roster card not found — running default character");

  if (!(await clickButton("start\\s+(normal|hard|cursed)\\s+run"))) {
    // dump state — a missing asset 404 escalates to Next's error page here
    const body = await page.evaluate(() => document.body.innerText.slice(0, 200));
    throw new Error(`start button vanished; body: ${body}; errors: ${JSON.stringify(pageErrors)}`);
  }

  // countdown: grab mm:ss twice — it must tick DOWN (time attack is live)
  const clock = async () => {
    const txt = await page.evaluate(() => document.body.innerText);
    const m = txt.match(/(\d+):(\d{2})/);
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
  };
  // Poll until the clock DECREASES. The game loop clamps dt at 0.05s/frame,
  // so on a software-GL CI runner at ~3fps game time crawls (~0.15 game-s
  // per wall-s) — a fixed 2.5s gap reads the same mm:ss twice and lies.
  await page.waitForTimeout(1500);
  const t1 = await clock();
  let t2 = t1;
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(1000);
    t2 = await clock();
    if (t1 !== null && t2 !== null && t2 < t1) break;
  }
  if (t1 === null || t2 === null) fail(`countdown not found in HUD (t1=${t1}, t2=${t2})`);
  else if (t2 >= t1) fail(`countdown not ticking (stuck at ${t1}s for 45s)`);
  else pass(`countdown ticks (${t1}s -> ${t2}s)`);

  // real rendering: wait for AT LEAST one full frame, then judge total calls
  // against a black-canvas baseline. Two traps here: info.autoReset zeroes
  // the counter every frame (a point read lands on 0-1), and CI's software
  // GL manages ~1 frame per 400ms — so any fixed calls-per-window threshold
  // is really a frame-rate assertion. One healthy frame is ~85+ calls; an
  // empty scene is composer overhead only (~3-5).
  const draw = await page.evaluate(async () => {
    const info = window.__x1dbg?.gl?.info;
    if (!info) return { calls: 0, frames: 0 };
    const f0 = info.render.frame;
    info.autoReset = false;
    info.reset();
    const deadline = Date.now() + 5000;
    while (info.render.frame - f0 < 1 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100));
    }
    const out = { calls: info.render.calls, frames: info.render.frame - f0 };
    info.autoReset = true;
    return out;
  });
  if (draw.frames < 1) fail("renderer produced no frames in 5s");
  else if (draw.calls < 30)
    fail(`suspiciously few draw calls (${draw.calls} over ${draw.frames} frames) — black canvas?`);
  else pass(`scene draws (${draw.calls} calls over ${draw.frames} frame${draw.frames > 1 ? "s" : ""})`);

  // movement: hold W, the planet must rotate under the hero
  const quatBefore = await page.evaluate(() => {
    let q = null;
    window.__x1dbg.scene.traverse((o) => {
      // the planet group is the rotating parent of the ocean sphere mesh
      if (!q && o.isMesh && o.geometry?.type === "SphereGeometry" && o.parent?.isGroup) {
        const p = o.parent.quaternion;
        q = [p.x, p.y, p.z, p.w];
      }
    });
    return q;
  });
  await page.keyboard.down("w");
  await page.waitForTimeout(1500);
  const quatAfter = await page.evaluate(() => {
    let q = null;
    window.__x1dbg.scene.traverse((o) => {
      if (!q && o.isMesh && o.geometry?.type === "SphereGeometry" && o.parent?.isGroup) {
        const p = o.parent.quaternion;
        q = [p.x, p.y, p.z, p.w];
      }
    });
    return q;
  });
  if (!quatBefore || !quatAfter) fail("planet group not found for movement probe");
  else {
    const delta = quatBefore.reduce((s, v, i) => s + Math.abs(v - quatAfter[i]), 0);
    if (delta < 1e-4) fail(`W does not move the world (quat delta ${delta})`);
    else pass(`movement works (quat delta ${delta.toFixed(4)})`);
  }

  // gait: if a rigged hero exists (skinned mesh), bones must move while running
  const gait = await page.evaluate(async () => {
    let sm = null;
    window.__x1dbg.scene.traverse((o) => {
      if (o.isSkinnedMesh && !sm) sm = o;
    });
    if (!sm) return { skinned: false };
    const bone =
      sm.skeleton.bones.find((b) => /Foot|LowerLeg/i.test(b.name)) ?? sm.skeleton.bones[0];
    const samples = [];
    for (let i = 0; i < 6; i++) {
      samples.push(bone.rotation.x);
      await new Promise((r) => setTimeout(r, 140));
    }
    return { skinned: true, spread: Math.max(...samples) - Math.min(...samples) };
  });
  if (!gait.skinned) {
    // selecting Jack means a skinned rig MUST be in the scene — its absence
    // is itself a regression (model failed to load / branch removed the rig)
    if (jackSelected) fail("Jack selected but no skinned rig in scene");
    else note("no rigged hero in scene — gait probe skipped");
  } else if (gait.spread < 0.05)
    fail(`rigged hero legs frozen while running (spread ${gait.spread})`);
  else pass(`rigged gait animates (bone spread ${gait.spread.toFixed(2)} rad)`);
  await page.keyboard.up("w");

  // page errors are always fatal
  if (pageErrors.length) fail(`page errors:\n    ${pageErrors.slice(0, 5).join("\n    ")}`);
  else pass("zero page errors");
} catch (e) {
  fail(`smoke crashed: ${e}`);
} finally {
  await browser.close();
  killServer();
}

if (failures.length) {
  console.error(`\nsmoke: FAIL (${failures.length})`);
  process.exit(1);
}
console.log("\nsmoke: PASS");
process.exit(0);
