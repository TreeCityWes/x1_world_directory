"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { POWER_LABEL, regions } from "@/lib/regions";
import { DIFFICULTIES, UPGRADES, run, upgradeView, useGame, type DifficultyId } from "@/lib/gameStore";
import { CHARACTERS, CHARACTER_ORDER } from "@/lib/characters";
import CharacterPreview from "@/components/game/CharacterPreview";
import { useProfile } from "@/lib/profile";
import { explorerTx, inscribeRun } from "@/lib/inscribe";

const TOTAL_SITES = regions.length;

// what actually got you — crypto death certificates
const DEATH_FLAVOR: Record<string, string> = {
  goblin: "exploited by a bug",
  gremlin: "burned alive by gas fees",
  rug: "it was a rug pull all along",
  "boss:whale": "swallowed whole by THE WHALE",
  "boss:nemesis": "slain by your own shadow",
};
const ONBOARD_KEY = "x1world_onboarded";

// dingbat glyphs (not emoji) so upgrade cards read at a glance
const UPGRADE_ICON: Record<string, string> = {
  damage: "✦",
  firerate: "≫",
  multishot: "⁂",
  speed: "➤",
  magnet: "◎",
  vitality: "✚",
  katana: "⚔",
  arcnode: "↯",
  halo: "◉",
  armor: "⛨",
  lifesteal: "❖",
  regen: "↻",
  crit: "◈",
  bladestorm: "❂",
  tempest: "✺",
  whirlwind: "❋",
  chainreaction: "⌁",
  meltdown: "♨",
};

/** One labeled stat bar in the character dossier. */
function StatBar({ label, v, accent }: { label: string; v: number; accent: string }) {
  const pct = Math.round(Math.min(1, v / 1.6) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-right font-mono text-[8px] uppercase tracking-[0.14em] text-ink-dim">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>
      <span className="w-8 shrink-0 font-mono text-[8px] tabular-nums text-ink-dim">
        ×{v.toFixed(2)}
      </span>
    </div>
  );
}

/** Fighting-game style select: roster row + live 3D turntable + full dossier. */
function CharacterSelect() {
  const selected = useGame((s) => s.character);
  const setCharacter = useGame((s) => s.setCharacter);
  const ch = CHARACTERS[selected];
  const accent = ch.colors.band;

  return (
    <div className="mx-auto mt-3 w-full max-w-3xl px-4 text-left">
      {/* roster row */}
      <div className="grid grid-cols-5 gap-2 max-md:grid-cols-3">
        {CHARACTER_ORDER.map((id) => {
          const c = CHARACTERS[id];
          const sel = id === selected;
          return (
            <button
              key={id}
              onClick={() => c.unlocked && setCharacter(id)}
              disabled={!c.unlocked}
              className={`rounded-xl border-2 px-2.5 py-2 text-left backdrop-blur-md transition-all ${
                sel
                  ? ""
                  : c.unlocked
                    ? "border-white/15 bg-space/80 hover:-translate-y-0.5 hover:border-white/40"
                    : "border-white/10 bg-space/60 opacity-40"
              }`}
              style={
                sel
                  ? {
                      borderColor: c.colors.band,
                      boxShadow: `0 0 22px ${c.colors.band}44`,
                      background: `linear-gradient(160deg, ${c.colors.band}24, rgba(9,13,28,0.92))`,
                    }
                  : undefined
              }
            >
              <span
                className="block h-1 w-8 rounded-full"
                style={{ background: c.unlocked ? c.colors.band : "#4b5563" }}
              />
              <p className="mt-1.5 truncate text-sm font-bold leading-tight">{c.name}</p>
              <p
                className="truncate font-mono text-[8px] uppercase tracking-[0.12em] text-ink-dim"
                style={sel ? { color: c.colors.band } : undefined}
              >
                {c.unlocked ? (sel ? "▸ selected" : c.title) : "coming soon"}
              </p>
            </button>
          );
        })}
      </div>

      {/* dossier: live 3D preview + stats + weapon + signature */}
      <div className="mt-2 grid grid-cols-[240px_1fr] gap-2 max-md:grid-cols-1">
        <div
          className="relative overflow-hidden rounded-2xl border-2 bg-space/85 backdrop-blur-md"
          style={{ borderColor: `${accent}55` }}
        >
          <div className="h-56 max-md:h-44">
            <CharacterPreview charId={selected} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(5,8,18,0.92)] to-transparent px-3 pb-2.5 pt-8">
            <p className="text-lg font-bold leading-none">{ch.name}</p>
            <p
              className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em]"
              style={{ color: accent }}
            >
              {ch.title}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border-2 border-white/10 bg-space/85 px-4 py-3 backdrop-blur-md">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: accent }}>
            ⚔ {ch.weapon.name}
          </p>
          <p className="mt-0.5 text-xs text-ink-dim">{ch.weapon.desc}</p>
          <div className="mt-2.5 space-y-1.5">
            <StatBar label="vitality" v={ch.hp} accent="#4ade80" />
            <StatBar label="damage" v={ch.dmg} accent="#ff8c6b" />
            <StatBar label="speed" v={ch.speed} accent="#7dd3fc" />
            <StatBar label="fire rate" v={Math.max(0.2, 2 - ch.cooldown)} accent="#f0c75e" />
            <StatBar label="fortune" v={ch.luck} accent="#c084fc" />
          </div>
          <p
            className="mt-2.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em]"
            style={{ color: accent }}
          >
            ★ {ch.passive}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-dim">{ch.playstyle}</p>
        </div>
      </div>
    </div>
  );
}

