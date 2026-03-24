export type MedalDeviceFamily =
  | "none"
  | "us-olc"
  | "us-repeat-star"
  | "us-campaign-star"
  | "us-numeral"
  | "us-mixed"
  | "commonwealth-bar"
  | "commonwealth-rosette"
  | "commonwealth-clasp"
  | "canada-maple-leaf"
  | "service-numeral";

export type MedalRepeatDeviceKind =
  | "none"
  | "bronze-olc"
  | "silver-olc"
  | "gold-star"
  | "silver-star"
  | "maple-leaf"
  | "numeral-device"
  | "bar-device"
  | "rosette"
  | "clasp";

export interface MedalDeviceRule {
  family: MedalDeviceFamily;
  repeatDevice: MedalRepeatDeviceKind;
  compactDevice?: MedalRepeatDeviceKind;
  ribbonBarRepeatDevice?: MedalRepeatDeviceKind;
  ribbonBarCompactDevice?: MedalRepeatDeviceKind;
  compactStep?: number;
  numeralValueMode?: "total-awards" | "additional-awards";
  maxDisplayCount?: number;
  countryCode?: string;
  inventoryCategory?: string;
  notes?: string;
}

export interface MedalDeviceRuleContext {
  countryCode?: string | null;
  inventoryCategory?: string | null;
  medalName?: string | null;
}

const DEFAULT_MAX_DISPLAY_COUNT = 6;

export const NO_DEVICE_RULE: MedalDeviceRule = {
  family: "none",
  repeatDevice: "none",
};

function buildCommonwealthRibbonBarRule(
  family: "commonwealth-bar" | "commonwealth-clasp" | "commonwealth-rosette",
  repeatDevice: MedalRepeatDeviceKind,
  context: MedalDeviceRuleContext,
): MedalDeviceRule {
  if (family === "commonwealth-rosette") {
    return {
      family,
      repeatDevice: "rosette",
      ribbonBarRepeatDevice: "rosette",
      maxDisplayCount: DEFAULT_MAX_DISPLAY_COUNT,
      countryCode: String(context.countryCode || "").toUpperCase() || undefined,
      inventoryCategory: String(context.inventoryCategory || "") || undefined,
    };
  }

  return {
    family,
    repeatDevice,
    ribbonBarRepeatDevice: "rosette",
    maxDisplayCount: DEFAULT_MAX_DISPLAY_COUNT,
    countryCode: String(context.countryCode || "").toUpperCase() || undefined,
    inventoryCategory: String(context.inventoryCategory || "") || undefined,
    notes: "Ribbon-bar display uses rosette to represent clasp/bar.",
  };
}

