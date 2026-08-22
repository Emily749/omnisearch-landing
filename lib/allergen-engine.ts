// Canonical allergen/dietary matching engine — the single source of truth
// for /api/evaluate. The extension's content.js keeps a manually-synced
// copy (it can't import this directly, being an unbundled browser script),
// so any change here must be mirrored there. See allergen-engine.test.ts
// for the behavior this is expected to guarantee.

export type SafetyStatus = "SAFE" | "CAUTION" | "UNSAFE";

export interface MacroThresholds {
  maxCarbsPer100g?: number;
  minCarbsPer100g?: number;
  maxProteinPer100g?: number;
  minProteinPer100g?: number;
  maxFatPer100g?: number;
  minFatPer100g?: number;
}

export const ALLERGEN_KNOWLEDGE_GRAPH: Record<string, string[]> = {
  GLUTEN: ["gluten", "wheat", "barley", "rye", "spelt", "kamut", "triticale", "malt", "semolina", "durum"],
  WHEAT: ["wheat"],
  CRUSTACEANS: ["crustacean", "prawn", "shrimp", "crab", "lobster", "langoustine", "krill"],
  EGGS: ["egg", "albumen", "ovalbumin", "lysozyme"],
  FISH: ["fish", "salmon", "tuna", "cod", "haddock", "anchovy", "sardine"],
  PEANUTS: ["peanut", "groundnut", "arachis"],
  SOY: ["soy", "soya", "soybean", "edamame", "tofu", "tempeh", "miso"],
  MILK: ["milk", "casein", "caseinate", "whey", "butter", "ghee", "cheese", "cream", "lactalbumin", "lactoglobulin", "yogurt"],
  // Bare "nut" is safe to include now that the "-free" guard in
  // detectAllergenCategories exists — "Nut Free" no longer false-positives
  // — and it's needed because "may contain nuts" advisories almost always
  // say the generic word rather than naming a specific tree nut.
  TREE_NUTS: ["nut", "almond", "hazelnut", "walnut", "cashew", "pecan", "brazil nut", "pistachio", "macadamia"],
  CELERY: ["celery", "celeriac"],
  MUSTARD: ["mustard"],
  SESAME: ["sesame", "tahini", "benne", "gingelly"],
  SULPHITES: ["sulphite", "sulfite", "sulphur dioxide", "sulfur dioxide", "e220", "e221", "e222", "e223", "e224", "e226", "e227", "e228"],
  LUPIN: ["lupin", "lupine"],
  MOLLUSCS: ["mollusc", "mollusk", "mussel", "clam", "oyster", "scallop", "squid", "octopus", "snail", "whelk"],
};

export const KNOWN_ALIAS_TO_CANONICAL: Record<string, string> = {
  lactalbumin: "milk",
  caseinate: "milk",
  casein: "milk",
  whey: "milk",
  soya: "soy",
  soybean: "soy",
  sulphur: "sulfur",
};

export const RESTRICTION_TO_CATEGORIES: Record<string, string[]> = {
  gluten: ["GLUTEN"],
  wheat_allergy: ["WHEAT"],
  peanuts: ["PEANUTS"],
  nuts: ["TREE_NUTS"],
  sesame: ["SESAME"],
  dairy_allergy: ["MILK"],
  lactose_intolerance: ["MILK"],
  seafood: ["FISH", "CRUSTACEANS", "MOLLUSCS"],
  fish: ["FISH"],
  crustaceans: ["CRUSTACEANS"],
  molluscs: ["MOLLUSCS"],
  eggs: ["EGGS"],
  soy: ["SOY"],
  mustard: ["MUSTARD"],
  celery: ["CELERY"],
  lupin: ["LUPIN"],
  sulphites: ["SULPHITES"],
};

export const MAY_CONTAIN_TO_CATEGORIES: Record<string, string[]> = {
  ...RESTRICTION_TO_CATEGORIES,
};

export const LIFESTYLE_RESTRICTIONS = new Set([
  "vegan",
  "vegetarian",
  "low_fodmap",
  "halal",
  "kosher",
  "type2_diabetes",
]);

