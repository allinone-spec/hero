const BASE = 56;

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
  /** Full viewport (admin shell while checking session). */
  fullscreen?: boolean;
  /** Less vertical padding (modals, secondary panels). */
  compact?: boolean;
}) {
  const wrap = fullscreen
    ? "min-h-screen flex flex-col items-center justify-center gap-6"
    : compact
      ? "flex flex-col items-center justify-center py-8 gap-3"
      : "flex flex-col items-center justify-center py-16 gap-5";

  const orbitSize = fullscreen ? 72 : 56;

  return (
    <div
      className={wrap}
      style={fullscreen ? { backgroundColor: "var(--color-bg)" } : undefined}
    >
      <AdminLoaderOrbit size={orbitSize} variant="brand" />
      <p
        style={{
          color: "var(--color-text-muted)",
          fontSize: fullscreen ? "0.75rem" : compact ? "0.65rem" : "0.7rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
    </div>
  );
}
