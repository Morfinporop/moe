import { CSSProperties } from "react";

export const glass: CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.8)",
  boxShadow: "0 1px 12px rgba(0,0,0,0.04)",
};

export const glassDark: CSSProperties = {
  background: "rgba(0,0,0,0.3)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
};

export const gradientAccent: CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(240,240,245,0.9))",
};

export const actionBtn: CSSProperties = {
  ...glassDark,
  borderRadius: "50%",
  width: 46,
  height: 46,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  transition: "transform 0.12s",
};

export const navBtn: CSSProperties = {
  ...glass,
  borderRadius: "50%",
  width: 42,
  height: 42,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#666",
  cursor: "pointer",
  transition: "transform 0.12s",
};

export const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: "rgba(255,255,255,0.4)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const modal: CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  borderRadius: 24,
  width: "100%",
  maxWidth: 420,
  maxHeight: "85dvh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  border: "1px solid rgba(255,255,255,0.9)",
  boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
  margin: 16,
};

export const sheet: CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  borderRadius: "20px 20px 0 0",
  maxHeight: "75dvh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  border: "1px solid rgba(255,255,255,0.8)",
  borderBottom: "none",
  boxShadow: "0 -2px 24px rgba(0,0,0,0.06)",
};

export const input: CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 12,
  background: "rgba(0,0,0,0.03)",
  border: "1px solid rgba(0,0,0,0.06)",
  fontSize: 14,
  color: "#1c1c1e",
};

export const progressTrack: CSSProperties = {
  height: 3,
  background: "rgba(255,255,255,0.25)",
  borderRadius: 2,
  overflow: "hidden",
  cursor: "pointer",
};

export const progressFill: CSSProperties = {
  height: "100%",
  background: "rgba(255,255,255,0.85)",
  borderRadius: 2,
  transition: "width 0.1s linear",
};

export const volTrack: CSSProperties = {
  width: 4,
  height: 80,
  background: "rgba(255,255,255,0.2)",
  borderRadius: 2,
  position: "relative",
  cursor: "pointer",
};

export const volFill: CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  background: "rgba(255,255,255,0.85)",
  borderRadius: 2,
};