export function parseMedalDeviceRule(
  deviceLogic?: string | null,
  context: MedalDeviceRuleContext = {},
): MedalDeviceRule {
  const logic = String(deviceLogic || "").trim().toLowerCase();
  const countryCode = String(context.countryCode || "").trim().toUpperCase();
  const inventoryCategory = String(context.inventoryCategory || "").trim().toLowerCase();
  const medalName = String(context.medalName || "").trim().toLowerCase();

  if (!logic || logic === "none" || logic === "no device") {
    return NO_DEVICE_RULE;
  }

  if (countryCode === "US" && (/air medal|aerial achievement/.test(medalName) || logic.includes("numeral"))) {
    return {
      family: "us-numeral",
      repeatDevice: "numeral-device",
      numeralValueMode: "total-awards",
      maxDisplayCount: DEFAULT_MAX_DISPLAY_COUNT,
      countryCode,
      inventoryCategory,
    };
  }

  if (logic === "olc" || logic.includes("oak leaf")) {
    return {
      family: "us-olc",
      repeatDevice: "bronze-olc",
      compactDevice: "silver-olc",
      compactStep: 5,
      maxDisplayCount: DEFAULT_MAX_DISPLAY_COUNT,
      countryCode,
      inventoryCategory,
    };
  }

  if (logic === "star" || logic.includes("gold star")) {
    const family =
      countryCode === "US" && /campaign|service/.test(inventoryCategory)
        ? "us-campaign-star"
        : "us-repeat-star";
    return {
      family,
      repeatDevice: "gold-star",
      compactDevice: "silver-star",
      compactStep: 5,
      maxDisplayCount: DEFAULT_MAX_DISPLAY_COUNT,
      countryCode,
      inventoryCategory,
    };
  }

  if (logic === "mixed") {
    return {
      family: "us-mixed",
      repeatDevice: "bronze-olc",
      compactDevice: "silver-olc",
      compactStep: 5,
      maxDisplayCount: DEFAULT_MAX_DISPLAY_COUNT,
      countryCode,
      inventoryCategory,
      notes: "Resolve to stars or oak leaf clusters from service branch.",
    };
  }

  if (countryCode === "CA" && logic.includes("bar") && !/campaign|service/.test(inventoryCategory)) {
    return {
      family: "canada-maple-leaf",
      repeatDevice: "maple-leaf",
      maxDisplayCount: DEFAULT_MAX_DISPLAY_COUNT,
      countryCode,
      inventoryCategory,
      notes: "Canadian repeat-decoration awards use maple leaf devices when specified.",
    };
  }

  if (
    countryCode === "ZA" &&
    (logic.includes("numeral") || /service|loyal|long service/.test(inventoryCategory) || /service|loyal/.test(medalName))
  ) {
    return {
      family: "service-numeral",
      repeatDevice: "numeral-device",
      numeralValueMode: "total-awards",
      maxDisplayCount: DEFAULT_MAX_DISPLAY_COUNT,
      countryCode,
      inventoryCategory,
      notes: "South African service/repeat counts are shown with numerals when specified.",
    };
  }

  if (logic.includes("rosette")) {
    if (["UK", "NZ", "AU", "CA"].includes(countryCode)) {
      return buildCommonwealthRibbonBarRule("commonwealth-rosette", "rosette", context);
    }
    return {
      family: "commonwealth-rosette",
      repeatDevice: "rosette",
      ribbonBarRepeatDevice: "rosette",
      maxDisplayCount: DEFAULT_MAX_DISPLAY_COUNT,
      countryCode,
      inventoryCategory,
    };
  }

  if (logic.includes("clasp")) {
    if (["UK", "NZ", "AU", "CA"].includes(countryCode)) {
      return buildCommonwealthRibbonBarRule("commonwealth-clasp", "clasp", context);
    }
    return {
      family: "commonwealth-clasp",
      repeatDevice: "clasp",
      maxDisplayCount: DEFAULT_MAX_DISPLAY_COUNT,
      countryCode,
      inventoryCategory,
    };
  }

  if (logic.includes("bar")) {
    if (["UK", "NZ", "AU", "CA"].includes(countryCode)) {
      return buildCommonwealthRibbonBarRule("commonwealth-bar", "bar-device", context);
    }
    return {
      family: "commonwealth-bar",
      repeatDevice: "bar-device",
      maxDisplayCount: DEFAULT_MAX_DISPLAY_COUNT,
      countryCode,
      inventoryCategory,
    };
  }

  return {
    ...NO_DEVICE_RULE,
    countryCode,
    inventoryCategory,
    notes: `Unrecognized device logic: ${deviceLogic}`,
  };
}

export function resolveMedalDeviceRule(
  input?: MedalDeviceRule | string | null,
  serviceBranch?: string | null,
  context: MedalDeviceRuleContext = {},
): MedalDeviceRule {
  const rule =
    typeof input === "string" || !input
      ? parseMedalDeviceRule(input, context)
      : {
          ...input,
          countryCode: input.countryCode ?? (context.countryCode ? String(context.countryCode).toUpperCase() : undefined),
          inventoryCategory: input.inventoryCategory ?? (context.inventoryCategory ? String(context.inventoryCategory) : undefined),
        };

  if (rule.family !== "us-mixed") {
    return rule;
  }

  const branch = String(serviceBranch || "").toLowerCase();
  const useStars = /navy|marine|coast guard/.test(branch);

  return useStars
    ? {
        family: "us-repeat-star",
        repeatDevice: "gold-star",
        compactDevice: "silver-star",
        compactStep: 5,
        maxDisplayCount: rule.maxDisplayCount ?? DEFAULT_MAX_DISPLAY_COUNT,
        countryCode: rule.countryCode,
        inventoryCategory: rule.inventoryCategory,
      }
    : {
        family: "us-olc",
        repeatDevice: "bronze-olc",
        compactDevice: "silver-olc",
        compactStep: 5,
        maxDisplayCount: rule.maxDisplayCount ?? DEFAULT_MAX_DISPLAY_COUNT,
        countryCode: rule.countryCode,
        inventoryCategory: rule.inventoryCategory,
      };
}

