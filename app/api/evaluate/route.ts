import { NextResponse } from 'next/server';

type SafetyStatus = 'SAFE' | 'CAUTION' | 'UNSAFE';

interface MacroThresholds {
  maxCarbsPer100g?: number;
  minCarbsPer100g?: number;
  maxProteinPer100g?: number;
  minProteinPer100g?: number;
  maxFatPer100g?: number;
  minFatPer100g?: number;
}

interface ProductRequestBody {
  name?: string;
  raw_ingredients?: string;
  manufacturing_traces?: string;
  nutrition_text?: string;
  restrictions?: string[];
  mayContainRestrictions?: string[];
  macros?: MacroThresholds;
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

const ALLERGEN_KNOWLEDGE_GRAPH: Record<string, string[]> = {
  GLUTEN: ['gluten', 'wheat', 'barley', 'rye', 'spelt', 'kamut', 'triticale', 'malt', 'semolina', 'durum'],
  WHEAT: ['wheat'],
  CRUSTACEANS: ['crustacean', 'prawn', 'shrimp', 'crab', 'lobster', 'langoustine', 'krill'],
  EGGS: ['egg', 'albumen', 'ovalbumin', 'lysozyme'],
  FISH: ['fish', 'salmon', 'tuna', 'cod', 'haddock', 'anchovy', 'sardine'],
  PEANUTS: ['peanut', 'groundnut', 'arachis'],
  SOY: ['soy', 'soya', 'soybean', 'edamame', 'tofu', 'tempeh', 'miso'],
  MILK: ['milk', 'casein', 'caseinate', 'whey', 'butter', 'ghee', 'cheese', 'cream', 'lactalbumin', 'lactoglobulin', 'yogurt'],
  TREE_NUTS: ['nut', 'almond', 'hazelnut', 'walnut', 'cashew', 'pecan', 'brazil nut', 'pistachio', 'macadamia'],
  CELERY: ['celery', 'celeriac'],
  MUSTARD: ['mustard'],
  SESAME: ['sesame', 'tahini', 'benne', 'gingelly'],
  SULPHITES: ['sulphite', 'sulfite', 'sulphur dioxide', 'sulfur dioxide', 'e220', 'e221', 'e222', 'e223', 'e224', 'e226', 'e227', 'e228'],
  LUPIN: ['lupin', 'lupine'],
  MOLLUSCS: ['mollusc', 'mollusk', 'mussel', 'clam', 'oyster', 'scallop', 'squid', 'octopus', 'snail', 'whelk']
};

const KNOWN_ALIAS_TO_CANONICAL: Record<string, string> = {
  lactalbumin: 'milk',
  caseinate: 'milk',
  casein: 'milk',
  whey: 'milk',
  soya: 'soy',
  soybean: 'soy',
  sulphur: 'sulfur'
};

const RESTRICTION_TO_CATEGORIES: Record<string, string[]> = {
  gluten: ['GLUTEN'],
  wheat_allergy: ['WHEAT'],
  peanuts: ['PEANUTS'],
  nuts: ['TREE_NUTS'],
  sesame: ['SESAME'],
  dairy_allergy: ['MILK'],
  lactose_intolerance: ['MILK'],
  seafood: ['FISH', 'CRUSTACEANS', 'MOLLUSCS'],
  fish: ['FISH'],
  crustaceans: ['CRUSTACEANS'],
  molluscs: ['MOLLUSCS'],
  eggs: ['EGGS'],
  soy: ['SOY'],
  mustard: ['MUSTARD'],
  celery: ['CELERY'],
  lupin: ['LUPIN'],
  sulphites: ['SULPHITES']
};

const MAY_CONTAIN_TO_CATEGORIES: Record<string, string[]> = {
  ...RESTRICTION_TO_CATEGORIES
};

const LIFESTYLE_RESTRICTIONS = new Set(['vegan', 'vegetarian', 'low_fodmap', 'halal', 'kosher', 'type2_diabetes']);
const ALLOWED_RESTRICTIONS = new Set([...Object.keys(RESTRICTION_TO_CATEGORIES), ...Array.from(LIFESTYLE_RESTRICTIONS)]);
const ALLOWED_MAY_CONTAIN = new Set(Object.keys(MAY_CONTAIN_TO_CATEGORIES));
const ALLOWED_MACRO_FIELDS: (keyof MacroThresholds)[] = [
  'maxCarbsPer100g',
  'minCarbsPer100g',
  'maxProteinPer100g',
  'minProteinPer100g',
  'maxFatPer100g',
  'minFatPer100g'
];

const HALAL_FORBIDDEN = /\b(pork|bacon|ham|lard|gelatin|alcohol|wine|beer|ethanol)\b/i;
const KOSHER_FORBIDDEN = /\b(pork|bacon|ham|lard|gelatin|prawn|crab|lobster|shrimp|mussel|clam|oyster|squid|scallop|eel|catfish)\b/i;
const MEAT = /\b(beef(?![- ]tomato)|chicken|pork|lamb|turkey|duck|venison|bacon|ham|sausage|meat|poultry|gelatin|lard|suet|tallow|cochineal|carmine)\b|\bsteak(?![- ](?:cut|potato|chip|fry|fries))\b/i;
const HONEY = /\b(honey|royal jelly)\b/i;
const FODMAP_HIGH = /\b(onion|garlic|shallot|leek|chicory|inulin|honey|agave|fructose|high[- ]fructose[- ]corn[- ]syrup|hfcs|sorbitol|mannitol|xylitol|maltitol|isomalt|erythritol|apple|pear|watermelon|mushroom|milk|whey|lactose)\b/i;
const FODMAP_GRAINS = /\b(wheat|barley|rye)\b/i;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.TRUSTTAG_RATE_LIMIT_PER_MINUTE || '120');

