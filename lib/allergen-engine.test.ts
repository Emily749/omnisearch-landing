import { describe, it, expect } from "vitest";
import { evaluateProduct, detectAllergenCategories, stripAdvisoryBoilerplate } from "./allergen-engine";

// UK grocery sites print this (or something like it) on essentially every
// product page, regardless of what the product actually contains. Any test
// below that includes it is checking that the boilerplate itself never
// becomes the reason something gets flagged.
const ALLERGY_LEGEND =
  "Allergy Advice: For allergens, including cereals containing gluten, see ingredients in bold.";

function safe(overrides: Parameters<typeof evaluateProduct>[0]) {
  return evaluateProduct(overrides);
}

describe("the reported bug: boilerplate legend text falsely flagging plain products", () => {
  it("McCain 8 Baked Jacket Potatoes is SAFE for a gluten restriction", () => {
    const result = safe({
      name: "McCain 8 Baked Jacket Potatoes 1.6kg",
      rawIngredients: `Potatoes (100%). ${ALLERGY_LEGEND}`,
      restrictions: ["gluten"],
    });
    expect(result.status).toBe("SAFE");
  });

  it("Aunt Bessie's Mini Roast Potatoes is SAFE for a gluten restriction", () => {
    const result = safe({
      name: "Aunt Bessie's Mini Roast Potatoes 700g",
      rawIngredients: `Potatoes, Sunflower Oil, Salt, Dextrose. ${ALLERGY_LEGEND}`,
      restrictions: ["gluten"],
    });
    expect(result.status).toBe("SAFE");
  });

  it("still flags real gluten content even with the legend present", () => {
    const result = safe({
      name: "White Sliced Bread",
      rawIngredients: `Wheat Flour, Water, Yeast, Salt. ${ALLERGY_LEGEND}`,
      restrictions: ["gluten"],
    });
    expect(result.status).toBe("UNSAFE");
  });

  it("stripAdvisoryBoilerplate removes the legend but leaves real content", () => {
    const cleaned = stripAdvisoryBoilerplate(`Potatoes, Salt. ${ALLERGY_LEGEND} Suitable for freezing.`);
    expect(cleaned.toLowerCase()).not.toContain("bold");
    expect(cleaned).toContain("Potatoes, Salt");
    expect(cleaned).toContain("Suitable for freezing");
  });
});

describe("'-free' claims never read as containing the allergen", () => {
  it("'Gluten Free Oats' does not flag GLUTEN", () => {
    const categories = detectAllergenCategories("Gluten Free Oats, Rice Flour, Water");
    expect(categories.has("GLUTEN")).toBe(false);
  });

  it("'Dairy-Free Spread' does not flag MILK", () => {
    const categories = detectAllergenCategories("Dairy-Free Spread, Vegetable Oils, Water");
    expect(categories.has("MILK")).toBe(false);
  });

  it("'Free From: Gluten, Wheat, Milk, Egg' does not flag any of them", () => {
    const categories = detectAllergenCategories("Rice Cakes. Free From: Gluten, Wheat, Milk, Egg.");
    expect(categories.has("GLUTEN")).toBe(false);
    expect(categories.has("WHEAT")).toBe(false);
    expect(categories.has("MILK")).toBe(false);
    expect(categories.has("EGGS")).toBe(false);
  });

  it("a real mention right after an unrelated '-free' claim is still caught", () => {
    // Regression guard: the -free suppression must be scoped to the word it
    // immediately follows, not bleed into unrelated allergens nearby.
    const categories = detectAllergenCategories("Sugar Free Jelly with Milk Chocolate Chips");
    expect(categories.has("MILK")).toBe(true);
  });

  it("trailing punctuation no longer hides a real allergen (the old space-padding bug)", () => {
    const categories = detectAllergenCategories("Contains: Wheat, Milk, Soya.");
    expect(categories.has("WHEAT")).toBe(true);
    expect(categories.has("MILK")).toBe(true);
    expect(categories.has("SOY")).toBe(true);
  });
});

