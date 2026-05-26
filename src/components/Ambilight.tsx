import { useRef, useEffect } from "react";

interface Props {
  videoEl: HTMLVideoElement | null;
  active: boolean;
  enabled: boolean;
}

export function Ambilight({ videoEl, active, enabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const lastDraw = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoEl || !active || !enabled) {
      // Clear canvas when disabled
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = 6;
    canvas.height = 10;

    const sample = () => {
      if (!active || !enabled) return;
      if (videoEl.paused || videoEl.ended) {
        frameRef.current = requestAnimationFrame(sample);
        return;
      }
      // Throttle to ~8fps to save CPU
      const now = performance.now();
      if (now - lastDraw.current > 125) {
        lastDraw.current = now;
        try { ctx.drawImage(videoEl, 0, 0, 6, 10); } catch {}
      }
      frameRef.current = requestAnimationFrame(sample);
    };

    frameRef.current = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(frameRef.current);
  }, [videoEl, active, enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        filter: "blur(70px) saturate(2) brightness(0.55)",
        transform: "scale(1.5)",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.8,
      }}
    />
  );
}
