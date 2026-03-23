"use client";

import { RIBBON_WIDTH, RIBBON_HEIGHT, RIBBON_GAP, MAX_RIBBONS_PER_ROW } from "./ribbon-data";
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
}

interface RibbonRackProps {
  medals: RibbonMedal[];
  maxPerRow?: number;
  scale?: number;
  disableLinks?: boolean;
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

      {/* Bronze star: golden highlight → rich dark brown */}
      <radialGradient id="rr-bronze" cx="32%" cy="28%" r="68%" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stopColor="#FFE090" stopOpacity={0.98} />
        <stop offset="35%"  stopColor="#D98030" />
        <stop offset="75%"  stopColor="#9A4E18" />
        <stop offset="100%" stopColor="#5C2800" />
      </radialGradient>

      {/* Shared drop-shadow for all devices */}
      <filter id="rr-shadow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0.35" dy="0.55" stdDeviation="0.5"
          floodColor="#000" floodOpacity={0.55} />
      </filter>
    </defs>
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
                {/* paintOrder="stroke fill" draws the white stroke behind the fill,
                    acting as a halo WITHOUT covering the ribbon's color stripes */}
                <polygon
                  points={starPoints(cx, cy, 3.1, 1.25)}
                  fill="url(#rr-silver)"
                  // stroke="rgba(255,255,255,0.82)"
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                  filter="url(#rr-shadow)"
                />
                {/* Specular highlight */}
                {/* <ellipse cx={cx - 0.7} cy={cy - 1.6} rx={1.0} ry={0.65}
                  fill="rgba(255,255,255,0.72)" /> */}
              </g>
            );
          }

          // ── Bronze star ────────────────────────────────────────
          if (d.kind === "bronze-star") {
            return (
              <g key={i}>
                <polygon
                  points={starPoints(cx, cy, 3.1, 1.25)}
                  fill="url(#rr-bronze)"
                  // stroke="rgba(255,255,255,0.82)"
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                  filter="url(#rr-shadow)"
                />
                {/* Specular highlight */}
                <ellipse cx={cx - 0.7} cy={cy - 1.6} rx={1.0} ry={0.65}
                  fill="rgba(255,220,120,0.68)" />
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
                  fill="url(#rr-bronze)"
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
  maxPerRow = MAX_RIBBONS_PER_ROW,
  scale = 2,
  disableLinks = false,
}: RibbonRackProps) {
  // Ensure every medal has at least a fallback ribbon color
  const withColors = (medals || [])
    .filter((m) => m.ribbonImageUrl || (m.ribbonColors?.length > 0))
    .map((m) => m.ribbonColors?.length > 0 ? m : { ...m, ribbonColors: ["#808080"] });
  if (withColors.length === 0) {
    return null;
  }

  const sorted = [...withColors].sort((a, b) => a.precedenceOrder - b.precedenceOrder);

  const rows: typeof sorted[] = [];
  for (let i = 0; i < sorted.length; i += maxPerRow) {
    rows.push(sorted.slice(i, i + maxPerRow));
  }

  const rowHeight  = RIBBON_HEIGHT + RIBBON_GAP;
  const totalWidth = maxPerRow * (RIBBON_WIDTH + RIBBON_GAP) - RIBBON_GAP;
  const totalHeight = rows.length * rowHeight - RIBBON_GAP;

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
        const rowWidth = row.length * (RIBBON_WIDTH + RIBBON_GAP) - RIBBON_GAP;
        const offsetX  = (totalWidth - rowWidth) / 2;

        return row.map((ribbon, colIdx) => {
          const x = offsetX + colIdx * (RIBBON_WIDTH + RIBBON_GAP);
          const y = rowIdx * rowHeight;

          const rawDevices = computeDevices(
            ribbon.count,
            ribbon.hasValor,
            ribbon.arrowheads ?? 0
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