type AllergenCase = {
  restriction: string;
  category: string;
  positiveIngredients: string;
  negativeIngredients: string;
};

const ALLERGEN_CASES: AllergenCase[] = [
  { restriction: "gluten", category: "GLUTEN", positiveIngredients: "Wheat Flour, Barley Malt Extract", negativeIngredients: "Rice, Potatoes, Sunflower Oil" },
  { restriction: "wheat_allergy", category: "WHEAT", positiveIngredients: "Wheat Flour, Water, Salt", negativeIngredients: "Oat Flour, Water, Salt" },
  { restriction: "peanuts", category: "PEANUTS", positiveIngredients: "Peanuts, Sugar, Salt", negativeIngredients: "Almonds, Sugar, Salt" },
  { restriction: "nuts", category: "TREE_NUTS", positiveIngredients: "Whole Almonds, Cashews, Hazelnuts", negativeIngredients: "Sunflower Seeds, Pumpkin Seeds" },
  { restriction: "sesame", category: "SESAME", positiveIngredients: "Sesame Seeds, Tahini", negativeIngredients: "Poppy Seeds, Chia Seeds" },
  { restriction: "dairy_allergy", category: "MILK", positiveIngredients: "Milk, Cheese, Butter", negativeIngredients: "Rice, Vegetable Oil, Salt" },
  { restriction: "fish", category: "FISH", positiveIngredients: "Cod, Haddock, Batter", negativeIngredients: "Chicken Breast, Breadcrumbs" },
  { restriction: "crustaceans", category: "CRUSTACEANS", positiveIngredients: "Prawns, Rice, Mayonnaise", negativeIngredients: "Chicken, Rice, Mayonnaise" },
  { restriction: "molluscs", category: "MOLLUSCS", positiveIngredients: "Mussels, White Wine, Cream", negativeIngredients: "Chicken, White Wine, Cream" },
  { restriction: "eggs", category: "EGGS", positiveIngredients: "Egg, Flour, Sugar, Albumen", negativeIngredients: "Flour, Sugar, Aquafaba" },
  { restriction: "soy", category: "SOY", positiveIngredients: "Soya Beans, Water, Salt (Tofu)", negativeIngredients: "Chickpeas, Water, Salt" },
  { restriction: "mustard", category: "MUSTARD", positiveIngredients: "Mustard Seeds, Vinegar, Sugar", negativeIngredients: "Turmeric, Vinegar, Sugar" },
  { restriction: "celery", category: "CELERY", positiveIngredients: "Celery, Carrot, Onion, Stock", negativeIngredients: "Carrot, Onion, Stock" },
  { restriction: "lupin", category: "LUPIN", positiveIngredients: "Lupin Flour, Water, Salt", negativeIngredients: "Chickpea Flour, Water, Salt" },
  { restriction: "sulphites", category: "SULPHITES", positiveIngredients: "Dried Apricots, Sulphur Dioxide", negativeIngredients: "Dried Apricots, Ascorbic Acid" },
];

describe("each core allergen: flags when present, silent when absent", () => {
  for (const { restriction, positiveIngredients, negativeIngredients } of ALLERGEN_CASES) {
    it(`${restriction}: flags UNSAFE when the ingredient is present`, () => {
      const result = safe({
        rawIngredients: `${positiveIngredients}. ${ALLERGY_LEGEND}`,
        restrictions: [restriction],
      });
      expect(result.status).toBe("UNSAFE");
    });

    it(`${restriction}: stays SAFE for an unrelated product`, () => {
      const result = safe({
        rawIngredients: `${negativeIngredients}. ${ALLERGY_LEGEND}`,
        restrictions: [restriction],
      });
      expect(result.status).toBe("SAFE");
    });

    it(`${restriction}: not selected at all never blocks the product`, () => {
      const result = safe({
        rawIngredients: `${positiveIngredients}.`,
        restrictions: [],
      });
      expect(result.status).toBe("SAFE");
    });
  }
});

