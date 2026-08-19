import { createClient } from "@supabase/supabase-js";
import { ALLERGEN_KNOWLEDGE_GRAPH } from "./allergen-engine";

// Optional second pass over the same scraped text, using a free-tier LLM
// to catch phrasing the keyword matcher misses (synonyms, odd wording,
// scraping noise). Fully optional and fails soft: if GEMINI_API_KEY isn't
// set, or the call errors, times out, or returns something we can't trust,
// this returns empty arrays and evaluateProduct() falls back to exactly
// what it does today. It never removes a category the deterministic
// matcher already found — see the caller in app/api/evaluate/route.ts.
//
// Every result is cached in Supabase, keyed by a hash of the input text —
// content-addressed, not tied to any particular retailer or user — so the
// AI is called at most once ever per distinct product text, no matter how
// many people (or page loads) check it afterwards. That's what keeps this
// inside a free tier's rate limits in practice.

const KNOWN_CATEGORIES = new Set(Object.keys(ALLERGEN_KNOWLEDGE_GRAPH));
const GEMINI_TIMEOUT_MS = 6000;

export interface AiCategories {
  ingredientCategories: string[];
  traceCategories: string[];
}

const EMPTY: AiCategories = { ingredientCategories: [], traceCategories: [] };

function supabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function hashText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sanitizeCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.filter((item): item is string => typeof item === "string" && KNOWN_CATEGORIES.has(item)))
  );
}

async function callGemini(name: string, ingredients: string, traces: string): Promise<AiCategories | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const categoryList = Array.from(KNOWN_CATEGORIES).join(", ");

  const prompt = `You are extracting allergen category information from grocery product text for a safety-critical allergy-checking tool. Be conservative: if it's genuinely ambiguous whether an allergen is present, include it rather than omit it.

Valid categories — use ONLY these exact strings: ${categoryList}

Product name: ${name || "(none given)"}
Ingredients text (may contain scraping noise — ignore navigation, marketing copy, donation blurbs, or unrelated boilerplate; focus only on what's actually in this product): ${ingredients || "(none given)"}
Allergy/traces text: ${traces || "(none given)"}

Return ONLY JSON, no other text, in exactly this shape:
{"ingredientCategories": ["..."], "traceCategories": ["..."]}

ingredientCategories = categories actually present as ingredients in this specific product.
traceCategories = categories mentioned only as possible cross-contamination ("may contain") traces, not as actual ingredients.
If nothing applies, return empty arrays for the relevant field.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return null;

    const parsed = JSON.parse(text);
    return {
      ingredientCategories: sanitizeCategories(parsed.ingredientCategories),
      traceCategories: sanitizeCategories(parsed.traceCategories),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAiCategories(name: string, ingredients: string, traces: string): Promise<AiCategories> {
  if (!process.env.GEMINI_API_KEY) return EMPTY;
  if (!ingredients.trim() && !traces.trim()) return EMPTY;

  const supabase = supabaseClient();
  const cacheKey = await hashText(`${name.trim().toLowerCase()}|${ingredients.trim().toLowerCase()}|${traces.trim().toLowerCase()}`);

  if (supabase) {
    try {
      const { data } = await supabase
        .from("product_ai_cache")
        .select("ingredient_categories, trace_categories")
        .eq("cache_key", cacheKey)
        .maybeSingle();

      if (data) {
        return {
          ingredientCategories: sanitizeCategories(data.ingredient_categories),
          traceCategories: sanitizeCategories(data.trace_categories),
        };
      }
    } catch {
      // Cache read failures fall through to a live call — never block on this.
    }
  }

  const result = await callGemini(name, ingredients, traces);
  if (!result) return EMPTY;

  if (supabase) {
    try {
      await supabase.from("product_ai_cache").upsert({
        cache_key: cacheKey,
        ingredient_categories: result.ingredientCategories,
        trace_categories: result.traceCategories,
      });
    } catch {
      // Best-effort — a failed cache write shouldn't affect this response.
    }
  }

  return result;
}