export function describeMedalDevices(input: {
  count: number;
  hasValor?: boolean;
  arrowheads?: number;
  deviceRule?: MedalDeviceRule | string | null;
  serviceBranch?: string | null;
}): string {
  const parts: string[] = [];
  const additional = Math.max(0, input.count - 1);
  const rule = resolveMedalDeviceRule(input.deviceRule, input.serviceBranch);

  if (additional > 0) {
    switch (rule.family) {
      case "us-repeat-star": {
        const silver = Math.floor(additional / 5);
        const gold = additional % 5;
        if (silver > 0) parts.push(`${silver} Silver Star${silver > 1 ? "s" : ""}`);
        if (gold > 0) parts.push(`${gold} Gold Star${gold > 1 ? "s" : ""}`);
        break;
      }
      case "us-campaign-star": {
        const silver = Math.floor(additional / 5);
        const bronze = additional % 5;
        if (silver > 0) parts.push(`${silver} Silver Service Star${silver > 1 ? "s" : ""}`);
        if (bronze > 0) parts.push(`${bronze} Bronze Service Star${bronze > 1 ? "s" : ""}`);
        break;
      }
      case "us-olc": {
        const silver = Math.floor(additional / 5);
        const bronze = additional % 5;
        if (silver > 0) {
          parts.push(`${silver} Silver Oak Leaf Cluster${silver > 1 ? "s" : ""}`);
        }
        if (bronze > 0) {
          parts.push(`${bronze} Bronze Oak Leaf Cluster${bronze > 1 ? "s" : ""}`);
        }
        break;
      }
      case "us-numeral":
      case "service-numeral":
        parts.push(`Numeral ${rule.numeralValueMode === "additional-awards" ? additional : input.count}`);
        break;
      case "canada-maple-leaf":
        parts.push(`${additional} Maple Leaf${additional > 1 ? "s" : ""}`);
        break;
      case "commonwealth-bar":
        parts.push(`${additional} Bar${additional > 1 ? "s" : ""}`);
        break;
      case "commonwealth-rosette":
        parts.push(`${additional} Rosette${additional > 1 ? "s" : ""}`);
        break;
      case "commonwealth-clasp":
        parts.push(`${additional} Clasp${additional > 1 ? "s" : ""}`);
        break;
      default:
        break;
    }
  }

  if (input.hasValor) parts.push('"V" Device');
  if ((input.arrowheads || 0) > 0) {
    const count = Math.max(1, input.arrowheads || 0);
    parts.push(`${count} Arrowhead${count > 1 ? "s" : ""}`);
  }

  return parts.length > 0 ? `w/ ${parts.join(" & ")}` : "";
}

export function getMedalDeviceFamilyLabel(
  input?: MedalDeviceRule | string | null,
  serviceBranch?: string | null,
): string {
  const rule = resolveMedalDeviceRule(input, serviceBranch);
  switch (rule.family) {
    case "us-repeat-star":
      return "Gold/Silver repeat-award stars";
    case "us-campaign-star":
      return "Bronze/Silver service stars";
    case "us-olc":
      return "Bronze/Silver oak leaf clusters";
    case "us-numeral":
      return "Numeral repeat device";
    case "canada-maple-leaf":
      return "Maple leaf repeat devices";
    case "service-numeral":
      return "Numeral service-count devices";
    case "commonwealth-bar":
      return "Bars on medal, rosettes on ribbon bar";
    case "commonwealth-clasp":
      return "Clasps on medal, rosettes on ribbon bar";
    case "commonwealth-rosette":
      return "Rosette campaign devices";
    default:
      return "No repeat-award device";
  }
}
