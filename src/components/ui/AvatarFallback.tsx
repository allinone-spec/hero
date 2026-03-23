/**
 * AvatarFallback — generates an initials avatar with a consistent
 * color derived from the name. Works in both dark and light themes.
 */

const PALETTE = [
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#a855f7", // purple-500
  "#84cc16", // lime-500
  "#e11d48", // rose-600
  "#0284c7", // sky-600
  "#7c3aed", // violet-600
  "#059669", // emerald-600
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarFallbackProps {
  name: string;
  size?: number;        // px, default 40
  shape?: "circle" | "rounded"; // default circle
  fontSize?: number;    // px, auto-calculated if omitted
  className?: string;
}

export default function AvatarFallback({
  name,
  size = 40,
  shape = "circle",
  fontSize,
  className = "",
}: AvatarFallbackProps) {
  const bg = colorFromName(name);
  const initials = getInitials(name);
  const fs = fontSize ?? Math.round(size * 0.38);
  const radius = shape === "circle" ? "50%" : "10px";

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "#ffffff",
        fontSize: fs,
        fontWeight: 700,
        letterSpacing: "0.03em",
        userSelect: "none",
        lineHeight: 1,
      }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}

/** Medal-specific: auto-contrasting text on ribbon color background */
export function medalTextColor(hexBg: string): string {
  try {
    const r = parseInt(hexBg.slice(1, 3), 16) / 255;
    const g = parseInt(hexBg.slice(3, 5), 16) / 255;
    const b = parseInt(hexBg.slice(5, 7), 16) / 255;
    // Relative luminance (WCAG formula)
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.45 ? "#1a1a2e" : "#ffffff";
  } catch {
    return "#ffffff";
  }
}
