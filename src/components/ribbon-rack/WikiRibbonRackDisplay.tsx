"use client";

/**
 * Renders a ribbon rack from saved wikiRibbonRack data.
 * Supports layout-aware rendering with "other" items (badges, tabs)
 * and standard ribbon grids with device overlays.
 *
 * Used on both the hero detail page and hero cards to ensure
 * identical ribbon rack arrangement everywhere.
 */

export interface WikiRibbonCell {
  ribbonUrl: string;
  deviceUrls: string[];
  medalName: string;
  medalType?: string;
  count: number;
  hasValor: boolean;
  arrowheads: number;
  cellType?: "ribbon" | "other";
  imgWidth?: number;
  imgHeight?: number;
  scale?: number;
  row?: number;
}

interface WikiRibbonRackDisplayProps {
  cells: WikiRibbonCell[];
  /** Ribbons per row (default 4) */
  maxPerRow?: number;
  /** Scale factor for ribbon items (default 1.15) */
  ribbonScale?: number;
  /** Gap between other items section and ribbons (default 8) */
  rackGap?: number;
}

export default function WikiRibbonRackDisplay({
  cells,
  maxPerRow = 4,
  ribbonScale = 1.15,
  rackGap = 8,
}: WikiRibbonRackDisplayProps) {
  if (!cells || cells.length === 0) return null;

  const hasLayoutData = cells.some((c) => c.cellType);

  // Split into other items and ribbon items
  const otherCells = hasLayoutData ? cells.filter((c) => c.cellType === "other") : [];
  const ribbonCells = hasLayoutData ? cells.filter((c) => c.cellType !== "other") : cells;

  // Group other items by row
  const otherRowsMap = new Map<number, WikiRibbonCell[]>();
  for (const cell of otherCells) {
    const r = cell.row ?? 0;
    if (!otherRowsMap.has(r)) otherRowsMap.set(r, []);
    otherRowsMap.get(r)!.push(cell);
  }
  const otherRowKeys = [...otherRowsMap.keys()].sort((a, b) => a - b);

  const rW = 90 * ribbonScale;
  const rH = 35 * ribbonScale;
  const gridWidth = maxPerRow * (rW + 2);

  return (
    <div className="inline-flex flex-col items-center">
      {/* Other items (badges, tabs, insignia) — capped to ribbon grid width */}
      {otherRowKeys.map((rowKey) => {
        const row = otherRowsMap.get(rowKey)!;
        const gap = 4; // gap-1 = 0.25rem = 4px
        // Compute natural total width of this row
        const naturalWidths = row.map((cell) => (cell.imgWidth || 100) * (cell.scale ?? 1));
        const naturalTotal = naturalWidths.reduce((a, b) => a + b, 0) + (row.length - 1) * gap;
        // If natural width exceeds grid, scale down proportionally
        const shrink = naturalTotal > gridWidth ? gridWidth / naturalTotal : 1;
        return (
          <div key={`other-row-${rowKey}`} className="flex items-end justify-center gap-1">
            {row.map((cell, ci) => {
              const rawW = (cell.imgWidth || 100) * (cell.scale ?? 1);
              const rawH = (cell.imgHeight || 100) * (cell.scale ?? 1);
              const w = rawW * shrink;
              const h = rawH * shrink;
              return (
                <img key={ci} src={cell.ribbonUrl} alt={cell.medalName || ""} style={{ width: w, height: h }} className="object-contain" />
              );
            })}
          </div>
        );
      })}
      {/* Gap between other items and ribbons */}
      {otherCells.length > 0 && ribbonCells.length > 0 && (
        <div style={{ height: rackGap }} />
      )}
      {/* Ribbon items grid */}
      {ribbonCells.length > 0 && (
        <div className="flex flex-wrap justify-center" style={{ width: gridWidth, gap: 2 }}>
          {ribbonCells.map((cell, i) => (
            <div key={i} className="relative" style={{ width: rW, height: rH }}>
              <img src={cell.ribbonUrl} alt={cell.medalName || ""} className="w-full h-full object-fill rounded-[1px]" />
              {cell.deviceUrls && cell.deviceUrls.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center gap-[1px] pointer-events-none overflow-hidden">
                  {cell.deviceUrls.map((dUrl, di) => (
                    <img key={di} src={dUrl} alt="" className="h-[70%] object-contain shrink-0" style={{ maxWidth: `${Math.floor(rW / cell.deviceUrls.length)}px` }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