declare global {
  var __trusttagRateLimiter: Map<string, RateLimitState> | undefined;
}

const rateLimiter = globalThis.__trusttagRateLimiter ?? new Map<string, RateLimitState>();
globalThis.__trusttagRateLimiter = rateLimiter;

export const runtime = 'edge';

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return 'unknown';
  return forwarded.split(',')[0]?.trim() || 'unknown';
}

// This endpoint is gated by TRUSTTAG_EXTENSION_KEY, not cookies, and its
// only legitimate caller (the browser companion) runs inside whichever
// retailer's page a user happens to be on — an origin we can't enumerate
// in advance. So we reflect whatever origin asks, and let the API key +
// rate limit be the actual gate.
function resolveCorsOrigin(request: Request): string | null {
  return request.headers.get('origin');
}

function withCors(request: Request, response: NextResponse) {
  const allowedOrigin = resolveCorsOrigin(request);
  if (allowedOrigin) response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Vary', 'Origin');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  return response;
}

function normalizeInput(input = ''): string {
  let normalized = String(input).toLowerCase();
  normalized = normalized.replace(/[_/|]/g, ' ');
  normalized = normalized.replace(/[^\w\s%.,-]/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ').trim();

  for (const [alias, canonical] of Object.entries(KNOWN_ALIAS_TO_CANONICAL)) {
    normalized = normalized.replace(new RegExp(`\\b${alias}\\b`, 'g'), canonical);
  }

  return normalized;
}

function detectAllergenCategories(input = ''): Set<string> {
  const text = ` ${normalizeInput(input)} `;
  const result = new Set<string>();

  for (const [category, aliases] of Object.entries(ALLERGEN_KNOWLEDGE_GRAPH)) {
    if (aliases.some((alias) => text.includes(` ${alias} `))) {
      result.add(category);
    }
  }

  return result;
}

function categoriesFromIds(ids: string[], mapping: Record<string, string[]>): Set<string> {
  const categories = new Set<string>();
  for (const id of ids) {
    for (const category of mapping[id] || []) {
      categories.add(category);
    }
  }
  return categories;
}

function parseMacroData(input = '') {
  const text = normalizeInput(input).replace(/(\d),(\d)/g, '$1.$2');
  const byLabel = (labels: string[]) => {
    for (const label of labels) {
      const permissive = new RegExp(`\\b${label}\\b[^\\d]{0,45}(\\d+(?:\\.\\d+)?)`, 'i');
      const strictWithG = new RegExp(`\\b${label}\\b[^\\d]{0,45}(\\d+(?:\\.\\d+)?)\\s*g`, 'i');
      const match = text.match(strictWithG) || text.match(permissive);
      if (match) return Number.parseFloat(match[1]);
    }
    return null;
  };

  return {
    carbsPer100g: byLabel(['carbohydrate', 'carbohydrates', 'carb', 'carbs']),
    proteinPer100g: byLabel(['protein']),
    fatPer100g: byLabel(['fat', 'lipid', 'lipids'])
  };
}

function isExplicitlyCertified(term: string, context: string): boolean {
  const regex = new RegExp(`\\b(${term}[- ]free|free[- ]from[- ]${term}|suitable[- ]for[- ]${term}s?|certified[- ]${term})\\b`, 'i');
  return regex.test(context);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function validateRequestBody(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Request body must be a JSON object.';
  const typed = body as ProductRequestBody;

  const stringFields: (keyof ProductRequestBody)[] = ['name', 'raw_ingredients', 'manufacturing_traces', 'nutrition_text'];
  for (const field of stringFields) {
    const value = typed[field];
    if (value !== undefined && typeof value !== 'string') return `${field} must be a string.`;
  }

  if (typeof typed.name === 'string' && typed.name.length > 300) return 'name is too long.';
  if (typeof typed.raw_ingredients === 'string' && typed.raw_ingredients.length > 20_000) return 'raw_ingredients is too long.';
  if (typeof typed.manufacturing_traces === 'string' && typed.manufacturing_traces.length > 8_000) return 'manufacturing_traces is too long.';
  if (typeof typed.nutrition_text === 'string' && typed.nutrition_text.length > 8_000) return 'nutrition_text is too long.';

  if (typed.restrictions !== undefined) {
    if (!isStringArray(typed.restrictions)) return 'restrictions must be a string array.';
    if (typed.restrictions.some((item) => !ALLOWED_RESTRICTIONS.has(item))) return 'restrictions contains unknown values.';
  }

  if (typed.mayContainRestrictions !== undefined) {
    if (!isStringArray(typed.mayContainRestrictions)) return 'mayContainRestrictions must be a string array.';
    if (typed.mayContainRestrictions.some((item) => !ALLOWED_MAY_CONTAIN.has(item))) return 'mayContainRestrictions contains unknown values.';
  }

  if (typed.macros !== undefined) {
    if (!typed.macros || typeof typed.macros !== 'object' || Array.isArray(typed.macros)) return 'macros must be an object.';
    for (const field of ALLOWED_MACRO_FIELDS) {
      const value = typed.macros[field];
      if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 1000)) {
        return `${field} must be a finite number between 0 and 1000.`;
      }
    }
  }

  return null;
}

