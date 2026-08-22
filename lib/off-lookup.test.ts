import { describe, it, expect } from "vitest";
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
