import {
  ALLERGEN_KNOWLEDGE_GRAPH,
  detectAllergenCategories,
  extractMayContainClauses,
  stripMayContainClauses,
} from "./allergen-engine";

// Free, open, non-AI second data source: Open Food Facts (openfoodfacts.org)
// is a community-maintained database of real grocery products, keyed by
// barcode, with allergens already tagged using the same EU 14-allergen
// list we use. No API key, no meaningful rate limit — unlike the Gemini
// free tier, this doesn't fall over on a busy 24-product listing page.
//
// Same safety design as before: this only ever ADDS a category to what
// the retailer's own scraped text already found (see
// extraIngredientCategories / extraTraceCategories in evaluateProduct).
// It's real curated data, not a guess, but OFF entries are
// community-edited and can be incomplete for a given product — so it
// supplements the deterministic scrape-and-match pipeline, never
// replaces it, and any failure (product not found, network error,
// timeout) just yields nothing extra.

const OFF_TIMEOUT_MS = 4000;

// OFF's allergen taxonomy doesn't distinguish "wheat" from other
// gluten-bearing cereals (barley, rye) the way our WHEAT category does —
// it only has one generic "gluten" tag. Mapping that to our own WHEAT
// category would over-flag a wheat-specific allergy on a product that's
// actually barley- or rye-based, so it maps only to GLUTEN. Everything
// else here is a clean 1:1 match to the known category list.
const OFF_TAG_TO_CATEGORY: Record<string, string> = {
  "en:gluten": "GLUTEN",
  "en:crustaceans": "CRUSTACEANS",
  "en:eggs": "EGGS",
  "en:fish": "FISH",
  "en:peanuts": "PEANUTS",
  "en:soybeans": "SOY",
  "en:milk": "MILK",
  "en:nuts": "TREE_NUTS",
  "en:celery": "CELERY",
  "en:mustard": "MUSTARD",
  "en:sesame-seeds": "SESAME",
  "en:sulphur-dioxide-and-sulphites": "SULPHITES",
  "en:lupin": "LUPIN",
  "en:molluscs": "MOLLUSCS",
};

const KNOWN_CATEGORIES = new Set(Object.keys(ALLERGEN_KNOWLEDGE_GRAPH));

export interface OffCategories {
  ingredientCategories: string[];
  traceCategories: string[];
}

const EMPTY: OffCategories = { ingredientCategories: [], traceCategories: [] };

export function mapTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const mapped = tags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => OFF_TAG_TO_CATEGORY[tag])
    .filter((category): category is string => Boolean(category) && KNOWN_CATEGORIES.has(category));
  return Array.from(new Set(mapped));
}

function isValidBarcode(value: unknown): value is string {
  return typeof value === "string" && /^\d{8,14}$/.test(value.trim());
}

export async function getOpenFoodFactsCategories(barcode: unknown): Promise<OffCategories> {
  if (!isValidBarcode(barcode)) return EMPTY;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=status,allergens_tags,traces_tags,ingredients_text_en,ingredients_text`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "TrustTag/1.0 (allergen safety checker; contact hello@trusttag.app)" },
      }
    );

    if (!response.ok) return EMPTY;

    const data = await response.json();
    if (data.status !== 1 || !data.product) return EMPTY;

    const ingredientCategories = new Set(mapTags(data.product.allergens_tags));
    const traceCategories = new Set(mapTags(data.product.traces_tags));

    // OFF's own ingredients text is an independent source from whatever
    // the retailer's page happened to render — running our existing,
    // tested keyword matcher over it too (not trusting OFF's tags alone)
    // catches cases where OFF's community tagging is stale but its
    // ingredients text is current, or vice versa. Contributors often
    // paste the entire label verbatim into this one field, trace warning
    // included ("...flavourings, may contain nuts, wheat, milk solids..."),
    // so that clause has to be pulled out before treating the rest as
    // real ingredients — otherwise "may contain wheat" gets misread as a
    // hard "contains wheat" (confirmed live on Cadbury Dairy Milk).
    const offIngredientsText = data.product.ingredients_text_en || data.product.ingredients_text || "";
    const offMayContainClauses = extractMayContainClauses(offIngredientsText);
    for (const category of detectAllergenCategories(stripMayContainClauses(offIngredientsText))) {
      ingredientCategories.add(category);
    }
    for (const category of detectAllergenCategories(offMayContainClauses.join(" "))) {
      traceCategories.add(category);
    }

    return {
      ingredientCategories: Array.from(ingredientCategories),
      traceCategories: Array.from(traceCategories),
    };
  } catch {
    return EMPTY;
  } finally {
    clearTimeout(timeout);
  }
}
