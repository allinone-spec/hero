"use client";

import { RIBBON_WIDTH, RIBBON_HEIGHT, RIBBON_GAP, MAX_RIBBONS_PER_ROW } from "./ribbon-data";
import type { MedalDeviceRule } from "@/lib/medal-device-rules";
import { getRibbonRackProfile, sortRackMedals } from "@/lib/rack-engine";
import {
  computeDevices,
  layoutDevices,
  starPoints,
  PositionedDevice,
} from "./ribbon-devices";

export interface DeviceImage {
  url: string;
  deviceType: string;
  count: number;
}

export interface RibbonMedal {
  medalId?: string;
  name: string;
  count: number;
  precedenceOrder: number;
  ribbonColors: string[];
  ribbonImageUrl?: string;
  hasValor: boolean;
  arrowheads?: number;
  isUnitCitation?: boolean;
  deviceImages?: DeviceImage[];
  /** MedalType.deviceLogic — drives Bar / Rosette / Clasp style devices */
  deviceLogic?: string;
  deviceRule?: MedalDeviceRule;
  countryCode?: string;
  serviceBranch?: string;
  wikiSummary?: string;
}

interface RibbonRackProps {
  medals: RibbonMedal[];
  maxPerRow?: number;
  gap?: number;
  scale?: number;
  disableLinks?: boolean;
  countryCode?: string;
  rowAlignment?: "flush" | "center" | "pyramid";
  /**
   * `rankListPyramid` — hero rank list: top row has 1–3 ribbons (by count mod 3), each row below has exactly 3;
   * rows are centered under `rowAlignment` pyramid/center (max 3 columns).
   */
  rowLayout?: "default" | "rankListPyramid";
  /** When set, ribbon clicks open a quick view (e.g. modal) instead of navigating away */
  onRibbonClick?: (medal: RibbonMedal) => void;
}

function snapPosition(value: number): number {
  return Math.round(value * 2) / 2;
}

function planRowSizes(totalRibbons: number, maxPerRow: number): number[] {
  if (totalRibbons <= 0) return [];
  const rowCount = Math.ceil(totalRibbons / maxPerRow);
  const baseSize = Math.floor(totalRibbons / rowCount);
  const remainder = totalRibbons % rowCount;
  return Array.from({ length: rowCount }, (_, idx) => baseSize + (idx >= rowCount - remainder ? 1 : 0));
}

const RANK_LIST_PYRAMID_MAX_COLS = 3;

/** Top row 1–3 ribbons; remaining rows are full rows of 3 (narrow top, wide bottom). */
function planRankListPyramidRowSizes(totalRibbons: number): number[] {
  if (totalRibbons <= 0) return [];
  if (totalRibbons <= RANK_LIST_PYRAMID_MAX_COLS) return [totalRibbons];
  const mod = totalRibbons % RANK_LIST_PYRAMID_MAX_COLS;
  const firstRow = mod === 0 ? RANK_LIST_PYRAMID_MAX_COLS : mod;
  const sizes = [firstRow];
  let remaining = totalRibbons - firstRow;
  while (remaining > 0) {
    sizes.push(RANK_LIST_PYRAMID_MAX_COLS);
    remaining -= RANK_LIST_PYRAMID_MAX_COLS;
  }
  return sizes;
}

// ── Global SVG defs (gradients + filter) ─────────────────────────────────────
// Defined once at SVG level; referenced by all device renderers.

