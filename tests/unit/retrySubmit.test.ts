import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * retrySubmit pins the late-submission rescue: a run that ended BEFORE the
 * wallet/name were set must still be postable from the end screen or the
 * console — but never double-post, and never outlive the next run.
 * (Regression: a winning score was silently dropped because submission only
 * happened at the instant the run ended.)
 */

const { submitScore, beginRun, profile } = vi.hoisted(() => ({
  submitScore: vi.fn(async (p: unknown) => !!p),
  beginRun: vi.fn(async (difficulty: "normal" | "hard" | "cursed" = "normal") => ({
    token: "test-token",
    startedAt: 1_700_000_000_000,
    difficulty,
    mutatorId: "none",
  })),
  profile: { name: "", wallet: "" },
}));

vi.mock("@/lib/leaderboard", () => ({
  submitScore: (p: unknown) => submitScore(p),
  beginRun: (d: "normal" | "hard" | "cursed") => beginRun(d),
}));
vi.mock("@/lib/profile", () => ({
  useProfile: { getState: () => profile },
}));

import { useGame } from "@/lib/gameStore";

beforeEach(() => {
  submitScore.mockClear();
  beginRun.mockClear();
  profile.name = "";
  profile.wallet = "";
  useGame.setState({
    finalScore: 0,
    finalDiff: "normal",
    finalStats: null,
    scoreSubmit: "",
  });
});

describe("retrySubmit", () => {
  it("posts a pending score once name+wallet exist, with the run's own difficulty", async () => {
    profile.name = "wes";
    profile.wallet = "So11111111111111111111111111111111111111112";
    // mint a run token the way start() would
    useGame.getState().start("hard");
    await vi.waitFor(() => expect(beginRun).toHaveBeenCalled());
    await Promise.resolve();
    useGame.setState({
      finalScore: 1234,
      finalDiff: "hard",
      finalStats: { t: 30, kills: 10, damage: 500, captured: 2, win: false },
      scoreSubmit: "",
    });

    useGame.getState().retrySubmit();
    await vi.waitFor(() => expect(useGame.getState().scoreSubmit).toBe("ok"));
    expect(submitScore).toHaveBeenCalledExactlyOnceWith({
      name: "wes",
      wallet: "So11111111111111111111111111111111111111112",
      score: 1234,
      diff: "hard",
      stats: { t: 30, kills: 10, damage: 500, captured: 2, win: false },
      runToken: "test-token",
      startedAt: 1_700_000_000_000,
    });
  });

  it("never double-posts a score that already went through", () => {
    profile.name = "wes";
    profile.wallet = "abc";
    useGame.setState({
      finalScore: 1234,
      finalStats: { t: 1, kills: 0, damage: 0, captured: 0, win: false },
      scoreSubmit: "ok",
    });
    useGame.getState().retrySubmit();
    expect(submitScore).not.toHaveBeenCalled();
  });

  it("stays quiet while the profile is still incomplete", () => {
    useGame.setState({
      finalScore: 1234,
      finalStats: { t: 1, kills: 0, damage: 0, captured: 0, win: false },
      scoreSubmit: "",
    });
    profile.wallet = "abc";
    useGame.getState().retrySubmit();
    profile.wallet = "";
    profile.name = "wes";
    useGame.getState().retrySubmit();
    expect(submitScore).not.toHaveBeenCalled();
    expect(useGame.getState().scoreSubmit).toBe("");
  });

  it("a new run supersedes the previous unposted score", () => {
    profile.name = "wes";
    profile.wallet = "abc";
    useGame.setState({
      finalScore: 1234,
      finalStats: { t: 1, kills: 0, damage: 0, captured: 0, win: false },
      scoreSubmit: "",
    });
    useGame.getState().start("normal");
    useGame.getState().retrySubmit();
    expect(submitScore).not.toHaveBeenCalled();
  });

  it("a failed submit stays retryable", async () => {
    profile.name = "wes";
    profile.wallet = "abc";
    useGame.getState().start("normal");
    await Promise.resolve();
    submitScore.mockResolvedValueOnce(false);
    useGame.setState({
      finalScore: 1234,
      finalDiff: "normal",
      finalStats: { t: 5, kills: 1, damage: 10, captured: 0, win: false },
      scoreSubmit: "",
    });

    useGame.getState().retrySubmit();
    await vi.waitFor(() => expect(useGame.getState().scoreSubmit).toBe("fail"));

    useGame.getState().retrySubmit();
    await vi.waitFor(() => expect(useGame.getState().scoreSubmit).toBe("ok"));
    expect(submitScore).toHaveBeenCalledTimes(2);
  });
});
