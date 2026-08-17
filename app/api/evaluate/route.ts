import { NextResponse } from 'next/server';
import {
  ALLOWED_RESTRICTIONS,
  ALLOWED_MAY_CONTAIN,
  evaluateProduct,
  type MacroThresholds,
} from '@/lib/allergen-engine';

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

const ALLOWED_MACRO_FIELDS: (keyof MacroThresholds)[] = [
  'maxCarbsPer100g',
  'minCarbsPer100g',
  'maxProteinPer100g',
  'minProteinPer100g',
  'maxFatPer100g',
  'minFatPer100g'
];

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

    if (!`${name} ${raw_ingredients}`.trim()) {
      const response = withCors(
        request,
        NextResponse.json({ status: 'UNSAFE', isSafe: false, reasons: ['No text context provided.'] }, { status: 400 })
      );
      return addRateLimitHeaders(response, rate.remaining, rate.resetAt);
    }

    const result = evaluateProduct({
      name,
      rawIngredients: raw_ingredients,
      manufacturingTraces: manufacturing_traces,
      nutritionText: nutrition_text,
      restrictions,
      mayContainRestrictions,
      macros
    });

    const response = withCors(
      request,
      NextResponse.json({
        status: result.status,
        isSafe: result.isSafe,
        reasons: result.reasons,
        normalized_ingredients: result.normalizedIngredients,
        normalized_traces: result.normalizedTraces,
        detected_ingredient_categories: result.detectedIngredientCategories,
        detected_trace_categories: result.detectedTraceCategories,
        extracted_macros: result.extractedMacros,
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
