import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * retrySubmit pins the late-submission rescue: a run that ended BEFORE the
 * wallet/name were set must still be postable from the end screen or the
 * console — but never double-post, and never outlive the next run.
 * (Regression: a winning score was silently dropped because submission only
 * happened at the instant the run ended.)
 */

const { submitScore, profile } = vi.hoisted(() => ({
  submitScore: vi.fn(async (p: unknown) => !!p),
  profile: { name: "", wallet: "" },
}));

vi.mock("@/lib/leaderboard", () => ({
  submitScore: (p: unknown) => submitScore(p),
}));
vi.mock("@/lib/profile", () => ({
  useProfile: { getState: () => profile },
}));

import { useGame } from "@/lib/gameStore";

beforeEach(() => {
  submitScore.mockClear();
  profile.name = "";
  profile.wallet = "";
  useGame.setState({ finalScore: 0, finalDiff: "normal", scoreSubmit: "" });
});

describe("retrySubmit", () => {
  it("posts a pending score once name+wallet exist, with the run's own difficulty", async () => {
    profile.name = "wes";
    profile.wallet = "So11111111111111111111111111111111111111112";
    useGame.setState({ finalScore: 1234, finalDiff: "hard", scoreSubmit: "" });

    useGame.getState().retrySubmit();
    await vi.waitFor(() => expect(useGame.getState().scoreSubmit).toBe("ok"));
    expect(submitScore).toHaveBeenCalledExactlyOnceWith({
      name: "wes",
      wallet: "So11111111111111111111111111111111111111112",
      score: 1234,
      diff: "hard",
    });
  });

  it("never double-posts a score that already went through", () => {
    profile.name = "wes";
    profile.wallet = "abc";
    useGame.setState({ finalScore: 1234, scoreSubmit: "ok" });
    useGame.getState().retrySubmit();
    expect(submitScore).not.toHaveBeenCalled();
  });

  it("stays quiet while the profile is still incomplete", () => {
    useGame.setState({ finalScore: 1234, scoreSubmit: "" });
    profile.wallet = "abc"; // wallet but no name
    useGame.getState().retrySubmit();
    profile.wallet = "";
    profile.name = "wes"; // name but no wallet
    useGame.getState().retrySubmit();
    expect(submitScore).not.toHaveBeenCalled();
    expect(useGame.getState().scoreSubmit).toBe("");
  });

  it("a new run supersedes the previous unposted score", () => {
    profile.name = "wes";
    profile.wallet = "abc";
    useGame.setState({ finalScore: 1234, scoreSubmit: "" });
    useGame.getState().start("normal");
    useGame.getState().retrySubmit();
    expect(submitScore).not.toHaveBeenCalled();
  });

  it("a failed submit stays retryable", async () => {
    profile.name = "wes";
    profile.wallet = "abc";
    submitScore.mockResolvedValueOnce(false);
    useGame.setState({ finalScore: 1234, scoreSubmit: "" });

    useGame.getState().retrySubmit();
    await vi.waitFor(() => expect(useGame.getState().scoreSubmit).toBe("fail"));

    useGame.getState().retrySubmit();
    await vi.waitFor(() => expect(useGame.getState().scoreSubmit).toBe("ok"));
    expect(submitScore).toHaveBeenCalledTimes(2);
  });
});
