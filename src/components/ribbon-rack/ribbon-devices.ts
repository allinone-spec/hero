import type { MedalDeviceRule } from "@/lib/medal-device-rules";
import { resolveMedalDeviceRule } from "@/lib/medal-device-rules";

// ── Ribbon Device Computation Engine ─────────────────────────────────────────
// Handles stars, oak leaf clusters, Commonwealth devices, V-device, and arrowhead layout logic.

export type DeviceKind =
  | "silver-star"
  | "gold-star"
  | "bronze-star"
  | "silver-olc"
  | "bronze-olc"
  | "maple-leaf"
  | "numeral-device"
  | "valor-v"
  | "arrowhead"
  | "bar-device"
  | "rosette"
  | "clasp";

export interface Device {
  kind: DeviceKind;
  value?: number;
}

export interface PositionedDevice extends Device {
  cx: number;
  cy: number;
}

/**
 * Compute the ordered list of devices for a single ribbon from the medal's
 * structured repeat-award rule and the recipient's branch context.
 */
export function computeDevices(
  count: number,
  hasValor: boolean,
  arrowheads: number,
  deviceRule?: MedalDeviceRule | string,
  serviceBranch?: string
): Device[] {
  const devices: Device[] = [];
  const additional = Math.max(0, count - 1);
  const rule = resolveMedalDeviceRule(deviceRule, serviceBranch);

  if (additional > 0 && rule.repeatDevice === "numeral-device") {
    devices.push({
      kind: "numeral-device",
      value: rule.numeralValueMode === "additional-awards" ? additional : count,
    });
  }

  if (additional > 0 && rule.repeatDevice !== "none" && rule.repeatDevice !== "numeral-device") {
    const compactStep = Math.max(0, rule.compactStep || 0);
    const maxDisplayCount = Math.max(1, rule.maxDisplayCount || additional);
    const visibleRepeatDevice = (rule.ribbonBarRepeatDevice ?? rule.repeatDevice) as DeviceKind;
    const visibleCompactDevice = (rule.ribbonBarCompactDevice ?? rule.compactDevice) as DeviceKind | undefined;
    let compactCount = 0;
    let repeatCount = additional;

    if (visibleCompactDevice && compactStep > 1) {
      compactCount = Math.floor(additional / compactStep);
      repeatCount = additional % compactStep;
    }

    const repeatDevices = [
      ...Array.from(
        { length: compactCount },
        () => ({ kind: visibleCompactDevice || visibleRepeatDevice } as Device),
      ),
      ...Array.from(
        { length: repeatCount },
        () => ({ kind: visibleRepeatDevice } as Device),
      ),
    ].slice(0, maxDisplayCount);

    devices.push(...repeatDevices);
  }

  if (hasValor) devices.push({ kind: "valor-v" });
  if (arrowheads > 0) devices.push({ kind: "arrowhead" });

  return devices;
}

/**
 * Assign X/Y positions to devices across a ribbon face.
 *
 * Layout rules:
 *  - When a V-device is present it is always pinned to the ribbon center.
 *  - Repeat-award devices cluster in the left zone.
 *  - Arrowhead sits in the right zone.
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
      d.kind === "gold-star" ||
      d.kind === "bronze-star" ||
      d.kind === "silver-olc" ||
      d.kind === "bronze-olc" ||
      d.kind === "maple-leaf" ||
      d.kind === "numeral-device" ||
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