export const ALLOWED_RESTRICTIONS = new Set([
  ...Object.keys(RESTRICTION_TO_CATEGORIES),
  ...Array.from(LIFESTYLE_RESTRICTIONS),
]);
export const ALLOWED_MAY_CONTAIN = new Set(Object.keys(MAY_CONTAIN_TO_CATEGORIES));

const HALAL_FORBIDDEN = /\b(pork|bacon|hams?|lard|gelatine?s?|alcohol|wines?|beers?|ethanol)\b/i;
const KOSHER_FORBIDDEN = /\b(pork|bacon|hams?|lard|gelatine?s?|prawns?|crabs?|lobsters?|shrimps?|mussels?|clams?|oysters?|squids?|scallops?|eels?|catfish)\b/i;
const MEAT = /\b(beef(?![- ]tomato)|chickens?|pork|lambs?|turkeys?|ducks?|venison|bacon|hams?|sausages?|meats?|poultry|gelatine?s?|lard|suet|tallow|cochineal|carmine)\b|\bsteaks?(?![- ](?:cut|potato|chip|fry|fries))\b/i;
const HONEY = /\b(honey|royal jelly)\b/i;
const FODMAP_HIGH = /\b(onion|garlic|shallot|leek|chicory|inulin|honey|agave|fructose|high[- ]fructose[- ]corn[- ]syrup|hfcs|sorbitol|mannitol|xylitol|maltitol|isomalt|erythritol|apple|pear|watermelon|mushroom|milk|whey|lactose)\b/i;
const FODMAP_GRAINS = /\b(wheat|barley|rye)\b/i;

// Generic legend/instructional copy that UK grocery sites print on *every*
// product page (e.g. "Allergy Advice: For allergens, including cereals
// containing gluten, see ingredients in bold."). It names allergens purely
// as an illustrative example of what bold text means — not as a statement
// about this product — so it must never reach the keyword matcher. Real
// ingredient and "may contain" text essentially never uses the word
// "bold", so dropping any clause containing it is a safe, low-risk filter.
const BOLD_LEGEND_CLAUSE = /[^.\n]*\bbold\b[^.\n]*[.\n]?/gi;

export function stripAdvisoryBoilerplate(text = ""): string {
  return String(text).replace(BOLD_LEGEND_CLAUSE, " ");
}

