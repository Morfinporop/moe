import { useRef, useEffect } from "react";

interface Props {
  videoEl: HTMLVideoElement | null;
  active: boolean;
}

export function Ambilight({ videoEl, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoEl || !active) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = 8;
    canvas.height = 14;

    const sample = () => {
      if (videoEl.paused || videoEl.ended || !active) return;
      try {
        ctx.drawImage(videoEl, 0, 0, 8, 14);
      } catch { /* crossorigin */ }
      frameRef.current = requestAnimationFrame(sample);
    };

    frameRef.current = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(frameRef.current);
  }, [videoEl, active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        filter: "blur(60px) saturate(2.5) brightness(0.6)",
        transform: "scale(1.4)",
        objectFit: "cover",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.85,
      }}
    />
  );
}
