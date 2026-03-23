export default function Loading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      {/* 3D ring loader */}
      <div style={{ position: "relative", width: 72, height: 72 }}>
        {/* Outer ring — tilted 3D orbit */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid transparent",
            borderTopColor: "var(--color-gold)",
            borderRightColor: "var(--color-gold)",
            animation: "ring3d 1.3s linear infinite",
          }}
        />
        {/* Middle ring — flat counter-spin */}
        <div
          style={{
            position: "absolute",
            inset: 14,
            borderRadius: "50%",
            border: "3px solid transparent",
            borderTopColor: "var(--color-gold-light)",
            borderLeftColor: "var(--color-gold-light)",
            animation: "spin 0.9s linear infinite reverse",
          }}
        />
        {/* Center star */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-gold)",
            fontSize: 18,
            fontWeight: 700,
            animation: "pulse 1.6s ease-in-out infinite",
          }}
        >
          ★
        </div>
      </div>

      <p
        style={{
          color: "var(--color-text-muted)",
          fontSize: "0.75rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        Loading Archive…
      </p>
    </div>
  );
}