function addRateLimitHeaders(response: NextResponse, remaining: number, resetAt: number): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(resetAt / 1000)));
  return response;
}

function enforceRateLimit(requestIdentity: string) {
  const now = Date.now();
  const current = rateLimiter.get(requestIdentity);

  if (!current || current.resetAt <= now) {
    const next: RateLimitState = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimiter.set(requestIdentity, next);
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt: next.resetAt };
  }

  current.count += 1;
  rateLimiter.set(requestIdentity, current);
  const remaining = RATE_LIMIT_MAX_REQUESTS - current.count;
  return { allowed: current.count <= RATE_LIMIT_MAX_REQUESTS, remaining, resetAt: current.resetAt };
}

function evaluateDietaryConstraints({
  normalizedContext,
  restrictions,
  reasons
}: {
  normalizedContext: string;
  restrictions: string[];
  reasons: string[];
}): void {
  const contextCategories = detectAllergenCategories(normalizedContext);
  const isVegetarianCertified = /\b(suitable[- ]for[- ]vegetarians?|certified[- ]vegetarian|suitable[- ]for[- ]veggies)\b/i.test(normalizedContext);
  const isVeganCertified = isExplicitlyCertified('vegan', normalizedContext) || /\b(suitable[- ]for[- ]vegans?)\b/i.test(normalizedContext);
  const isFodmapCertified = /\b(low[- ]fodmap|fodmap[- ]friendly|monash[- ]certified)\b/i.test(normalizedContext);
  const isKosherCertified = /\b(kosher|pareve|parve|kosher[- ]certified|hechsher)\b/i.test(normalizedContext);

  if (restrictions.includes('low_fodmap') && !isFodmapCertified) {
    if (FODMAP_HIGH.test(normalizedContext)) reasons.push('Contains high-FODMAP ingredients.');
    if (FODMAP_GRAINS.test(normalizedContext) && !isExplicitlyCertified('gluten', normalizedContext)) {
      reasons.push('Contains high-FODMAP grains (wheat, barley, or rye).');
    }
  }

  if (restrictions.includes('halal') && HALAL_FORBIDDEN.test(normalizedContext)) {
    reasons.push('Contains non-Halal ingredients.');
  }

  if (restrictions.includes('kosher') && !isKosherCertified && KOSHER_FORBIDDEN.test(normalizedContext)) {
    reasons.push('Contains non-Kosher ingredients.');
  }

  if (
    restrictions.includes('vegan') &&
    !isVeganCertified &&
    (MEAT.test(normalizedContext) || HONEY.test(normalizedContext) || contextCategories.has('MILK') || contextCategories.has('EGGS') || contextCategories.has('FISH'))
  ) {
    reasons.push('Contains animal-derived ingredients conflicting with Vegan profiles.');
  }

  if (restrictions.includes('vegetarian') && !isVegetarianCertified && !isVeganCertified) {
    if (MEAT.test(normalizedContext) || contextCategories.has('FISH')) {
      reasons.push('Contains animal tissue derivatives conflicting with Vegetarian profiles.');
    }
  }

  if (restrictions.includes('type2_diabetes')) {
    const glycemicTriggers = /\b(sugar|syrup|dextrose|fructose|maltodextrin|honey|agave|sucrose)\b/i;
    const highSugarVehicles = /\b(chocolate|sweet|candy|cola|soda|jam|tart|cookie)\b/i;
    const isSugarFree = /\b(sugar[- ]free|zero[- ]sugar|no[- ]added[- ]sugar)\b/i.test(normalizedContext);

    if ((glycemicTriggers.test(normalizedContext) && /\bhigh\b/i.test(normalizedContext)) || (highSugarVehicles.test(normalizedContext) && !isSugarFree)) {
      reasons.push('High glycemic load risk flagged for Type 2 Diabetes.');
    }
  }
}

