// Default ribbon color patterns for U.S. military medals
// Each ribbon is an array of color stripes (left to right)

export const DEFAULT_RIBBON_COLORS: Record<string, string[]> = {
  "Medal of Honor": ["#00529B", "#FFFFFF", "#00529B", "#FFFFFF", "#00529B"],
  "Distinguished Service Cross": ["#00529B", "#FFFFFF", "#CC0000", "#FFFFFF", "#00529B"],
  "Navy Cross": ["#000080", "#FFFFFF", "#000080"],
  "Air Force Cross": ["#5B9BD5", "#FFFFFF", "#5B9BD5"],
  "Distinguished Service Medal": ["#CC0000", "#FFFFFF", "#00529B"],
  "Silver Star": ["#CC0000", "#FFFFFF", "#00529B", "#FFFFFF", "#CC0000"],
  "Distinguished Flying Cross": ["#00529B", "#FFFFFF", "#CC0000", "#FFFFFF", "#00529B", "#FFFFFF"],
  "Bronze Star": ["#CC0000", "#FFFFFF", "#00529B", "#FFFFFF", "#CC0000", "#FFFFFF", "#00529B"],
  "Purple Heart": ["#5B2C6F", "#FFFFFF", "#5B2C6F"],
  "Air Medal": ["#00529B", "#FFD700", "#00529B"],
  "Legion of Merit": ["#8B0000", "#FFFFFF", "#8B0000", "#FFFFFF", "#8B0000"],
  "Croix de Guerre": ["#006B3C", "#CC0000", "#FFD700", "#CC0000", "#006B3C"],
  "Foreign Valor Medal": ["#FFD700", "#CC0000", "#FFD700"],
};

// Medal precedence order for display (lower = higher precedence)
export const MEDAL_PRECEDENCE: Record<string, number> = {
  "Medal of Honor": 1,
  "Distinguished Service Cross": 2,
  "Navy Cross": 2,
  "Air Force Cross": 2,
  "Distinguished Service Medal": 3,
  "Silver Star": 4,
  "Legion of Merit": 5,
  "Distinguished Flying Cross": 6,
  "Bronze Star": 7,
  "Purple Heart": 8,
  "Air Medal": 9,
  "Foreign Valor Medal": 10,
  "Croix de Guerre": 11,
};

export const RIBBON_WIDTH = 36;
export const RIBBON_HEIGHT = 14;
export const RIBBON_GAP = 2;
export const MAX_RIBBONS_PER_ROW = 4;