function RackDefs() {
  return (
    <defs>
      {/* Silver star: bright highlight top-left → deep silver bottom-right */}
      <radialGradient id="rr-silver" cx="32%" cy="28%" r="68%" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stopColor="#FFFFFF" stopOpacity={0.98} />
        <stop offset="35%"  stopColor="#E0E0E0" />
        <stop offset="75%"  stopColor="#A8A8A8" />
        <stop offset="100%" stopColor="#6E6E6E" />
      </radialGradient>

      {/* Gold repeat-award star */}
      <radialGradient id="rr-gold" cx="32%" cy="28%" r="68%" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stopColor="#FFE090" stopOpacity={0.98} />
        <stop offset="35%"  stopColor="#D98030" />
        <stop offset="75%"  stopColor="#9A4E18" />
        <stop offset="100%" stopColor="#5C2800" />
      </radialGradient>

      {/* Bronze oak leaf cluster */}
      <radialGradient id="rr-bronze" cx="32%" cy="28%" r="68%" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stopColor="#F2CC8F" stopOpacity={0.98} />
        <stop offset="35%"  stopColor="#BC6C25" />
        <stop offset="75%"  stopColor="#8C4C15" />
        <stop offset="100%" stopColor="#5C2800" />
      </radialGradient>

      <radialGradient id="rr-service-bronze" cx="32%" cy="28%" r="68%" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stopColor="#F4D3A1" stopOpacity={0.98} />
        <stop offset="32%"  stopColor="#B87333" />
        <stop offset="72%"  stopColor="#7F4A1B" />
        <stop offset="100%" stopColor="#4F2D12" />
      </radialGradient>

      <radialGradient id="rr-brass" cx="34%" cy="26%" r="70%" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stopColor="#FFF1B3" stopOpacity={0.98} />
        <stop offset="38%"  stopColor="#D4AF37" />
        <stop offset="78%"  stopColor="#8A6A17" />
        <stop offset="100%" stopColor="#5E470E" />
      </radialGradient>

      <linearGradient id="rr-clasp" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#F7E39E" />
        <stop offset="35%" stopColor="#D1AE45" />
        <stop offset="65%" stopColor="#A07C21" />
        <stop offset="100%" stopColor="#6B5213" />
      </linearGradient>

      {/* Shared drop-shadow for all devices */}
      <filter id="rr-shadow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0.35" dy="0.55" stdDeviation="0.5"
          floodColor="#000" floodOpacity={0.55} />
      </filter>

      <filter id="rr-soft-shadow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0.2" dy="0.35" stdDeviation="0.32"
          floodColor="#000" floodOpacity={0.35} />
      </filter>
    </defs>
  );
}

function MetallicStar({
  cx,
  cy,
  fill,
  highlight,
  stroke,
  outerRadius = 2.8,
  innerRadius = 1.08,
}: {
  cx: number;
  cy: number;
  fill: string;
  highlight: string;
  stroke: string;
  outerRadius?: number;
  innerRadius?: number;
}) {
  return (
    <g filter="url(#rr-soft-shadow)">
      <polygon
        points={starPoints(cx, cy, outerRadius, innerRadius)}
        fill={fill}
        stroke={stroke}
        strokeWidth={0.26}
        strokeLinejoin="round"
      />
      <polygon
        points={starPoints(cx, cy, outerRadius * 0.5, innerRadius * 0.42)}
        fill={highlight}
        opacity={0.74}
        stroke="rgba(255,255,255,0.24)"
        strokeWidth={0.12}
        strokeLinejoin="round"
      />
      <circle cx={cx - 0.2} cy={cy - 0.18} r={0.34} fill="rgba(255,255,255,0.4)" />
    </g>
  );
}

function OakLeafCluster({
  cx,
  cy,
  fill,
}: {
  cx: number;
  cy: number;
  fill: string;
}) {
  const leaves = [
    { dx: -1.95, dy: -0.28, rx: 1.18, ry: 1.66, rotate: -35 },
    { dx: -0.66, dy: -1.02, rx: 1.14, ry: 1.58, rotate: -15 },
    { dx: 0.74, dy: -0.98, rx: 1.14, ry: 1.58, rotate: 15 },
    { dx: 2.02, dy: -0.1, rx: 1.18, ry: 1.66, rotate: 35 },
    { dx: -0.42, dy: 0.92, rx: 1.06, ry: 1.34, rotate: -15 },
    { dx: 0.9, dy: 1.0, rx: 1.06, ry: 1.34, rotate: 15 },
  ];

  return (
    <g filter="url(#rr-soft-shadow)">
      {leaves.map((leaf, idx) => (
        <ellipse
          key={idx}
          cx={cx + leaf.dx}
          cy={cy + leaf.dy}
          rx={leaf.rx}
          ry={leaf.ry}
          transform={`rotate(${leaf.rotate} ${cx + leaf.dx} ${cy + leaf.dy})`}
          fill={fill}
          stroke="rgba(60,40,10,0.42)"
          strokeWidth={0.2}
        />
      ))}
      {leaves.map((leaf, idx) => (
        <path
          key={`vein-${idx}`}
          d={`M ${cx + leaf.dx} ${cy + leaf.dy - leaf.ry * 0.6} L ${cx + leaf.dx} ${cy + leaf.dy + leaf.ry * 0.62}`}
          transform={`rotate(${leaf.rotate} ${cx + leaf.dx} ${cy + leaf.dy})`}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={0.12}
          strokeLinecap="round"
        />
      ))}
      <path
        d={`M ${cx - 0.2} ${cy + 0.85} L ${cx + 0.08} ${cy + 2.75}`}
        stroke="rgba(60,40,10,0.6)"
        strokeWidth={0.34}
        strokeLinecap="round"
      />
      <circle cx={cx - 0.18} cy={cy - 0.12} r={0.28} fill="rgba(255,255,255,0.22)" />
    </g>
  );
}