export async function OPTIONS(request: Request) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const apiKey = request.headers.get('x-api-key');
    const validApiKeys = [process.env.TRUSTTAG_EXTENSION_KEY].filter(Boolean) as string[];

    if (!apiKey || !validApiKeys.includes(apiKey)) {
      return withCors(
        request,
        NextResponse.json({ status: 'UNSAFE', isSafe: false, reasons: ['Unauthorized key tokens.'] }, { status: 401 })
      );
    }

    const rateKey = `${apiKey}:${getClientIp(request)}`;
    const rate = enforceRateLimit(rateKey);
    if (!rate.allowed) {
      const response = withCors(
        request,
        NextResponse.json({ status: 'UNSAFE', isSafe: false, reasons: ['Rate limit exceeded.'] }, { status: 429 })
      );
      return addRateLimitHeaders(response, rate.remaining, rate.resetAt);
    }

    const body = await request.json();
    const validationError = validateRequestBody(body);
    if (validationError) {
      const response = withCors(
        request,
        NextResponse.json({ status: 'UNSAFE', isSafe: false, reasons: [validationError] }, { status: 400 })
      );
      return addRateLimitHeaders(response, rate.remaining, rate.resetAt);
    }

    const {
      name = '',
      raw_ingredients = '',
      manufacturing_traces = '',
      nutrition_text = '',
      restrictions = [],
      mayContainRestrictions = [],
      macros = {}
    } = body as ProductRequestBody;

    const combinedContext = `${name} ${raw_ingredients}`.trim();
    if (!combinedContext) {
      const response = withCors(
        request,
        NextResponse.json({ status: 'UNSAFE', isSafe: false, reasons: ['No text context provided.'] }, { status: 400 })
      );
      return addRateLimitHeaders(response, rate.remaining, rate.resetAt);
    }

    const normalizedContext = normalizeInput(combinedContext);
    const normalizedTrace = normalizeInput(manufacturing_traces);
    const normalizedNutrition = normalizeInput(nutrition_text);

    const ingredientCategories = detectAllergenCategories(normalizedContext);
    const traceCategories = detectAllergenCategories(
      `${normalizedTrace} ${(normalizedContext.match(/may contain[^.]+/g) || []).join(' ')}`
    );

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
      if (traceCategories.has(category) && !restrictedCategories.has(category)) {
        cautionReasons.push(`May contain ${category}.`);
      }
    }

    if (restrictions.includes('lactose_intolerance') && /\b(fermented|aged)\b/i.test(normalizedContext)) {
      const idx = hardReasons.findIndex((reason) => reason.includes('MILK'));
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

    let status: SafetyStatus = 'SAFE';
    let reasons: string[] = [];
    if (hardReasons.length > 0) {
      status = 'UNSAFE';
      reasons = hardReasons;
    } else if (cautionReasons.length > 0) {
      status = 'CAUTION';
      reasons = cautionReasons;
    }

    const response = withCors(
      request,
      NextResponse.json({
        status,
        isSafe: status === 'SAFE',
        reasons,
        normalized_ingredients: normalizeInput(raw_ingredients),
        normalized_traces: normalizedTrace,
        detected_ingredient_categories: Array.from(ingredientCategories),
        detected_trace_categories: Array.from(traceCategories),
        extracted_macros: parsedMacros,
        executionTimeMs: Date.now() - startedAt
      })
    );
    return addRateLimitHeaders(response, rate.remaining, rate.resetAt);
  } catch (error) {
    console.error('evaluate error', error);
    return withCors(
      request,
      NextResponse.json({ status: 'UNSAFE', isSafe: false, reasons: ['Internal server tracking error.'] }, { status: 500 })
    );
  }
}