describe("seafood umbrella restriction covers its sub-categories", () => {
  it("flags fish", () => {
    expect(safe({ rawIngredients: "Cod Fillet, Batter", restrictions: ["seafood"] }).status).toBe("UNSAFE");
  });
  it("flags crustaceans", () => {
    expect(safe({ rawIngredients: "King Prawns, Garlic Butter", restrictions: ["seafood"] }).status).toBe("UNSAFE");
  });
  it("flags molluscs", () => {
    expect(safe({ rawIngredients: "Mussels, White Wine", restrictions: ["seafood"] }).status).toBe("UNSAFE");
  });
  it("leaves unrelated meat alone", () => {
    expect(safe({ rawIngredients: "Chicken Breast, Breadcrumbs", restrictions: ["seafood"] }).status).toBe("SAFE");
  });
});

describe("'may contain' traces are a caution, never a hard block", () => {
  it("flags CAUTION when the trace category is selected", () => {
    const result = safe({
      rawIngredients: "Potatoes, Sunflower Oil, Salt",
      manufacturingTraces: "May contain traces of nuts and sesame.",
      mayContainRestrictions: ["nuts"],
    });
    expect(result.status).toBe("CAUTION");
  });

  it("a trace the user didn't ask to be cautious about is ignored", () => {
    const result = safe({
      rawIngredients: "Potatoes, Sunflower Oil, Salt",
      manufacturingTraces: "May contain traces of celery.",
      mayContainRestrictions: ["nuts"],
    });
    expect(result.status).toBe("SAFE");
  });

  it("a genuine hard restriction always outranks a mere trace caution elsewhere", () => {
    const result = safe({
      rawIngredients: "Peanuts, Sugar",
      manufacturingTraces: "May contain traces of celery.",
      restrictions: ["peanuts"],
      mayContainRestrictions: ["celery"],
    });
    expect(result.status).toBe("UNSAFE");
  });
});

