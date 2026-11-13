/**
 * Pure player math and state. Kept free of React and HLS.js so the behaviour
 * (seek clamping, resume rules, clock formatting) is unit tested directly.
 */

export const RESUME_MIN_SEC = 10;
export const RESUME_COMPLETE_RATIO = 0.95;

export function clampPosition(position: number, duration: number): number {
  if (!Number.isFinite(position)) return 0;
  const safe = Math.max(0, position);
  if (!Number.isFinite(duration) || duration <= 0) return safe;
  return Math.min(safe, duration);
}

export function seekTarget(position: number, delta: number, duration: number): number {
  return clampPosition(position + delta, duration);
}

export function progressRatio(position: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(1, Math.max(0, position / duration));
}

/** Resume only when the viewer is past the intro but before the credits. */
export function isResumable(
  position: number,
  duration: number,
  minSec = RESUME_MIN_SEC,
  completeRatio = RESUME_COMPLETE_RATIO,
): boolean {
  if (!Number.isFinite(position) || position < minSec) return false;
  if (!Number.isFinite(duration) || duration <= 0) return position >= minSec;
  return position / duration < completeRatio;
}

/** `0` → `0:00`, `65` → `1:05`, `3661` → `1:01:01`. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const padded = rest.toString().padStart(2, "0");

  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${padded}`;
  return `${minutes}:${padded}`;
}

export function qualityLabel(height: number): string {
  return height > 0 ? `${height}p` : "Auto";
}

export function resumeKey(titleId: string, season?: number, number?: number): string {
  if (season === undefined || number === undefined) return `ongx:resume:${titleId}`;
  return `ongx:resume:${titleId}:s${season}:e${number}`;
}

/** Stored positions are untrusted; anything malformed counts as "start over". */
export function parseStoredPosition(raw: string | null): number {
  if (!raw) return 0;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 1;
  return Math.min(1, Math.max(0, volume));
}

export interface PlayerSnapshot {
  playing: boolean;
  muted: boolean;
  volume: number;
  position: number;
  duration: number;
  /** -1 means automatic quality selection. */
  level: number;
}

export const initialPlayerState: PlayerSnapshot = {
  playing: false,
  muted: false,
  volume: 1,
  position: 0,
  duration: 0,
  level: -1,
};

export type PlayerAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "togglePlay" }
  | { type: "mute"; muted: boolean }
  | { type: "volume"; volume: number }
  | { type: "time"; position: number; duration?: number }
  | { type: "duration"; duration: number }
  | { type: "level"; level: number };

export function playerReducer(state: PlayerSnapshot, action: PlayerAction): PlayerSnapshot {
  switch (action.type) {
    case "play":
      return { ...state, playing: true };
    case "pause":
      return { ...state, playing: false };
    case "togglePlay":
      return { ...state, playing: !state.playing };
    case "mute":
      return { ...state, muted: action.muted };
    case "volume": {
      const volume = clampVolume(action.volume);
      return { ...state, volume, muted: volume === 0 };
    }
    case "duration":
      return { ...state, duration: Math.max(0, action.duration) };
    case "time":
      return {
        ...state,
        position: clampPosition(action.position, action.duration ?? state.duration),
        ...(action.duration !== undefined ? { duration: Math.max(0, action.duration) } : {}),
      };
    case "level":
      return { ...state, level: action.level };
    default:
      return state;
  }
}
