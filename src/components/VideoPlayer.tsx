import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { getStreamUrl, getAudioUrl, formatTime } from "../api";
import { PlayIcon, PauseIcon, VolIcon, MuteIcon } from "./Icons";
import { glassDark, progressTrack, progressFill, volTrack, volFill } from "../styles";

export interface VideoPlayerHandle {
  getVideo: () => HTMLVideoElement | null;
}

interface Props {
  slug: string;
  fileType?: string | null;
  hasAudio?: boolean;
  isActive: boolean;
  onDoubleTap?: () => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(
  ({ slug, fileType, hasAudio, isActive, onDoubleTap }, ref) => {
    const vRef = useRef<HTMLVideoElement>(null);
    const aRef = useRef<HTMLAudioElement>(null);
    const barRef = useRef<HTMLDivElement>(null);
    const volRef = useRef<HTMLDivElement>(null);

    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [vol, setVol] = useState(0.7);
    const [prog, setProg] = useState(0);
    const [dur, setDur] = useState(0);
    const [cur, setCur] = useState(0);
    const [showCtrl, setShowCtrl] = useState(false);
    const [showVol, setShowVol] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const lastTap = useRef(0);

    const isVideo = fileType?.startsWith("video/");
    const url = isVideo ? getStreamUrl(slug) : null;
    const audioUrl = hasAudio ? getAudioUrl(slug) : null;

    useImperativeHandle(ref, () => ({ getVideo: () => vRef.current }));

    useEffect(() => {
      const v = vRef.current;
      const a = aRef.current;
      if (!v) return;
      if (isActive) {
        v.muted = muted; v.volume = vol;
        v.play().then(() => { setPlaying(true); if (a) { a.muted = muted; a.volume = vol; a.play(); } }).catch(() => {});
      } else {
        v.pause(); v.currentTime = 0;
        if (a) { a.pause(); a.currentTime = 0; }
        setPlaying(false); setProg(0); setCur(0);
      }
    }, [isActive]);

    useEffect(() => {
      const v = vRef.current; const a = aRef.current;
      if (v) { v.muted = muted; v.volume = vol; }
      if (a) { a.muted = muted; a.volume = vol; }
    }, [muted, vol]);

    const brief = () => {
      setShowCtrl(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowCtrl(false), 2500);
    };

    const handleClick = useCallback(() => {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        onDoubleTap?.();
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current !== 0) {
          const v = vRef.current; const a = aRef.current;
          if (!v) return;
          if (v.paused) { v.play(); if (a) a.play(); }
          else { v.pause(); if (a) a.pause(); }
          brief();
        }
      }, 300);
    }, [onDoubleTap]);

    if (!isVideo) return null;

    return (
      <div style={{ position: "relative", width: "100%", height: "100%", background: "#000", overflow: "hidden" }}>
        <video
          ref={vRef} src={url ?? undefined}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          loop playsInline muted={muted}
          preload={isActive ? "auto" : "metadata"}
          onTimeUpdate={() => { const v = vRef.current; if (v) { setCur(v.currentTime); if (v.duration) setProg(v.currentTime / v.duration * 100); } }}
          onLoadedMetadata={() => { if (vRef.current) setDur(vRef.current.duration); }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={handleClick}
        />
        {hasAudio && audioUrl && <audio ref={aRef} src={audioUrl} loop preload={isActive ? "auto" : "none"} />}

        {/* bottom gradient */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 30%)", pointerEvents: "none" }} />

        {/* center play/pause */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", opacity: showCtrl ? 1 : 0, transition: "opacity 0.2s" }}>
          <div style={{ ...glassDark, borderRadius: "50%", width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {playing ? <PauseIcon size={24} style={{ color: "#fff" }} /> : <PlayIcon size={24} style={{ color: "#fff" }} />}
          </div>
        </div>

        {/* volume — top left, YouTube Shorts style */}
        <div
          style={{ position: "absolute", left: 10, top: 10, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
          onMouseEnter={() => setShowVol(true)} onMouseLeave={() => setShowVol(false)}
        >
          <button onClick={() => setMuted(m => !m)}
            style={{ ...glassDark, borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", border: "none" }}>
            {muted || vol === 0 ? <MuteIcon size={15} /> : <VolIcon size={15} />}
          </button>
          {showVol && (
            <div ref={volRef} style={{ ...volTrack, animation: "fadeIn 0.15s" }}
              onClick={(e) => {
                const b = volRef.current; if (!b) return;
                const r = b.getBoundingClientRect();
                const nv = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
                setVol(nv); if (nv === 0) setMuted(true); else if (muted) setMuted(false);
              }}>
              <div style={{ ...volFill, height: `${vol * 100}%` }} />
            </div>
          )}
        </div>

        {/* thin progress always visible at very bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.12)", zIndex: 5 }}>
          <div style={{ height: "100%", width: `${prog}%`, background: "rgba(255,255,255,0.65)", transition: "width 0.1s linear" }} />
        </div>

        {/* full controls on hover */}
        <div style={{ position: "absolute", bottom: 2, left: 0, right: 0, padding: "20px 14px 10px", opacity: showCtrl ? 1 : 0, transition: "opacity 0.2s", pointerEvents: showCtrl ? "auto" : "none" }}>
          <div ref={barRef} style={{ ...progressTrack, height: 4 }}
            onClick={(e) => { const v = vRef.current; const b = barRef.current; const a = aRef.current;
              if (!v || !b) return; const r = b.getBoundingClientRect(); const t = ((e.clientX - r.left) / r.width) * v.duration;
              v.currentTime = t; if (a) a.currentTime = t;
            }}>
            <div style={{ ...progressFill, width: `${prog}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums" }}>
            <span>{formatTime(cur)}</span><span>{formatTime(dur)}</span>
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
