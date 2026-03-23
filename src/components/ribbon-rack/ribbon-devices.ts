// ── Ribbon Device Computation Engine ─────────────────────────────────────────
// Handles silver/bronze compaction, V-device, and arrowhead layout logic.

export type DeviceKind =
  | "silver-star"
  | "bronze-star"
  | "valor-v"
  | "arrowhead"
  /** Commonwealth / UK-style campaign devices (from MedalType.deviceLogic) */
  | "bar-device"
  | "rosette"
  | "clasp";

export interface Device {
  kind: DeviceKind;
}

export interface PositionedDevice extends Device {
  cx: number;
  cy: number;
}

/**
 * Compute the ordered list of devices for a single ribbon.
 *
 * Compaction rules (Army/Navy campaign stars):
 *   - 1st award  = ribbon itself (no device)
 *   - 2nd–6th    = 1–5 bronze stars
 *   - Every 5 bronze stars → 1 silver star
 * Order: silver stars → bronze stars → V-device → arrowhead
 */
export function computeDevices(
  count: number,
  hasValor: boolean,
  arrowheads: number,
  deviceLogic?: string
): Device[] {
  const devices: Device[] = [];
  const additional = Math.max(0, count - 1);
  const logic = (deviceLogic || "").toLowerCase();

  if (
    additional > 0 &&
    (logic.includes("bar") || logic.includes("rosette") || logic.includes("clasp"))
  ) {
    const n = Math.min(additional, 6);
    if (logic.includes("rosette")) {
      for (let i = 0; i < n; i++) devices.push({ kind: "rosette" });
    } else if (logic.includes("clasp")) {
      for (let i = 0; i < n; i++) devices.push({ kind: "clasp" });
    } else {
      for (let i = 0; i < n; i++) devices.push({ kind: "bar-device" });
    }
    if (hasValor) devices.push({ kind: "valor-v" });
    if (arrowheads > 0) devices.push({ kind: "arrowhead" });
    return devices;
  }

  const silver = Math.floor(additional / 5);
  const bronze = additional % 5;

  for (let i = 0; i < silver; i++) devices.push({ kind: "silver-star" });
  for (let i = 0; i < bronze; i++) devices.push({ kind: "bronze-star" });
  if (hasValor) devices.push({ kind: "valor-v" });
  if (arrowheads > 0) devices.push({ kind: "arrowhead" });

  return devices;
}

/**
 * Assign X/Y positions to devices across a ribbon face.
 *
 * Layout rules:
 *  - When a V-device is present it is always pinned to the ribbon center.
 *  - Campaign/OLC stars cluster in the LEFT zone  (margin → center - gap).
 *  - Arrowhead sits in the RIGHT zone             (center + gap → ribbonW - margin).
 *  - When there is no V-device, all devices are evenly spaced across the full width.
 */
export function layoutDevices(
  devices: Device[],
  ribbonW: number,
  ribbonH: number
): PositionedDevice[] {
  if (devices.length === 0) return [];

  const cy     = ribbonH / 2;
  const margin = 2;
  const center = ribbonW / 2;
  const vGap   = 4; // clearance on each side of the V-device

  const stars = devices.filter(
    (d) =>
      d.kind === "silver-star" ||
      d.kind === "bronze-star" ||
      d.kind === "bar-device" ||
      d.kind === "rosette" ||
      d.kind === "clasp"
  );
  const valorV    = devices.find(d => d.kind === "valor-v");
  const arrowhead = devices.find(d => d.kind === "arrowhead");

  // No V-device: evenly space everything
  if (!valorV) {
    const usable = ribbonW - 2 * margin;
    const step   = usable / (devices.length + 1);
    return devices.map((d, i) => ({ ...d, cx: margin + step * (i + 1), cy }));
  }

  const result: PositionedDevice[] = [];

  // Stars → left zone: [margin .. center - vGap]
  if (stars.length > 0) {
    const zoneW = center - vGap - margin;
    const step  = zoneW / (stars.length + 1);
    stars.forEach((s, i) => result.push({ ...s, cx: margin + step * (i + 1), cy }));
  }

  // V-device → center
  result.push({ ...valorV, cx: center, cy });

  // Arrowhead → right zone: [center + vGap .. ribbonW - margin]
  if (arrowhead) {
    const zoneStart = center + vGap;
    const zoneW     = ribbonW - margin - zoneStart;
    result.push({ ...arrowhead, cx: zoneStart + zoneW / 2, cy });
  }

  return result;
}

/**
 * Generate SVG polygon points string for a 5-pointed star.
 * @param cx  Center X
 * @param cy  Center Y
 * @param R   Outer radius
 * @param r   Inner radius
 */
export function starPoints(cx: number, cy: number, R: number, r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = (i * 36 - 90) * (Math.PI / 180);
    const rad = i % 2 === 0 ? R : r;
    return `${(cx + rad * Math.cos(angle)).toFixed(2)},${(cy + rad * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}
