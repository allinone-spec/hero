export function AdminLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
      <div style={{ position: "relative", width: 56, height: 56 }}>
        {/* outer ring — tilted 3-D orbit */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "3px solid transparent",
          borderTopColor: "var(--color-gold)",
          borderRightColor: "var(--color-gold)",
          animation: "ring3d 1.3s linear infinite",
        }} />
        {/* inner ring — flat counter-spin */}
        <div style={{
          position: "absolute", inset: 11, borderRadius: "50%",
          border: "2.5px solid transparent",
          borderTopColor: "var(--color-gold-light)",
          borderLeftColor: "var(--color-gold-light)",
          animation: "spin 0.9s linear infinite reverse",
        }} />
        {/* centre star */}
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "var(--color-gold)", fontSize: 14, fontWeight: 700,
          animation: "pulse 1.6s ease-in-out infinite",
        }}>★</div>
      </div>
      <p style={{
        color: "var(--color-text-muted)", fontSize: "0.7rem",
        letterSpacing: "0.15em", textTransform: "uppercase",
      }}>{label}</p>
    </div>
  );
}