/** Lower-right flash when a site is captured: screenshot + name + power. */
function CaptureToast() {
  const capturedIds = useGame((s) => s.capturedIds);
  const [toast, setToast] = useState<(typeof regions)[number] | null>(null);
  const seen = useRef(0);

  useEffect(() => {
    if (capturedIds.length > seen.current) {
      const r = regions.find((x) => x.id === capturedIds[capturedIds.length - 1]);
      if (r) {
        const show = setTimeout(() => setToast(r), 0);
        const hide = setTimeout(() => setToast(null), 3400);
        seen.current = capturedIds.length;
        return () => {
          clearTimeout(show);
          clearTimeout(hide);
        };
      }
    }
    seen.current = capturedIds.length;
  }, [capturedIds]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, x: 40, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="pointer-events-none absolute bottom-4 right-4 z-40 w-48 overflow-hidden rounded-xl border-2 bg-[rgba(9,13,28,0.94)] backdrop-blur max-md:bottom-40 max-md:right-3 max-md:w-36"
          style={{ borderColor: toast.accent, boxShadow: `0 0 24px ${toast.accent}66` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- site capture */}
          <img
            src={toast.screenshot}
            alt={toast.name}
            className="aspect-[8/5] w-full object-cover object-top"
          />
          <div className="px-3 py-2">
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.24em] text-gold">
              ⚡ captured!
            </p>
            <p className="truncate text-sm font-bold leading-tight">{toast.name}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Center-screen reward beat when a site is captured: big project name +
 *  the bonus it grants, in bold display type. Pairs with the corner toast. */
function CaptureFlash() {
  const capturedIds = useGame((s) => s.capturedIds);
  const [flash, setFlash] = useState<{ id: string; name: string; power: string; accent: string } | null>(
    null,
  );
  const seen = useRef(0);

  useEffect(() => {
    if (capturedIds.length > seen.current) {
      const r = regions.find((x) => x.id === capturedIds[capturedIds.length - 1]);
      seen.current = capturedIds.length;
      if (r) {
        const power = POWER_LABEL[r.kind] ?? "captured";
        const show = setTimeout(
          () => setFlash({ id: r.id, name: r.name, power, accent: r.accent }),
          0,
        );
        const hide = setTimeout(() => setFlash(null), 1900);
        return () => {
          clearTimeout(show);
          clearTimeout(hide);
        };
      }
    }
    seen.current = capturedIds.length;
  }, [capturedIds]);

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          key={flash.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute inset-x-0 top-[34%] z-40 flex flex-col items-center text-center max-md:top-[28%]"
        >
          <motion.p
            initial={{ scale: 0.6, y: 18, letterSpacing: "0.4em" }}
            animate={{ scale: 1, y: 0, letterSpacing: "0.02em" }}
            transition={{ type: "spring", stiffness: 240, damping: 16 }}
            className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-gold"
          >
            ⚡ site captured
          </motion.p>
          <motion.h2
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.04 }}
            className="mt-1 text-5xl font-black italic tracking-tight max-md:text-3xl"
            style={{
              color: "#fff",
              textShadow: `0 0 18px ${flash.accent}, 0 0 40px ${flash.accent}88, 0 2px 4px rgba(0,0,0,0.6)`,
            }}
          >
            {flash.name}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-2 rounded-full border-2 px-4 py-1 font-mono text-sm font-bold uppercase tracking-[0.18em] backdrop-blur max-md:text-xs"
            style={{
              color: flash.accent,
              borderColor: `${flash.accent}aa`,
              background: `${flash.accent}1a`,
              boxShadow: `0 0 24px ${flash.accent}55`,
            }}
          >
            {flash.power}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Inscribe-on-X1 + view-leaderboard row for the end-of-run screens. */
function InscribeRow({ score }: { score: number }) {
  const wallet = useProfile((s) => s.wallet);
  const name = useProfile((s) => s.name);
  const [st, setSt] = useState<{ k: "idle" | "busy" | "done"; sig?: string; err?: string }>({
    k: "idle",
  });

  const doInscribe = async () => {
    if (st.k !== "idle") return;
    setSt({ k: "busy" });
    const r = await inscribeRun({
      name,
      score,
      diff: run.difficulty,
      captured: run.captured,
      total: TOTAL_SITES,
    });
    setSt(r.sig ? { k: "done", sig: r.sig } : { k: "idle", err: r.error });
  };

  const viewBoard = () => {
    useGame.getState().openMenu();
    document.getElementById("x1-leaderboard")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap justify-center gap-2">
        {st.k === "done" && st.sig ? (
          <a
            href={explorerTx(st.sig)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-[#4ade80]/50 bg-[#4ade80]/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#4ade80] transition-colors hover:border-[#4ade80]"
          >
            ⛓ inscribed on x1 — view transaction ↗
          </a>
        ) : (
          <button
            onClick={() => void doInscribe()}
            disabled={st.k === "busy" || !wallet}
            title={wallet ? "write this score to X1 mainnet forever" : "connect your wallet first"}
            className="rounded-md border border-gold/60 bg-gold/10 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gold transition-all hover:-translate-y-px hover:border-gold hover:shadow-[0_0_16px_rgba(240,199,94,0.35)] disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {st.k === "busy" ? "inscribing…" : "⛓ inscribe score on x1"}
          </button>
        )}
        <button
          onClick={viewBoard}
          className="rounded-md border border-cyan/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-cyan transition-colors hover:border-cyan"
        >
          🏆 view leaderboard
        </button>
      </div>
      {!wallet && st.k === "idle" && !st.err && (
        <p className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-ink-dim/60">
          connect your wallet to inscribe your score on x1 mainnet
        </p>
      )}
      {st.err && (
        <p className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#ff8c6b]">
          {st.err}
        </p>
      )}
    </div>
  );
}

/**
 * DOM HUD for survival runs: HP/XP bars, run stats, level-up cards, death
 * screen. Mounted over the world pane; only renders outside explore mode.
 */
export default function GameHUD() {
  const mode = useGame((s) => s.mode);
  const hud = useGame((s) => s.hud);
  const choices = useGame((s) => s.choices);
  const pick = useGame((s) => s.pick);
  const start = useGame((s) => s.start);
  const quit = useGame((s) => s.quit);
  const best = useGame((s) => s.best);
  const finalScore = useGame((s) => s.finalScore);
  const deathCause = useGame((s) => s.deathCause);
  const bossCard = useGame((s) => s.bossCard);
  const bossCardAt = useGame((s) => s.bossCardAt);
  const scoreSubmit = useGame((s) => s.scoreSubmit);
  const [bossCardVisible, setBossCardVisible] = useState(false);
  useEffect(() => {
    if (!bossCardAt) return;
    const show = setTimeout(() => setBossCardVisible(true), 0);
    const hide = setTimeout(() => setBossCardVisible(false), 3000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [bossCardAt]);
  const [onboarded, setOnboarded] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(ONBOARD_KEY) === "1",
  );

  if (mode === "explore") return null;
  const dismissOnboard = () => {
    setOnboarded(true);
    localStorage.setItem(ONBOARD_KEY, "1");
  };

  return (
    <>
      {/* damage vignette */}
      <AnimatePresence>
        {hud.hit && mode === "play" && (
          <motion.div
            key="hit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="pointer-events-none absolute inset-0 z-40"
            style={{ boxShadow: "inset 0 0 90px 30px rgba(224, 60, 47, 0.55)" }}
          />
        )}
      </AnimatePresence>
      {/* bars — bottom center of the world pane (runs only) */}
      {(mode === "play" || mode === "levelup") && (
      <div className="pointer-events-none absolute bottom-16 left-1/2 w-[min(300px,60%)] -translate-x-1/2 space-y-1.5 max-md:bottom-4 max-md:left-3 max-md:w-[42%] max-md:translate-x-0">
        <div className="h-2 overflow-hidden rounded-full border border-white/15 bg-space/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#e0563f] to-[#ff8c6b] transition-[width] duration-200"
            style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }}
          />
        </div>
        <div className="h-1 overflow-hidden rounded-full border border-white/10 bg-space/70">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-200"
            style={{ width: `${Math.min(100, (hud.xp / hud.xpNext) * 100)}%` }}
          />
        </div>
        {hud.shield && (
          <p className="text-center font-mono text-[9px] uppercase tracking-[0.2em] text-cyan">
            ⛨ shield active
          </p>
        )}
      </div>
      )}

      {/* run stats — under the focus-header slot */}
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-lg border border-white/10 bg-[rgba(9,13,28,0.7)] px-4 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink backdrop-blur-md max-md:left-2 max-md:top-12 max-md:translate-x-0 max-md:px-2 max-md:py-1 max-md:text-[8px] max-md:tracking-[0.12em]">
        {hud.diff !== "normal" && (
          <>
            <span className={hud.diff === "cursed" ? "text-[#a78bfa]" : "text-[#e0563f]"}>
              {hud.diff}
            </span>
            <span className="mx-2 text-ink-dim">·</span>
          </>
        )}
        <span className="text-gold">block {hud.block}</span>
        <span className="mx-2 text-ink-dim">·</span>lv {hud.level}
        <span className="mx-2 text-ink-dim">·</span>{hud.kills} kills
        <span className="mx-2 text-ink-dim">·</span>
        <span className="text-cyan">
          {hud.captured}/{TOTAL_SITES} sites
        </span>
        {hud.finalBoss && (
          <span className="animate-pulse text-[#ff4d4d]">
            <span className="mx-2 text-ink-dim">·</span>⚔ slay the final boss
          </span>
        )}
      </div>

      {/* first-run onboarding — one line, dismiss once, never again */}
      {mode === "play" && !onboarded && (
        <div className="pointer-events-auto absolute left-1/2 top-14 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-gold/40 bg-[rgba(9,13,28,0.9)] px-4 py-2 backdrop-blur max-md:top-24 max-md:w-[92%] max-md:justify-between max-md:gap-2 max-md:px-3">
          <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.15em] text-gold max-md:text-[9px]">
            capture all {TOTAL_SITES} glowing sites to win — follow the arrows · grab coins to
            level up
          </p>
          <button
            onClick={dismissOnboard}
            aria-label="dismiss"
            className="shrink-0 text-sm text-ink-dim transition-colors hover:text-gold"
          >
            ✕
          </button>
        </div>
      )}

      {mode === "play" && <CaptureToast />}
      {mode === "play" && <CaptureFlash />}

      {/* boss entrance card — brief danger nameplate */}
      <AnimatePresence>
        {mode === "play" && bossCard && bossCardVisible && (
          <motion.div
            key={bossCardAt}
            initial={{ opacity: 0, scale: 1.18 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="pointer-events-none absolute inset-x-0 top-24 z-40 grid place-items-center max-md:top-32"
          >
            <div
              className="rounded-xl border-2 border-[#ff4d4d]/70 bg-[rgba(28,8,10,0.88)] px-8 py-3.5 text-center backdrop-blur"
              style={{ boxShadow: "0 0 60px rgba(255,77,77,0.4)" }}
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.34em] text-[#ff8a8a]">
                ⚠ boss detected
              </p>
              <p className="mt-1 text-2xl font-black tracking-[0.06em] text-[#ff4d4d] max-md:text-lg">
                {bossCard}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* low health — restrained heartbeat vignette */}
      {mode === "play" && hud.maxHp > 0 && hud.hp / hud.maxHp < 0.25 && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-30"
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: "inset 0 0 140px 30px rgba(224,60,50,0.45)" }}
        />
      )}

      {/* pause chip */}
      {mode === "play" && (
        <button
          onClick={() => useGame.getState().pause()}
          className="pointer-events-auto absolute right-4 top-3 rounded-md border border-white/15 bg-space/70 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim backdrop-blur transition-colors hover:border-gold/60 hover:text-gold"
        >
          esc — pause
        </button>
      )}

      {/* pause screen — interruptions never cost the run */}
      <AnimatePresence>
        {mode === "paused" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-space/70 backdrop-blur-sm"
          >
            <div className="text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
                ⏸ paused
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim">
                block {hud.block} · lv {hud.level} · {hud.kills} kills ·{" "}
                <span className="text-cyan">
                  {hud.captured}/{TOTAL_SITES} sites
                </span>
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  onClick={() => useGame.getState().resume()}
                  className="rounded-xl border-2 border-gold bg-gradient-to-b from-[#ffd97a] to-[#c9921e] px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-space shadow-[0_0_24px_rgba(240,199,94,0.5)] transition-transform hover:-translate-y-0.5"
                >
                  ▶ resume
                </button>
                <button
                  onClick={quit}
                  className="rounded-xl border border-white/20 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-ink-dim transition-colors hover:border-[#e0563f]/70 hover:text-[#ff8c6b]"
                >
                  abandon run
                </button>
              </div>
              <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim/60">
                esc or p to resume
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* run menu — pick your bet (Normal / Hard / Cursed) */}
      <AnimatePresence>
        {mode === "menu" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-space/60 backdrop-blur-sm"
          >
            <div className="max-h-full overflow-y-auto py-4 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
                select your character
              </p>
              <CharacterSelect />
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
                choose your run
              </p>
              <div className="mt-3 flex flex-wrap items-stretch justify-center gap-3 px-4">
                {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((id, i) => {
                  const d = DIFFICULTIES[id];
                  return (
                    <motion.button
                      key={id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      onClick={() => start(id)}
                      className={`w-48 rounded-xl border p-4 text-left backdrop-blur-md transition-all hover:-translate-y-1 ${
                        id === "cursed"
                          ? "border-[#a78bfa]/50 bg-[rgba(20,10,32,0.92)] hover:border-[#a78bfa] hover:shadow-[0_0_30px_rgba(167,139,250,0.3)]"
                          : id === "hard"
                            ? "border-[#e0563f]/50 bg-[rgba(28,12,10,0.92)] hover:border-[#e0563f] hover:shadow-[0_0_30px_rgba(224,86,63,0.3)]"
                            : "border-cyan/40 bg-[rgba(9,13,28,0.92)] hover:border-cyan hover:shadow-[0_0_30px_rgba(125,211,252,0.3)]"
                      }`}
                    >
                      <p className="text-lg font-semibold tracking-tight">{d.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-dim">{d.desc}</p>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                        {d.scoreMult}× score
                      </p>
                    </motion.button>
                  );
                })}
              </div>
              <button
                onClick={quit}
                className="mt-5 rounded-md border border-white/15 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
              >
                back to explore
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* level-up cards */}
      <AnimatePresence>
        {mode === "levelup" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-space/60 backdrop-blur-sm"
          >
            <div className="max-h-full w-full py-6 text-center [padding-bottom:env(safe-area-inset-bottom)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
                level {hud.level} — choose an upgrade
              </p>
              <div className="mt-4 flex flex-wrap items-stretch justify-center gap-3 px-4">
                {choices.map((id, i) => {
                  const u = UPGRADES.find((x) => x.id === id)!;
                  const view = upgradeView(id);
                  const nextLv = (hud.upgrades[id] ?? 0) + 1;
                  const isEvo = !!u.requires;
                  return (
                    <motion.button
                      key={id}
                      initial={{ opacity: 0, y: 20, scale: isEvo ? 0.85 : 1 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: i * 0.07, type: "spring", stiffness: 300, damping: 20 }}
                      onClick={() => pick(id)}
                      className={
                        isEvo
                          ? "w-44 max-md:w-[84%] animate-pulse rounded-xl border-2 border-gold bg-gradient-to-b from-[rgba(40,30,8,0.95)] to-[rgba(9,13,28,0.95)] p-4 text-left shadow-[0_0_40px_rgba(240,199,94,0.45)] backdrop-blur-md transition-all hover:-translate-y-1 hover:animate-none"
                          : "w-44 max-md:w-[84%] rounded-xl border border-cyan/30 bg-[rgba(9,13,28,0.92)] p-4 text-left backdrop-blur-md transition-all hover:-translate-y-1 hover:border-gold/70 hover:shadow-[0_0_30px_rgba(240,199,94,0.25)]"
                      }
                    >
                      <div className="flex items-center justify-between">
                        <p
                          className={`font-mono text-[9px] uppercase tracking-[0.2em] ${
                            isEvo ? "text-gold" : "text-cyan"
                          }`}
                        >
                          {isEvo ? "⚡ evolution" : `lv ${nextLv} / ${u.maxLevel}`}
                        </p>
                        <span className={`text-xl leading-none ${isEvo ? "text-gold" : "text-cyan"}`}>
                          {UPGRADE_ICON[id] ?? "✦"}
                        </span>
                      </div>
                      <p
                        className={`mt-1.5 text-base font-semibold tracking-tight ${isEvo ? "text-gold" : ""}`}
                      >
                        {view.name}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-dim">{view.desc(nextLv)}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* victory screen — every ecosystem project captured */}
      <AnimatePresence>
        {mode === "won" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-space/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="rounded-2xl border border-gold/50 bg-[rgba(9,13,28,0.95)] p-8 text-center shadow-[0_0_60px_rgba(240,199,94,0.25)]"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">
                🥷 ecosystem complete — all {TOTAL_SITES} projects captured
              </p>
              <p className="mt-3 text-5xl font-semibold tracking-tight text-gold">{finalScore}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
                score (incl. 1000 conquest bonus) · best {best}
              </p>
              {scoreSubmit === "ok" && (
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#4ade80]">
                  ✓ recorded on the global leaderboard
                </p>
              )}
              {scoreSubmit === "fail" && (
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#ff8c6b]">
                  ⚠ leaderboard unreachable — score kept locally
                </p>
              )}
              {finalScore > 500000 && (
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-dim/70">
                  board entries cap at 500,000
                </p>
              )}
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim">
                {Math.floor(hud.time / 60)}m {Math.floor(hud.time % 60)}s · {hud.block} blocks ·{" "}
                {hud.kills} kills
              </p>
              <InscribeRow score={finalScore} />
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => start()}
                  className="rounded-md bg-gold px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-space transition-all hover:-translate-y-0.5 hover:bg-[#ffd97a]"
                >
                  run it back
                </button>
                <button
                  onClick={quit}
                  className="rounded-md border border-white/15 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
                >
                  explore
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* death screen */}
      <AnimatePresence>
        {mode === "dead" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-space/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-[rgba(9,13,28,0.95)] p-8 text-center"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#e0563f]">
                {DEATH_FLAVOR[deathCause] ?? "the bear market got you"}
              </p>
              <p className="mt-3 text-5xl font-semibold tracking-tight">{finalScore}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
                score · best {best}
              </p>
              {scoreSubmit === "ok" && (
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#4ade80]">
                  ✓ recorded on the global leaderboard
                </p>
              )}
              {scoreSubmit === "fail" && (
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[#ff8c6b]">
                  ⚠ leaderboard unreachable — score kept locally
                </p>
              )}
              {finalScore > 500000 && (
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-dim/70">
                  board entries cap at 500,000
                </p>
              )}
              <div className="mt-4 space-y-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-dim">
                <p>{hud.block} blocks survived · {hud.kills} kills · {hud.captured} sites</p>
              </div>
              <InscribeRow score={finalScore} />
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => start()}
                  className="rounded-md bg-gold px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-space transition-all hover:-translate-y-0.5 hover:bg-[#ffd97a]"
                >
                  run it back
                </button>
                <button
                  onClick={quit}
                  className="rounded-md border border-white/15 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-ink-dim transition-colors hover:border-cyan/60 hover:text-cyan"
                >
                  explore
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
