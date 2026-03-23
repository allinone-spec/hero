"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Shape = "circle" | "hexagon" | "shield";
type IconType = "none" | "star" | "cross" | "eagle";

interface DesignerProps {
  onClose: () => void;
  onSave: (url: string) => void;
}

const CANVAS_SIZE = 256;
const CX = CANVAS_SIZE / 2;
const CY = CANVAS_SIZE / 2;

function drawHexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawShieldPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r * 0.5);
  ctx.lineTo(cx - r, cy + r * 0.15);
  ctx.quadraticCurveTo(cx - r, cy + r * 0.85, cx, cy + r);
  ctx.quadraticCurveTo(cx + r, cy + r * 0.85, cx + r, cy + r * 0.15);
  ctx.lineTo(cx + r, cy - r * 0.5);
  ctx.quadraticCurveTo(cx + r, cy - r, cx, cy - r);
  ctx.quadraticCurveTo(cx - r, cy - r, cx - r, cy - r * 0.5);
  ctx.closePath();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number, points: number, color: string) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCross(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  const arm = r * 0.28;
  const thick = r * 0.1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(cx - thick, cy - arm, thick * 2, arm * 2, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx - arm, cy - thick, arm * 2, thick * 2, 3);
  ctx.fill();
}

function drawEagle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  // Simplified eagle silhouette using bezier curves
  ctx.fillStyle = color;
  const s = r * 0.55;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s / 40, s / 40);

  ctx.beginPath();
  // Body
  ctx.ellipse(0, 5, 12, 18, 0, 0, Math.PI * 2);
  // Left wing
  ctx.moveTo(-12, -2);
  ctx.bezierCurveTo(-25, -10, -38, -5, -40, 5);
  ctx.bezierCurveTo(-30, 2, -18, 6, -12, 10);
  // Right wing
  ctx.moveTo(12, -2);
  ctx.bezierCurveTo(25, -10, 38, -5, 40, 5);
  ctx.bezierCurveTo(30, 2, 18, 6, 12, 10);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(0, -16, 7, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.beginPath();
  ctx.moveTo(5, -15);
  ctx.lineTo(14, -12);
  ctx.lineTo(7, -10);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export default function MedalAvatarDesigner({ onClose, onSave }: DesignerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [shape, setShape] = useState<Shape>("circle");
  const [fillColor, setFillColor] = useState("#c8a840");
  const [borderColor, setBorderColor] = useState("#7a5c10");
  const [borderWidth, setBorderWidth] = useState(10);
  const [innerRing, setInnerRing] = useState(true);
  const [innerRingColor, setInnerRingColor] = useState("#7a5c10");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [transparent, setTransparent] = useState(false);
  const [icon, setIcon] = useState<IconType>("star");
  const [iconColor, setIconColor] = useState("#1a1a2e");
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState("#1a1a2e");
  const [saving, setSaving] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const r = CANVAS_SIZE / 2 - borderWidth / 2 - 4;

    // Background
    if (!transparent) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    // Shape path helper
    const applyShape = () => {
      if (shape === "circle") {
        ctx.beginPath();
        ctx.arc(CX, CY, r, 0, Math.PI * 2);
      } else if (shape === "hexagon") {
        drawHexPath(ctx, CX, CY, r);
      } else {
        drawShieldPath(ctx, CX, CY, r);
      }
    };

    // Fill
    applyShape();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Border
    applyShape();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.stroke();

    // Inner ring
    if (innerRing) {
      const ir = r * 0.78;
      if (shape === "circle") {
        ctx.beginPath();
        ctx.arc(CX, CY, ir, 0, Math.PI * 2);
      } else if (shape === "hexagon") {
        drawHexPath(ctx, CX, CY, ir);
      } else {
        drawShieldPath(ctx, CX, CY * 0.98, ir * 0.88);
      }
      ctx.strokeStyle = innerRingColor;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Icon
    const iconR = r * 0.38;
    if (icon === "star") {
      drawStar(ctx, CX, CY, iconR, iconR * 0.4, 5, iconColor);
    } else if (icon === "cross") {
      drawCross(ctx, CX, CY, r, iconColor);
    } else if (icon === "eagle") {
      drawEagle(ctx, CX, CY, r, iconColor);
    }

    // Text (shown when no icon or combined)
    if (text && icon === "none") {
      const fontSize = Math.max(20, r * 0.46);
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text.toUpperCase(), CX, CY);
    }
  }, [
    shape, fillColor, borderColor, borderWidth,
    innerRing, innerRingColor, bgColor, transparent,
    icon, iconColor, text, textColor,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    canvas.toBlob(async (blob) => {
      if (!blob) { setSaving(false); return; }
      const formData = new FormData();
      formData.append("file", blob, "medal-avatar.png");
      formData.append("folder", "Heroes/Medal");
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url) {
          onSave(data.url);
        }
      } catch {
        // silent
      }
      setSaving(false);
    }, "image/png");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-bold">Medal Avatar Designer</h2>
          <button onClick={onClose} className="theme-toggle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex gap-0 flex-col sm:flex-row">
          {/* Controls */}
          <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[70vh]">

            {/* Shape */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">Shape</label>
              <div className="flex gap-2">
                {(["circle", "hexagon", "shield"] as Shape[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setShape(s)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      shape === s
                        ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)]/50"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors row 1 */}
            <div className="grid grid-cols-2 gap-3">
              <ColorPicker label="Fill Color" value={fillColor} onChange={setFillColor} />
              <ColorPicker label="Border Color" value={borderColor} onChange={setBorderColor} />
            </div>

            {/* Border width */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1 block">
                Border Width <span className="text-[var(--color-gold)]">{borderWidth}px</span>
              </label>
              <input
                type="range" min={2} max={24} value={borderWidth}
                onChange={(e) => setBorderWidth(Number(e.target.value))}
                className="w-full accent-[var(--color-gold)]"
              />
            </div>

            {/* Inner ring */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Inner Ring</label>
              <div className="flex items-center gap-2">
                {innerRing && <ColorPicker label="" value={innerRingColor} onChange={setInnerRingColor} compact />}
                <button
                  onClick={() => setInnerRing(!innerRing)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${innerRing ? "bg-[var(--color-gold)]" : "bg-[var(--color-border)]"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${innerRing ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>

            {/* Background */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Background</label>
              <div className="flex items-center gap-2">
                {!transparent && <ColorPicker label="" value={bgColor} onChange={setBgColor} compact />}
                <button
                  onClick={() => setTransparent(!transparent)}
                  className={`px-3 py-1 rounded text-xs border transition-colors ${
                    transparent
                      ? "border-[var(--color-gold)] text-[var(--color-gold)] bg-[var(--color-gold)]/10"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {transparent ? "Transparent" : "Color"}
                </button>
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 block">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {(["none", "star", "cross", "eagle"] as IconType[]).map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      icon === ic
                        ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-gold)]/50"
                    }`}
                  >
                    {ic === "none" ? "None" : ic.charAt(0).toUpperCase() + ic.slice(1)}
                  </button>
                ))}
              </div>
              {icon !== "none" && (
                <div className="mt-2">
                  <ColorPicker label="Icon Color" value={iconColor} onChange={setIconColor} />
                </div>
              )}
            </div>

            {/* Text (only when no icon) */}
            {icon === "none" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Abbreviation</label>
                  <input
                    type="text"
                    value={text}
                    maxLength={5}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. MOH"
                    className="admin-input text-center font-bold uppercase"
                  />
                </div>
                <ColorPicker label="Text Color" value={textColor} onChange={setTextColor} />
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="flex flex-col items-center justify-center gap-4 p-6 bg-[var(--color-bg)] border-t sm:border-t-0 sm:border-l border-[var(--color-border)] min-w-[220px]">
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Preview</p>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="rounded-xl shadow-lg"
              style={{ width: 160, height: 160 }}
            />
            <p className="text-xs text-[var(--color-text-muted)] text-center">
              256 × 256 px
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? "Uploading..." : "Use This Design"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Small helper ──────────────────────────────────────────── */
function ColorPicker({
  label,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-10 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0.5"
        title={label || "Pick color"}
      />
    );
  }
  return (
    <div>
      {label && (
        <label className="text-xs text-[var(--color-text-muted)] mb-1 block">{label}</label>
      )}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-1"
        />
        <span className="text-xs text-[var(--color-text-muted)] font-mono">{value}</span>
      </div>
    </div>
  );
}