export function normalizeInput(input = ""): string {
  let normalized = String(input).toLowerCase();
  normalized = normalized.replace(/[_/|]/g, " ");
  normalized = normalized.replace(/[^\w\s%.,-]/g, " ");
  normalized = normalized.replace(/\s+/g, " ").trim();

  for (const [alias, canonical] of Object.entries(KNOWN_ALIAS_TO_CANONICAL)) {
    normalized = normalized.replace(new RegExp(`\\b${alias}\\b`, "g"), canonical);
  }

  return normalized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Covers "Free From: Gluten, Wheat, Milk" style declaration panels — common
// on UK packaging, and a reliable source of false positives if the words
// inside it are read as claims about what's present rather than absent.
// Bounded to a generous-but-finite length so an unpunctuated wall of real
// ingredients after a stray "free from" can't get silently swallowed too.
const FREE_FROM_CLAUSE = /\bfree\s*from\b\s*:?\s*[a-z0-9,\s-]{0,200}/gi;

export function detectAllergenCategories(input = ""): Set<string> {
  const normalized = normalizeInput(input).replace(FREE_FROM_CLAUSE, " ");
  const result = new Set<string>();

  for (const [category, aliases] of Object.entries(ALLERGEN_KNOWLEDGE_GRAPH)) {
    const isPresent = aliases.some((alias) => {
      // "s?" tolerates plain English plurals ("Peanuts", "Almonds",
      // "Prawns", "Mussels" are all far more common on real labels than
      // the singular forms). "(?![\s-]*free\b)" then skips the match when
      // the very next word is "free" ("Gluten Free Oats", "Nuts-Free") —
      // a claim of absence, not presence. Trailing punctuation ("wheat,"
      // / "wheat.") is matched fine since \b doesn't require a space.
      const pattern = new RegExp(`\\b${escapeRegExp(alias)}s?\\b(?![\\s-]*free\\b)`, "i");
      return pattern.test(normalized);
    });
    if (isPresent) result.add(category);
  }

  return result;
}

const MAY_CONTAIN_PATTERN = /may contain[^.]+/gi;

// A "may contain X" clause is a trace/cross-contamination warning, not a
// statement that X is actually an ingredient — but it commonly sits right
// inside the same block of text as the real ingredients (either because a
// retailer's page doesn't separate them, or because Open Food Facts
// contributors often paste the whole label, trace warning included, into
// one ingredients field). Left in place, a naive "does this text mention
// the word wheat" check would wrongly promote "may contain wheat" into a
// hard "contains wheat" ingredient match. These two functions let a
// caller pull such clauses out for trace detection and exclude them from
// ingredient detection — same split the engine already makes for the
// retailer's own manufacturing_traces field.
export function extractMayContainClauses(text: string): string[] {
  return text.match(MAY_CONTAIN_PATTERN) || [];
}

export function stripMayContainClauses(text: string): string {
  return text.replace(MAY_CONTAIN_PATTERN, " ");
}

export function categoriesFromIds(ids: string[], mapping: Record<string, string[]>): Set<string> {
  const categories = new Set<string>();
  for (const id of ids) {
    for (const category of mapping[id] || []) {
      categories.add(category);
    }
  }
  return categories;
}

export function parseMacroData(input = "") {
  const text = normalizeInput(input).replace(/(\d),(\d)/g, "$1.$2");
  const byLabel = (labels: string[]) => {
    for (const label of labels) {
      const permissive = new RegExp(`\\b${label}\\b[^\\d]{0,45}(\\d+(?:\\.\\d+)?)`, "i");
      const strictWithG = new RegExp(`\\b${label}\\b[^\\d]{0,45}(\\d+(?:\\.\\d+)?)\\s*g`, "i");
      const match = text.match(strictWithG) || text.match(permissive);
      if (match) return Number.parseFloat(match[1]);
    }
    return null;
  };

  return {
    carbsPer100g: byLabel(["carbohydrate", "carbohydrates", "carb", "carbs"]),
    proteinPer100g: byLabel(["protein"]),
    fatPer100g: byLabel(["fat", "lipid", "lipids"]),
  };
}

function isExplicitlyCertified(term: string, context: string): boolean {
  const regex = new RegExp(`\\b(${term}[- ]free|free[- ]from[- ]${term}|suitable[- ]for[- ]${term}s?|certified[- ]${term})\\b`, "i");
  return regex.test(context);
}

export function evaluateDietaryConstraints({
  normalizedContext,
  restrictions,
  reasons,
}: {
  normalizedContext: string;
  restrictions: string[];
  reasons: string[];
}): void {
  const contextCategories = detectAllergenCategories(normalizedContext);
  const isVegetarianCertified = /\b(suitable[- ]for[- ]vegetarians?|certified[- ]vegetarian|suitable[- ]for[- ]veggies)\b/i.test(normalizedContext);
  const isVeganCertified = isExplicitlyCertified("vegan", normalizedContext) || /\b(suitable[- ]for[- ]vegans?)\b/i.test(normalizedContext);
  const isFodmapCertified = /\b(low[- ]fodmap|fodmap[- ]friendly|monash[- ]certified)\b/i.test(normalizedContext);
  const isKosherCertified = /\b(kosher|pareve|parve|kosher[- ]certified|hechsher)\b/i.test(normalizedContext);

  if (restrictions.includes("low_fodmap") && !isFodmapCertified) {
    if (FODMAP_HIGH.test(normalizedContext)) reasons.push("Contains high-FODMAP ingredients.");
    if (FODMAP_GRAINS.test(normalizedContext) && !isExplicitlyCertified("gluten", normalizedContext)) {
      reasons.push("Contains high-FODMAP grains (wheat, barley, or rye).");
    }
  }

  if (restrictions.includes("halal") && HALAL_FORBIDDEN.test(normalizedContext)) {
    reasons.push("Contains non-Halal ingredients.");
  }

  if (restrictions.includes("kosher") && !isKosherCertified && KOSHER_FORBIDDEN.test(normalizedContext)) {
    reasons.push("Contains non-Kosher ingredients.");
  }

  if (
    restrictions.includes("vegan") &&
    !isVeganCertified &&
    (MEAT.test(normalizedContext) || HONEY.test(normalizedContext) || contextCategories.has("MILK") || contextCategories.has("EGGS") || contextCategories.has("FISH"))
  ) {
    reasons.push("Contains animal-derived ingredients conflicting with Vegan profiles.");
  }

  if (restrictions.includes("vegetarian") && !isVegetarianCertified && !isVeganCertified) {
    if (MEAT.test(normalizedContext) || contextCategories.has("FISH")) {
      reasons.push("Contains animal tissue derivatives conflicting with Vegetarian profiles.");
    }
  }

  if (restrictions.includes("type2_diabetes")) {
    const glycemicTriggers = /\b(sugar|syrup|dextrose|fructose|maltodextrin|honey|agave|sucrose)\b/i;
    const highSugarVehicles = /\b(chocolate|sweet|candy|cola|soda|jam|tart|cookie)\b/i;
    const isSugarFree = /\b(sugar[- ]free|zero[- ]sugar|no[- ]added[- ]sugar)\b/i.test(normalizedContext);

    if ((glycemicTriggers.test(normalizedContext) && /\bhigh\b/i.test(normalizedContext)) || (highSugarVehicles.test(normalizedContext) && !isSugarFree)) {
      reasons.push("High glycemic load risk flagged for Type 2 Diabetes.");
    }
  }
}

export interface EvaluateInput {
  name?: string;
  rawIngredients?: string;
  manufacturingTraces?: string;
  nutritionText?: string;
  restrictions?: string[];
  mayContainRestrictions?: string[];
  macros?: MacroThresholds;
  // Categories from an optional AI-assisted second pass over the same
  // text (see lib/ai-categorize.ts) — unioned into the keyword matcher's
  // own findings, never a replacement for them. The keyword matcher is
  // deterministic and covered by tests; AI can only ever ADD a category
  // it independently spotted, never remove one the matcher already found.
  // Untrusted values are filtered against the known category list before
  // use, same as any other external input.
  extraIngredientCategories?: string[];
  extraTraceCategories?: string[];
}

export interface EvaluateResult {
  status: SafetyStatus;
  isSafe: boolean;
  reasons: string[];
  normalizedIngredients: string;
  normalizedTraces: string;
  detectedIngredientCategories: string[];
  detectedTraceCategories: string[];
  extractedMacros: ReturnType<typeof parseMacroData>;
}

export function evaluateProduct(input: EvaluateInput): EvaluateResult {
  const {
    name = "",
    rawIngredients = "",
    manufacturingTraces = "",
    nutritionText = "",
    restrictions = [],
    mayContainRestrictions = [],
    macros = {},
    extraIngredientCategories = [],
    extraTraceCategories = [],
  } = input;

  const cleanIngredients = stripAdvisoryBoilerplate(rawIngredients);
  const cleanTraces = stripAdvisoryBoilerplate(manufacturingTraces);

  const combinedContext = `${name} ${cleanIngredients}`.trim();
  const normalizedContext = normalizeInput(combinedContext);
  const normalizedTrace = normalizeInput(cleanTraces);
  const normalizedNutrition = normalizeInput(nutritionText);

  const knownCategories = new Set(Object.keys(ALLERGEN_KNOWLEDGE_GRAPH));
  const contextMayContainClauses = extractMayContainClauses(normalizedContext);
  const ingredientCategories = detectAllergenCategories(stripMayContainClauses(normalizedContext));
  for (const category of extraIngredientCategories) {
    if (knownCategories.has(category)) ingredientCategories.add(category);
  }

  const traceCategories = detectAllergenCategories(
    `${normalizedTrace} ${contextMayContainClauses.join(" ")}`
  );
  for (const category of extraTraceCategories) {
    if (knownCategories.has(category)) traceCategories.add(category);
  }

  const restrictedCategories = categoriesFromIds(restrictions, RESTRICTION_TO_CATEGORIES);
  const traceSensitiveCategories = categoriesFromIds(mayContainRestrictions, MAY_CONTAIN_TO_CATEGORIES);

  const hardReasons: string[] = [];
  const cautionReasons: string[] = [];

  for (const category of restrictedCategories) {
    if (ingredientCategories.has(category)) {
      hardReasons.push(`Contains ${category}.`);
    }
  }

  for (const category of traceSensitiveCategories) {
    // Skip only if THIS category already produced a hard reason above —
    // not merely because the user also listed it as a hard restriction.
    // Someone can have gluten as both a hard restriction and a "caution
    // on traces" pick; if the product has no gluten ingredient but does
    // carry a "may contain gluten" warning, that's real information they
    // asked for and it must still surface as a caution, not get silently
    // dropped because gluten also happens to appear in restrictedCategories.
    if (traceCategories.has(category) && !ingredientCategories.has(category)) {
      cautionReasons.push(`May contain ${category}.`);
    }
  }

  if (restrictions.includes("lactose_intolerance") && /\b(fermented|aged)\b/i.test(normalizedContext)) {
    const idx = hardReasons.findIndex((reason) => reason.includes("MILK"));
    if (idx !== -1) hardReasons.splice(idx, 1);
  }

  evaluateDietaryConstraints({ normalizedContext, restrictions, reasons: hardReasons });

  const parsedMacros = parseMacroData(`${normalizedNutrition} ${normalizedContext}`);
  if (parsedMacros.carbsPer100g !== null) {
    if (macros.maxCarbsPer100g !== undefined && parsedMacros.carbsPer100g > macros.maxCarbsPer100g) {
      hardReasons.push(`Exceeds carbohydrate limit (${parsedMacros.carbsPer100g}g/100g).`);
    }
    if (macros.minCarbsPer100g !== undefined && parsedMacros.carbsPer100g < macros.minCarbsPer100g) {
      hardReasons.push(`Below carbohydrate floor (${parsedMacros.carbsPer100g}g/100g).`);
    }
  }

  if (parsedMacros.proteinPer100g !== null) {
    if (macros.maxProteinPer100g !== undefined && parsedMacros.proteinPer100g > macros.maxProteinPer100g) {
      hardReasons.push(`Exceeds protein ceiling (${parsedMacros.proteinPer100g}g/100g).`);
    }
    if (macros.minProteinPer100g !== undefined && parsedMacros.proteinPer100g < macros.minProteinPer100g) {
      hardReasons.push(`Below protein floor (${parsedMacros.proteinPer100g}g/100g).`);
    }
  }

  if (parsedMacros.fatPer100g !== null) {
    if (macros.maxFatPer100g !== undefined && parsedMacros.fatPer100g > macros.maxFatPer100g) {
      hardReasons.push(`Exceeds fat limit (${parsedMacros.fatPer100g}g/100g).`);
    }
    if (macros.minFatPer100g !== undefined && parsedMacros.fatPer100g < macros.minFatPer100g) {
      hardReasons.push(`Below fat floor (${parsedMacros.fatPer100g}g/100g).`);
    }
  }

  let status: SafetyStatus = "SAFE";
  let reasons: string[] = [];
  if (hardReasons.length > 0) {
    status = "UNSAFE";
    reasons = hardReasons;
  } else if (cautionReasons.length > 0) {
    status = "CAUTION";
    reasons = cautionReasons;
  }

  return {
    status,
    isSafe: status === "SAFE",
    reasons,
    normalizedIngredients: normalizeInput(rawIngredients),
    normalizedTraces: normalizedTrace,
    detectedIngredientCategories: Array.from(ingredientCategories),
    detectedTraceCategories: Array.from(traceCategories),
    extractedMacros: parsedMacros,
  };
}
