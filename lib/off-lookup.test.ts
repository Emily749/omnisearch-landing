import { describe, it, expect, vi, afterEach } from "vitest";
import { mapTags, getOpenFoodFactsCategories } from "./off-lookup";

describe("mapTags: Open Food Facts allergen tags -> our category vocabulary", () => {
  it("maps known tags to their category", () => {
    expect(mapTags(["en:milk", "en:nuts", "en:soybeans"])).toEqual(
      expect.arrayContaining(["MILK", "TREE_NUTS", "SOY"])
    );
  });

  it("maps all fourteen known EU allergen tags without dropping any silently", () => {
    const allTags = [
      "en:gluten",
      "en:crustaceans",
      "en:eggs",
      "en:fish",
      "en:peanuts",
      "en:soybeans",
      "en:milk",
      "en:nuts",
      "en:celery",
      "en:mustard",
      "en:sesame-seeds",
      "en:sulphur-dioxide-and-sulphites",
      "en:lupin",
      "en:molluscs",
    ];
    expect(mapTags(allTags)).toHaveLength(14);
  });

  it("drops unknown/unrecognized tags rather than crashing", () => {
    expect(mapTags(["en:not-a-real-allergen", "en:milk"])).toEqual(["MILK"]);
  });

  it("handles non-array input gracefully", () => {
    expect(mapTags(null)).toEqual([]);
    expect(mapTags(undefined)).toEqual([]);
    expect(mapTags("en:milk")).toEqual([]);
  });

  it("de-duplicates repeated tags", () => {
    expect(mapTags(["en:milk", "en:milk"])).toEqual(["MILK"]);
  });
});

describe("getOpenFoodFactsCategories: input validation (no network call needed)", () => {
  it("returns empty for a missing barcode", async () => {
    const result = await getOpenFoodFactsCategories(undefined);
    expect(result).toEqual({ ingredientCategories: [], traceCategories: [] });
  });

  it("returns empty for a non-numeric barcode", async () => {
    const result = await getOpenFoodFactsCategories("not-a-barcode");
    expect(result).toEqual({ ingredientCategories: [], traceCategories: [] });
  });

  it("returns empty for a barcode that's the wrong length", async () => {
    const result = await getOpenFoodFactsCategories("123");
    expect(result).toEqual({ ingredientCategories: [], traceCategories: [] });
  });
});

describe("getOpenFoodFactsCategories: a 'may contain' clause embedded in OFF's ingredients text", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("real Cadbury Dairy Milk response: wheat/nuts from 'may contain' land in traces, not ingredients", async () => {
    // Captured live from world.openfoodfacts.org for barcode 07622201461959.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
          allergens_tags: ["en:milk"],
          traces_tags: ["en:gluten", "en:nuts"],
          ingredients_text_en:
            "milk**, sugar, cocoa butter, cocoa mass, vegetable fats (palm, shea), emulsifiers (e442, e476), flavourings, may contain nuts, wheat, milk solids 20 % minimum, actual 23 %, cocoa solids sucres",
        },
      }),
    }) as unknown as typeof fetch;

    const result = await getOpenFoodFactsCategories("07622201461959");

    expect(result.ingredientCategories).toEqual(["MILK"]);
    expect(result.ingredientCategories).not.toContain("GLUTEN");
    expect(result.ingredientCategories).not.toContain("TREE_NUTS");
    expect(result.traceCategories).toEqual(expect.arrayContaining(["GLUTEN", "TREE_NUTS"]));
  });
});