describe("lifestyle diets", () => {
  it("vegan: flags gelatin-based sweets", () => {
    expect(safe({ rawIngredients: "Sugar, Glucose Syrup, Gelatin, Flavouring", restrictions: ["vegan"] }).status).toBe("UNSAFE");
  });
  it("vegan: flags honey", () => {
    expect(safe({ rawIngredients: "Oats, Honey, Salt", restrictions: ["vegan"] }).status).toBe("UNSAFE");
  });
  it("vegan: flags dairy via the MILK category", () => {
    expect(safe({ rawIngredients: "Milk Chocolate, Sugar, Cocoa Butter", restrictions: ["vegan"] }).status).toBe("UNSAFE");
  });
  it("vegan: a certified vegan label overrides an otherwise ambiguous read", () => {
    const result = safe({ rawIngredients: "Pea Protein, Water, Flavouring. Suitable for vegans.", restrictions: ["vegan"] });
    expect(result.status).toBe("SAFE");
  });
  it("vegan: plain plant ingredients are safe", () => {
    expect(safe({ rawIngredients: "Potatoes, Sunflower Oil, Salt", restrictions: ["vegan"] }).status).toBe("SAFE");
  });

  it("vegetarian: flags meat", () => {
    expect(safe({ rawIngredients: "Chicken Breast, Breadcrumbs, Salt", restrictions: ["vegetarian"] }).status).toBe("UNSAFE");
  });
  it("vegetarian: dairy and eggs are fine", () => {
    expect(safe({ rawIngredients: "Milk, Eggs, Flour, Sugar", restrictions: ["vegetarian"] }).status).toBe("SAFE");
  });

  it("halal: flags pork", () => {
    expect(safe({ rawIngredients: "Pork, Salt, Spices", restrictions: ["halal"] }).status).toBe("UNSAFE");
  });
  it("halal: flags alcohol", () => {
    expect(safe({ rawIngredients: "Beef, Red Wine, Onions", restrictions: ["halal"] }).status).toBe("UNSAFE");
  });
  it("halal: plain chicken is fine", () => {
    expect(safe({ rawIngredients: "Chicken Breast, Herbs, Salt", restrictions: ["halal"] }).status).toBe("SAFE");
  });

  it("kosher: flags shellfish", () => {
    expect(safe({ rawIngredients: "Prawns, Garlic, Butter", restrictions: ["kosher"] }).status).toBe("UNSAFE");
  });
  it("kosher: a kosher certification overrides an ambiguous read", () => {
    const result = safe({ rawIngredients: "Beef, Onions, Spices. Kosher certified.", restrictions: ["kosher"] });
    expect(result.status).toBe("SAFE");
  });

  it("low_fodmap: flags garlic and onion", () => {
    expect(safe({ rawIngredients: "Tomato, Garlic, Onion, Basil", restrictions: ["low_fodmap"] }).status).toBe("UNSAFE");
  });
  it("low_fodmap: a low-FODMAP certified label overrides it", () => {
    const result = safe({ rawIngredients: "Tomato, Garlic Infused Oil, Basil. Low FODMAP certified.", restrictions: ["low_fodmap"] });
    expect(result.status).toBe("SAFE");
  });

  it("type2_diabetes: flags a high-sugar chocolate bar", () => {
    expect(safe({ rawIngredients: "High Sugar Milk Chocolate, Cocoa Butter", restrictions: ["type2_diabetes"] }).status).toBe("UNSAFE");
  });
  it("type2_diabetes: a sugar-free label is not flagged for sugar content", () => {
    const result = safe({ rawIngredients: "Sugar-Free Chocolate, Sweetener, Cocoa Butter", restrictions: ["type2_diabetes"] });
    expect(result.status).toBe("SAFE");
  });
});

describe("macro thresholds", () => {
  it("flags a product over the max carbs limit", () => {
    const result = safe({
      rawIngredients: "Rice",
      nutritionText: "Carbohydrates 28g per 100g, Protein 2.7g per 100g",
      macros: { maxCarbsPer100g: 15 },
    });
    expect(result.status).toBe("UNSAFE");
  });

  it("flags a product under the min protein floor", () => {
    const result = safe({
      rawIngredients: "Apple",
      nutritionText: "Carbohydrates 11g per 100g, Protein 0.3g per 100g",
      macros: { minProteinPer100g: 5 },
    });
    expect(result.status).toBe("UNSAFE");
  });

  it("a product within both thresholds is safe", () => {
    const result = safe({
      rawIngredients: "Greek Yogurt",
      nutritionText: "Carbohydrates 4g per 100g, Protein 10g per 100g",
      macros: { maxCarbsPer100g: 15, minProteinPer100g: 5 },
    });
    expect(result.status).toBe("SAFE");
  });
});

describe("combined restrictions", () => {
  it("a product must clear every selected restriction, not just one", () => {
    const result = safe({
      rawIngredients: "Wheat Flour, Milk, Sugar",
      restrictions: ["gluten", "dairy_allergy", "peanuts"],
    });
    expect(result.status).toBe("UNSAFE");
    expect(result.reasons.some((r) => r.includes("GLUTEN"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("MILK"))).toBe(true);
  });

  it("passes cleanly when none of several restrictions apply", () => {
    const result = safe({
      rawIngredients: "Potatoes, Sunflower Oil, Salt",
      restrictions: ["gluten", "dairy_allergy", "peanuts", "soy"],
    });
    expect(result.status).toBe("SAFE");
  });
});

describe("empty or missing input never crashes and defaults safe", () => {
  it("no ingredients text at all", () => {
    const result = safe({ restrictions: ["gluten"] });
    expect(result.status).toBe("SAFE");
  });
});
