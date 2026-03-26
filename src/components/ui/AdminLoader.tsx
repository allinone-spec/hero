import type { CSSProperties } from "react";

const BASE = 56;

/** Orbit size for all full-page / route loading states (admin + public). */
export const ADMIN_PAGE_LOADER_ORBIT_PX = 72;

/** Smaller orbit for dense panels / modals. */
export const ADMIN_COMPACT_LOADER_ORBIT_PX = 56;

export type AdminLoaderOrbitVariant = "brand" | "inherit";

/** Same 3-D ring + star as the admin page loader; scales for buttons and dense UI. */
export function AdminLoaderOrbit({
  size = BASE,
  variant = "brand",
}: {
  size?: number;
  variant?: AdminLoaderOrbitVariant;
}) {
  const scale = size / BASE;
  const outer = BASE * scale;
  const innerPad = 11 * scale;
  const bo = Math.max(1.5, 3 * scale);
  const bi = Math.max(1.25, 2.5 * scale);
  const fs = Math.max(7, 14 * scale);

  const outerTop = variant === "brand" ? "var(--color-gold)" : "currentColor";
  const outerRight = variant === "brand" ? "var(--color-gold)" : "currentColor";
  const innerTop = variant === "brand" ? "var(--color-gold-light)" : "currentColor";
  const innerLeft = variant === "brand" ? "var(--color-gold-light)" : "currentColor";
  const innerOpacity = variant === "inherit" ? 0.7 : 1;
  const starColor = variant === "brand" ? "var(--color-gold)" : "currentColor";

  return (
    <div className="shrink-0" style={{ position: "relative", width: outer, height: outer }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `${bo}px solid transparent`,
          borderTopColor: outerTop,
          borderRightColor: outerRight,
          animation: "ring3d 1.3s linear infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: innerPad,
          left: innerPad,
          right: innerPad,
          bottom: innerPad,
          borderRadius: "50%",
          border: `${bi}px solid transparent`,
          borderTopColor: innerTop,
          borderLeftColor: innerLeft,
          opacity: innerOpacity,
          animation: "spin 0.9s linear infinite reverse",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: starColor,
          fontSize: fs,
          fontWeight: 700,
          animation: "pulse 1.6s ease-in-out infinite",
        }}
      >
        ★
      </div>
    </div>
  );
}

export function AdminLoader({
  label = "Loading…",
  fullscreen = false,
  compact = false,
}: {
  label?: string;
  /** Full viewport while auth / route gate (e.g. admin shell not ready). */
  fullscreen?: boolean;
  /** In-panel load: smaller orbit, less vertical space. */
  compact?: boolean;
}) {
  const orbitSize = compact ? ADMIN_COMPACT_LOADER_ORBIT_PX : ADMIN_PAGE_LOADER_ORBIT_PX;

  const wrap = fullscreen
    ? "fixed inset-0 z-[200] flex min-h-dvh w-full flex-col items-center justify-center gap-6"
    : compact
      ? "flex w-full flex-col items-center justify-center gap-3 py-10"
      : "flex w-full min-h-[calc(100svh-5rem)] flex-col items-center justify-center gap-6";

  const labelStyle: CSSProperties = compact
    ? {
        color: "var(--color-text-muted)",
        fontSize: "0.65rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }
    : {
        color: "var(--color-text-muted)",
        fontSize: "0.75rem",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
      };

  return (
    <div
      className={wrap}
      style={fullscreen ? { backgroundColor: "var(--color-bg)" } : undefined}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <AdminLoaderOrbit size={orbitSize} variant="brand" />
      <p style={labelStyle}>{label}</p>
    </div>
  );
}