function MapleLeafDevice({ cx, cy }: { cx: number; cy: number }) {
  const path = [
    `M ${cx} ${cy - 3.4}`,
    `L ${cx + 0.8} ${cy - 1.8}`,
    `L ${cx + 2.2} ${cy - 2.4}`,
    `L ${cx + 1.7} ${cy - 0.9}`,
    `L ${cx + 3.2} ${cy - 0.4}`,
    `L ${cx + 1.8} ${cy + 0.45}`,
    `L ${cx + 2.3} ${cy + 2.2}`,
    `L ${cx + 0.6} ${cy + 1.3}`,
    `L ${cx} ${cy + 3.4}`,
    `L ${cx - 0.6} ${cy + 1.3}`,
    `L ${cx - 2.3} ${cy + 2.2}`,
    `L ${cx - 1.8} ${cy + 0.45}`,
    `L ${cx - 3.2} ${cy - 0.4}`,
    `L ${cx - 1.7} ${cy - 0.9}`,
    `L ${cx - 2.2} ${cy - 2.4}`,
    `L ${cx - 0.8} ${cy - 1.8}`,
    "Z",
  ].join(" ");

  return (
    <g filter="url(#rr-shadow)">
      <path d={path} fill="url(#rr-brass)" stroke="rgba(58,39,10,0.5)" strokeWidth={0.25} />
      <path
        d={`M ${cx} ${cy - 2.6} L ${cx} ${cy + 2.4}`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={0.22}
        strokeLinecap="round"
      />
    </g>
  );
}

function RosetteDevice({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g filter="url(#rr-shadow)">
      {Array.from({ length: 8 }, (_, idx) => {
        const angle = (idx * 45 * Math.PI) / 180;
        return (
          <ellipse
            key={idx}
            cx={cx + Math.cos(angle) * 1.3}
            cy={cy + Math.sin(angle) * 1.3}
            rx={1.2}
            ry={1.8}
            transform={`rotate(${idx * 45} ${cx + Math.cos(angle) * 1.3} ${cy + Math.sin(angle) * 1.3})`}
            fill="url(#rr-brass)"
            stroke="rgba(80,58,12,0.42)"
            strokeWidth={0.18}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={1.15} fill="#F5E39F" stroke="rgba(95,73,17,0.45)" strokeWidth={0.2} />
    </g>
  );
}

function ClaspDevice({ cx, cy, width, height }: { cx: number; cy: number; width: number; height: number }) {
  return (
    <g filter="url(#rr-shadow)">
      <rect
        x={cx - width / 2}
        y={cy - height / 2}
        width={width}
        height={height}
        rx={0.45}
        fill="url(#rr-clasp)"
        stroke="rgba(83,61,12,0.55)"
        strokeWidth={0.28}
      />
      <path
        d={`M ${cx - width / 2 + 0.5} ${cy} H ${cx + width / 2 - 0.5}`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={0.22}
        strokeLinecap="round"
      />
      <path
        d={`M ${cx} ${cy - height / 2 + 0.35} V ${cy + height / 2 - 0.35}`}
        stroke="rgba(94,72,17,0.35)"
        strokeWidth={0.18}
        strokeLinecap="round"
      />
    </g>
  );
}

function NumeralDevice({ cx, cy, value }: { cx: number; cy: number; value: number }) {
  return (
    <g filter="url(#rr-shadow)">
      <text
        x={cx}
        y={cy + 0.35}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={6.2}
        fontWeight="800"
        fill="url(#rr-brass)"
        stroke="rgba(52,34,8,0.75)"
        strokeWidth={0.4}
        paintOrder="stroke fill"
      >
        {value}
      </text>
      <text
        x={cx}
        y={cy - 0.2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={3.4}
        fontWeight="700"
        fill="rgba(255,255,255,0.35)"
      >
        {value}
      </text>
    </g>
  );
}

// ── Device renderer ───────────────────────────────────────────────────────────

function DeviceGroup({ devices, x, y, w, h }: {
  devices: PositionedDevice[];
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const clipId = `clip-${x.toFixed(0)}-${y.toFixed(0)}`;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={w} height={h} rx={1} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {devices.map((d, i) => {
          const cx = x + d.cx;
          const cy = y + d.cy;

          // ── Silver star ────────────────────────────────────────
          if (d.kind === "silver-star") {
            return (
              <g key={i}>
                <MetallicStar
                  cx={cx}
                  cy={cy}
                  fill="url(#rr-silver)"
                  highlight="rgba(255,255,255,0.74)"
                  stroke="rgba(80,80,80,0.5)"
                  outerRadius={2.72}
                  innerRadius={1.02}
                />
              </g>
            );
          }

          if (d.kind === "gold-star") {
            return (
              <g key={i}>
                <MetallicStar
                  cx={cx}
                  cy={cy}
                  fill="url(#rr-brass)"
                  highlight="rgba(255,240,165,0.72)"
                  stroke="rgba(92,70,18,0.55)"
                  outerRadius={2.82}
                  innerRadius={1.05}
                />
              </g>
            );
          }

          if (d.kind === "bronze-star") {
            return (
              <g key={i}>
                <MetallicStar
                  cx={cx}
                  cy={cy}
                  fill="url(#rr-service-bronze)"
                  highlight="rgba(255,220,170,0.56)"
                  stroke="rgba(90,52,24,0.55)"
                  outerRadius={2.72}
                  innerRadius={1.02}
                />
              </g>
            );
          }

          if (d.kind === "silver-olc") {
            return (
              <g key={i} filter="url(#rr-shadow)">
                <OakLeafCluster cx={cx} cy={cy - 0.1} fill="url(#rr-silver)" />
              </g>
            );
          }

          if (d.kind === "bronze-olc") {
            return (
              <g key={i} filter="url(#rr-shadow)">
                <OakLeafCluster cx={cx} cy={cy - 0.1} fill="url(#rr-bronze)" />
              </g>
            );
          }

          // ── Valor "V" ──────────────────────────────────────────
          if (d.kind === "valor-v") {
            return (
              <g key={i}>
                {/* White halo stroke behind the V */}
                <text
                  x={cx} y={cy + 0.6}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={6.5} fontWeight="bold"
                  fill="rgba(255,255,255,0.88)"
                  stroke="rgba(255,255,255,0.88)"
                  strokeWidth={1.8} strokeLinejoin="round"
                >
                  V
                </text>
                {/* Gold V with subtle drop shadow */}
                <text
                  x={cx} y={cy + 0.6}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={6.5} fontWeight="bold"
                  fill="#FFD700"
                  filter="url(#rr-shadow)"
                >
                  V
                </text>
              </g>
            );
          }

          // ── Arrowhead ──────────────────────────────────────────
          if (d.kind === "arrowhead") {
            const pts = `${cx},${cy - 3.1} ${cx - 2.6},${cy + 2.1} ${cx + 2.6},${cy + 2.1}`;
            return (
              <g key={i}>
                <polygon
                  points={pts}
                  fill="url(#rr-gold)"
                  // stroke="rgba(255,255,255,0.82)"
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                  filter="url(#rr-shadow)"
                />
                {/* Specular highlight near the tip */}
                <ellipse cx={cx} cy={cy - 1.4} rx={0.85} ry={0.55}
                  fill="rgba(255,220,120,0.65)" />
              </g>
            );
          }

          // ── Commonwealth-style devices (Bar / Rosette / Clasp) ──
          if (d.kind === "maple-leaf") {
            return (
              <g key={i}>
                <MapleLeafDevice cx={cx} cy={cy} />
              </g>
            );
          }

          if (d.kind === "numeral-device") {
            return (
              <g key={i}>
                <NumeralDevice cx={cx} cy={cy} value={Math.max(2, d.value || 2)} />
              </g>
            );
          }

          if (d.kind === "rosette") {
            return (
              <g key={i}>
                <RosetteDevice cx={cx} cy={cy} />
              </g>
            );
          }

          if (d.kind === "clasp") {
            return (
              <g key={i}>
                <ClaspDevice cx={cx} cy={cy} width={6} height={2.1} />
              </g>
            );
          }

          if (d.kind === "bar-device") {
            return (
              <g key={i}>
                <ClaspDevice cx={cx} cy={cy} width={7} height={1.8} />
              </g>
            );
          }

          return null;
        })}
      </g>
    </g>
  );
}

// ── Wikipedia device image overlays ──────────────────────────────────────────
// Renders actual device images (oak leaf clusters, V devices, stars, numerals)
// from Wikipedia, scaled and positioned on the ribbon.

function WikiDeviceOverlays({ deviceImages, x, y, w, h }: {
  deviceImages: DeviceImage[];
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  // Collect all individual device instances (expand by count)
  const allDevices: { url: string; deviceType: string }[] = [];
  for (const d of deviceImages) {
    for (let i = 0; i < d.count; i++) {
      allDevices.push({ url: d.url, deviceType: d.deviceType });
    }
  }
  if (allDevices.length === 0) return null;

  // Device image size (proportional to ribbon), capped so they fit within ribbon width
  const deviceH = h * 0.7;
  const gap = w * 0.02;
  const maxTotalW = w * 0.95; // leave small margin on each side
  const idealDeviceW = deviceH; // Square aspect for most devices
  const idealTotalW = allDevices.length * idealDeviceW + (allDevices.length - 1) * gap;
  const deviceW = idealTotalW > maxTotalW
    ? (maxTotalW - (allDevices.length - 1) * gap) / allDevices.length
    : idealDeviceW;

  // Center all devices horizontally on the ribbon
  const totalDeviceW = allDevices.length * deviceW + (allDevices.length - 1) * gap;
  const startX = x + (w - totalDeviceW) / 2;
  const startY = y + (h - deviceH) / 2;

  const clipId = `dev-clip-${x.toFixed(0)}-${y.toFixed(0)}`;

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={w} height={h} rx={1} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {allDevices.map((d, i) => (
          <image
            key={i}
            href={d.url}
            x={startX + i * (deviceW + gap)}
            y={startY}
            width={deviceW}
            height={deviceH}
            preserveAspectRatio="xMidYMid meet"
          />
        ))}
      </g>
    </g>
  );
}

// ── Single ribbon ─────────────────────────────────────────────────────────────

function SingleRibbon({
  colors, devices, x, y, width, height, isUnitCitation, ribbonImageUrl, deviceImages,
}: {
  colors: string[];
  devices: PositionedDevice[];
  x: number;
  y: number;
  width: number;
  height: number;
  isUnitCitation?: boolean;
  ribbonImageUrl?: string;
  deviceImages?: DeviceImage[];
}) {
  // Unit citations get a gold frame border
  const borderColor = isUnitCitation ? "#DAA520" : "#2a2a2a";
  const borderWidth = isUnitCitation ? 1.2 : 0.4;

  // Use Wikipedia device images when available, otherwise fall back to SVG-computed devices
  const hasWikiDevices = deviceImages && deviceImages.length > 0;

  return (
    <g>
      {ribbonImageUrl ? (
        <image
          href={ribbonImageUrl}
          x={x} y={y}
          width={width} height={height}
          preserveAspectRatio="none"
        />
      ) : (
        colors.map((color, i) => {
          const stripeWidth = width / colors.length;
          return (
            <rect
              key={i}
              x={x + i * stripeWidth} y={y}
              width={stripeWidth} height={height}
              fill={color}
            />
          );
        })
      )}
      {hasWikiDevices ? (
        <WikiDeviceOverlays deviceImages={deviceImages} x={x} y={y} w={width} h={height} />
      ) : (
        <DeviceGroup devices={devices} x={x} y={y} w={width} h={height} />
      )}
      {/* Border — gold frame for unit citations */}
      <rect
        x={x} y={y} width={width} height={height}
        fill="none" stroke={borderColor} strokeWidth={borderWidth} rx={1}
      />
    </g>
  );
}

// ── Rack ──────────────────────────────────────────────────────────────────────

export default function RibbonRack({
  medals,
  maxPerRow,
  gap,
  scale = 2,
  disableLinks = false,
  countryCode,
  rowAlignment,
  rowLayout = "default",
  onRibbonClick,
}: RibbonRackProps) {
  // Ensure every medal has at least a fallback ribbon color
  const withColors = (medals || [])
    .filter((m) => m.ribbonImageUrl || (m.ribbonColors?.length > 0))
    .map((m) => m.ribbonColors?.length > 0 ? m : { ...m, ribbonColors: ["#808080"] });
  if (withColors.length === 0) {
    return null;
  }

  const inferredCountryCode =
    countryCode || withColors.find((m) => m.countryCode)?.countryCode || "US";
  const profile = getRibbonRackProfile(inferredCountryCode);
  const resolvedMaxPerRow =
    rowLayout === "rankListPyramid"
      ? RANK_LIST_PYRAMID_MAX_COLS
      : Math.max(
          1,
          maxPerRow != null && maxPerRow > 0
            ? maxPerRow
            : profile.defaultMaxPerRow ?? MAX_RIBBONS_PER_ROW,
        );
  const resolvedGap = Math.max(0, gap ?? profile.defaultGap ?? RIBBON_GAP);
  const resolvedRowAlignment =
    rowLayout === "rankListPyramid"
      ? rowAlignment ?? "center"
      : rowAlignment || profile.rowAlignment;
  const sorted = sortRackMedals(withColors, { nationalCountryCode: inferredCountryCode });

  const rowPlan =
    rowLayout === "rankListPyramid"
      ? planRankListPyramidRowSizes(sorted.length)
      : planRowSizes(sorted.length, resolvedMaxPerRow);
  const rows: typeof sorted[] = [];
  let cursor = 0;
  for (const rowSize of rowPlan) {
    rows.push(sorted.slice(cursor, cursor + rowSize));
    cursor += rowSize;
  }
  const longestRowLength = rows.reduce((max, row) => Math.max(max, row.length), 0);

  const rowHeight  = RIBBON_HEIGHT + resolvedGap;
  const totalWidth = resolvedMaxPerRow * (RIBBON_WIDTH + resolvedGap) - resolvedGap;
  const totalHeight = rows.length * rowHeight - resolvedGap;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width={totalWidth * scale}
      height={totalHeight * scale}
      className="ribbon-rack"
      role="img"
      aria-label="Military ribbon rack"
    >
      {/* Gradients and filters defined once, shared by all ribbons */}
      <RackDefs />

      {rows.map((row, rowIdx) => {
        const rowWidth = row.length * (RIBBON_WIDTH + resolvedGap) - resolvedGap;
        const offsetX =
          resolvedRowAlignment === "center"
            ? (totalWidth - rowWidth) / 2
            : resolvedRowAlignment === "pyramid" && row.length < longestRowLength
              ? (totalWidth - rowWidth) / 2
              : 0;
        const snappedOffsetX = snapPosition(offsetX);

        return row.map((ribbon, colIdx) => {
          const x = snapPosition(snappedOffsetX + colIdx * (RIBBON_WIDTH + resolvedGap));
          const y = snapPosition(rowIdx * rowHeight);

          const rawDevices = computeDevices(
            ribbon.count,
            ribbon.hasValor,
            ribbon.arrowheads ?? 0,
            ribbon.deviceRule ?? ribbon.deviceLogic,
            ribbon.serviceBranch
          );
          const devices = layoutDevices(rawDevices, RIBBON_WIDTH, RIBBON_HEIGHT);

          const ribbonEl = (
            <SingleRibbon
              key={`${rowIdx}-${colIdx}`}
              colors={ribbon.ribbonColors}
              ribbonImageUrl={ribbon.ribbonImageUrl}
              devices={devices}
              deviceImages={ribbon.deviceImages}
              x={x} y={y}
              width={RIBBON_WIDTH}
              height={RIBBON_HEIGHT}
              isUnitCitation={ribbon.isUnitCitation}
            />
          );

          if (onRibbonClick) {
            return (
              <g
                key={`${rowIdx}-${colIdx}`}
                style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                onClick={() => onRibbonClick(ribbon)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRibbonClick(ribbon);
                  }
                }}
              >
                <title>{ribbon.name}</title>
                {ribbonEl}
              </g>
            );
          }

          if (ribbon.medalId && !disableLinks) {
            return (
              <a
                key={`${rowIdx}-${colIdx}`}
                href={`/medals/${ribbon.medalId}`}
                className="ribbon-link"
                style={{ cursor: "pointer" }}
              >
                <title>{ribbon.name}</title>
                {ribbonEl}
              </a>
            );
          }

          return ribbonEl;
        });
      })}
    </svg>
  );
}
