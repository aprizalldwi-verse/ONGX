"use client";

import { Button } from "@ongx/ui";
import type HlsJs from "hls.js";
import type { ErrorData } from "hls.js";
import {
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useReducer, useRef, useState, type KeyboardEvent } from "react";

import {
  clampPosition,
  formatClock,
  initialPlayerState,
  isResumable,
  parseStoredPosition,
  playerReducer,
  progressRatio,
  qualityLabel,
  seekTarget,
} from "@/lib/player-state";

export interface PlayerProps {
  src: string;
  title: string;
  poster?: string | undefined;
  /** localStorage key used to resume playback. */
  storageKey: string;
  onProgress?: ((position: number, duration: number) => void) | undefined;
}

interface LevelOption {
  index: number;
  height: number;
}

interface SubtitleOption {
  index: number;
  label: string;
}

export function Player({ src, title, poster, storageKey, onProgress }: PlayerProps) {
  const t = useTranslations("player");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<HlsJs | null>(null);
  const lastSavedRef = useRef(0);
  const progressRef = useRef(onProgress);

  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleOption[]>([]);
  const [subtitle, setSubtitle] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [resumedFrom, setResumedFrom] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    progressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let disposed = false;
    let hls: HlsJs | null = null;

    setError(false);
    setLoading(true);
    setLevels([]);
    setSubtitles([]);
    setSubtitle(-1);

    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";

    if (nativeHls) {
      video.src = src;
    } else {
      void (async () => {
        const { default: Hls, ErrorTypes, Events } = await import("hls.js");
        if (disposed) return;

        if (!Hls.isSupported()) {
          setError(true);
          setLoading(false);
          return;
        }

        hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Events.MANIFEST_PARSED, () => {
          if (disposed || !hls) return;
          setLevels(hls.levels.map((level, index) => ({ index, height: level.height })));
          setSubtitles(
            hls.subtitleTracks.map((track, index) => ({
              index,
              label: track.name || track.lang || `#${index + 1}`,
            })),
          );
          setLoading(false);
        });

        hls.on(Events.ERROR, (_event, data: ErrorData) => {
          if (disposed || !data.fatal || !hls) return;

          if (data.type === ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
            return;
          }

          if (data.type === ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            return;
          }

          setError(true);
          setLoading(false);
          hls.destroy();
        });
      })();
    }

    return () => {
      disposed = true;
      hls?.destroy();
      if (hlsRef.current === hls) hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [src, attempt]);

  useEffect(() => {
    function onChange(): void {
      setFullscreen(document.fullscreenElement === containerRef.current);
    }

    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function togglePlay(): void {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => setError(true));
    } else {
      video.pause();
    }
  }

  function seekBy(delta: number): void {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seekTarget(video.currentTime, delta, video.duration);
    dispatch({ type: "time", position: video.currentTime, duration: video.duration });
  }

  function seekTo(value: number): void {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = clampPosition(value, video.duration);
    dispatch({ type: "time", position: video.currentTime, duration: video.duration });
  }

  function changeVolume(value: number): void {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    dispatch({ type: "volume", volume: value });
  }

  function toggleMute(): void {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    dispatch({ type: "mute", muted: video.muted });
  }

  function changeLevel(index: number): void {
    dispatch({ type: "level", level: index });
    const hls = hlsRef.current;
    if (hls) hls.currentLevel = index;
  }

  function changeSubtitle(index: number): void {
    setSubtitle(index);
    const hls = hlsRef.current;
    if (!hls) return;
    hls.subtitleTrack = index;
    hls.subtitleDisplay = index >= 0;
  }

  async function toggleFullscreen(): Promise<void> {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await container.requestFullscreen();
    } catch {
      // Fullscreen can be denied by the browser; the button simply does nothing.
    }
  }

  async function togglePip(): Promise<void> {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // PiP is unavailable or blocked; ignore.
    }
  }

  function handleTimeUpdate(): void {
    const video = videoRef.current;
    if (!video) return;

    dispatch({
      type: "time",
      position: video.currentTime,
      ...(Number.isFinite(video.duration) ? { duration: video.duration } : {}),
    });

    if (Number.isFinite(video.duration) && video.duration > 0) {
      const now = Date.now();
      if (now - lastSavedRef.current > 5_000) {
        lastSavedRef.current = now;
        try {
          window.localStorage.setItem(storageKey, String(Math.floor(video.currentTime)));
        } catch {
          // Private mode: progress is simply not persisted.
        }
      }
      progressRef.current?.(video.currentTime, video.duration);
    }
  }

  function handleLoadedMetadata(): void {
    const video = videoRef.current;
    if (!video) return;

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    dispatch({ type: "duration", duration });

    let stored = 0;
    try {
      stored = parseStoredPosition(window.localStorage.getItem(storageKey));
    } catch {
      stored = 0;
    }

    if (isResumable(stored, duration)) {
      video.currentTime = stored;
      setResumedFrom(stored);
    }

    setLoading(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === " " || event.key.toLowerCase() === "k") {
      event.preventDefault();
      togglePlay();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekBy(-10);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      seekBy(10);
      return;
    }
    if (event.key.toLowerCase() === "m") {
      event.preventDefault();
      toggleMute();
      return;
    }
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      void toggleFullscreen();
    }
  }

  const ratio = progressRatio(state.position, state.duration);
  const durationLabel = formatClock(state.duration);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={title}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-black outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black"
        onClick={togglePlay}
        onPlay={() => dispatch({ type: "play" })}
        onPause={() => dispatch({ type: "pause" })}
        onEnded={() => dispatch({ type: "pause" })}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onVolumeChange={() => {
          const video = videoRef.current;
          if (video) dispatch({ type: "mute", muted: video.muted });
        }}
      />

      {loading && !error ? (
        <div className="absolute inset-0 grid place-items-center bg-black/40 text-sm text-white">
          {t("loading")}
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-4 text-center text-white">
          <div className="space-y-3">
            <p className="text-sm">{t("error")}</p>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setAttempt((value) => value + 1);
                setError(false);
              }}
            >
              {t("retry")}
            </Button>
          </div>
        </div>
      ) : null}

      {resumedFrom !== null ? (
        <p className="absolute left-3 top-3 rounded-full bg-black/75 px-2.5 py-1 text-[11px] text-white backdrop-blur">
          {t("resume", { time: formatClock(resumedFrom) })}
        </p>
      ) : null}

      <div className="space-y-1.5 bg-gradient-to-t from-black via-black/85 to-transparent px-3 pb-3 pt-6 text-white">
        <input
          type="range"
          min={0}
          max={state.duration > 0 ? state.duration : 1}
          step={0.1}
          value={state.position}
          onChange={(event) => seekTo(Number(event.target.value))}
          aria-label={t("seekForward")}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-[var(--accent)]"
          style={{
            background: `linear-gradient(to right, var(--accent) ${ratio * 100}%, rgba(255,255,255,0.25) ${ratio * 100}%)`,
          }}
        />

        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            aria-label={state.playing ? t("pause") : t("play")}
            className="text-white hover:bg-white/15"
          >
            {state.playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => seekBy(-10)}
            aria-label={t("seekBack")}
            className="text-white hover:bg-white/15"
          >
            <RotateCcw aria-hidden="true" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => seekBy(10)}
            aria-label={t("seekForward")}
            className="text-white hover:bg-white/15"
          >
            <RotateCw aria-hidden="true" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            aria-label={state.muted ? t("unmute") : t("mute")}
            className="text-white hover:bg-white/15"
          >
            {state.muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </Button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={state.muted ? 0 : state.volume}
            onChange={(event) => changeVolume(Number(event.target.value))}
            aria-label={t("volume")}
            className="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-white/25 accent-[var(--accent)]"
          />

          <span className="ml-1 text-[11px] tabular-nums text-white/80">
            {formatClock(state.position)} / {durationLabel}
          </span>

          <span className="flex-1" />

          {levels.length > 0 ? (
            <label className="inline-flex items-center gap-1 text-[11px] text-white/80">
              <span className="sr-only">{t("quality")}</span>
              <select
                value={state.level}
                onChange={(event) => changeLevel(Number(event.target.value))}
                className="h-8 rounded-[var(--radius)] border border-white/20 bg-black/60 px-1.5 text-[11px] text-white outline-none"
              >
                <option value={-1}>{t("auto")}</option>
                {[...levels]
                  .sort((a, b) => b.height - a.height)
                  .map((level) => (
                    <option key={level.index} value={level.index}>
                      {qualityLabel(level.height)}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}

          {subtitles.length > 0 ? (
            <label className="inline-flex items-center gap-1 text-[11px] text-white/80">
              <span className="sr-only">{t("subtitles")}</span>
              <select
                value={subtitle}
                onChange={(event) => changeSubtitle(Number(event.target.value))}
                className="h-8 rounded-[var(--radius)] border border-white/20 bg-black/60 px-1.5 text-[11px] text-white outline-none"
              >
                <option value={-1}>{t("subtitlesOff")}</option>
                {subtitles.map((track) => (
                  <option key={track.index} value={track.index}>
                    {track.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void togglePip()}
            aria-label={t("pip")}
            className="text-white hover:bg-white/15"
          >
            <PictureInPicture2 aria-hidden="true" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void toggleFullscreen()}
            aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
            className="text-white hover:bg-white/15"
          >
            {fullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
