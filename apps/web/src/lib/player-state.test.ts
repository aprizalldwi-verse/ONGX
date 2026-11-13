import { describe, expect, it } from "vitest";

import {
  clampPosition,
  clampVolume,
  formatClock,
  initialPlayerState,
  isResumable,
  parseStoredPosition,
  playerReducer,
  progressRatio,
  qualityLabel,
  resumeKey,
  seekTarget,
} from "./player-state";

describe("formatClock", () => {
  it("formats minutes and hours", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(3_661)).toBe("1:01:01");
    expect(formatClock(Number.NaN)).toBe("0:00");
    expect(formatClock(-10)).toBe("0:00");
  });
});

describe("seek helpers", () => {
  it("clamps to the media bounds", () => {
    expect(clampPosition(-5, 100)).toBe(0);
    expect(clampPosition(120, 100)).toBe(100);
    expect(clampPosition(20, 0)).toBe(20);
    expect(seekTarget(5, -10, 100)).toBe(0);
    expect(seekTarget(95, 10, 100)).toBe(100);
  });

  it("computes a safe ratio", () => {
    expect(progressRatio(50, 100)).toBe(0.5);
    expect(progressRatio(150, 100)).toBe(1);
    expect(progressRatio(50, 0)).toBe(0);
  });
});

describe("resume rules", () => {
  it("resumes after the intro but not near the end", () => {
    expect(isResumable(5, 100)).toBe(false);
    expect(isResumable(30, 100)).toBe(true);
    expect(isResumable(96, 100)).toBe(false);
  });

  it("parses stored positions defensively", () => {
    expect(parseStoredPosition(null)).toBe(0);
    expect(parseStoredPosition("nope")).toBe(0);
    expect(parseStoredPosition("-4")).toBe(0);
    expect(parseStoredPosition("42.5")).toBe(42.5);
  });

  it("builds stable resume keys", () => {
    expect(resumeKey("abc")).toBe("ongx:resume:abc");
    expect(resumeKey("abc", 1, 2)).toBe("ongx:resume:abc:s1:e2");
  });
});

describe("quality and volume", () => {
  it("labels levels and clamps volume", () => {
    expect(qualityLabel(1080)).toBe("1080p");
    expect(qualityLabel(0)).toBe("Auto");
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
  });
});

describe("playerReducer", () => {
  it("tracks playback, time and duration", () => {
    const playing = playerReducer(initialPlayerState, { type: "play" });
    expect(playing.playing).toBe(true);

    const withDuration = playerReducer(playing, { type: "duration", duration: 120 });
    const time = playerReducer(withDuration, { type: "time", position: 200 });
    expect(time.position).toBe(120);

    const paused = playerReducer(time, { type: "togglePlay" });
    expect(paused.playing).toBe(false);
  });

  it("mutes when volume reaches zero", () => {
    const quiet = playerReducer(initialPlayerState, { type: "volume", volume: 0 });
    expect(quiet.volume).toBe(0);
    expect(quiet.muted).toBe(true);

    const loud = playerReducer(quiet, { type: "volume", volume: 0.6 });
    expect(loud.muted).toBe(false);
  });

  it("stores the selected quality level", () => {
    expect(playerReducer(initialPlayerState, { type: "level", level: 2 }).level).toBe(2);
  });
});
