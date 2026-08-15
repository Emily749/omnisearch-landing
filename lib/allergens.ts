export type AllergenId =
  | "gluten"
  | "wheat_allergy"
  | "peanuts"
  | "nuts"
  | "sesame"
  | "dairy_allergy"
  | "lactose_intolerance"
  | "seafood"
  | "fish"
  | "crustaceans"
  | "molluscs"
  | "eggs"
  | "soy"
  | "mustard"
  | "celery"
  | "lupin"
  | "sulphites";

export type LifestyleId =
  | "vegan"
  | "vegetarian"
  | "low_fodmap"
  | "halal"
  | "kosher"
  | "type2_diabetes";

export type RestrictionId = AllergenId | LifestyleId;

export type TraceId =
  | "gluten"
  | "wheat_allergy"
  | "peanuts"
  | "nuts"
  | "sesame"
  | "dairy_allergy"
  | "seafood"
  | "fish"
  | "crustaceans"
  | "molluscs"
  | "mustard"
  | "celery"
  | "lupin"
  | "sulphites";

export const ALLERGENS: { id: AllergenId; label: string }[] = [
  { id: "gluten", label: "Gluten" },
  { id: "wheat_allergy", label: "Wheat" },
  { id: "peanuts", label: "Peanuts" },
  { id: "nuts", label: "Tree nuts" },
  { id: "sesame", label: "Sesame" },
  { id: "dairy_allergy", label: "Dairy" },
  { id: "lactose_intolerance", label: "Lactose" },
  { id: "seafood", label: "Seafood (all)" },
  { id: "fish", label: "Fish" },
  { id: "crustaceans", label: "Crustaceans" },
  { id: "molluscs", label: "Molluscs" },
  { id: "eggs", label: "Eggs" },
  { id: "soy", label: "Soy" },
  { id: "mustard", label: "Mustard" },
  { id: "celery", label: "Celery" },
  { id: "lupin", label: "Lupin" },
  { id: "sulphites", label: "Sulphites" },
];

export const LIFESTYLE: { id: LifestyleId; label: string }[] = [
  { id: "vegan", label: "Vegan" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "low_fodmap", label: "Low FODMAP" },
  { id: "halal", label: "Halal" },
  { id: "kosher", label: "Kosher" },
  { id: "type2_diabetes", label: "Type 2 diabetes" },
];

export const TRACES: { id: TraceId; label: string }[] = [
  { id: "gluten", label: "Gluten" },
  { id: "wheat_allergy", label: "Wheat" },
  { id: "peanuts", label: "Peanuts" },
  { id: "nuts", label: "Tree nuts" },
  { id: "sesame", label: "Sesame" },
  { id: "dairy_allergy", label: "Dairy" },
  { id: "seafood", label: "Seafood (all)" },
  { id: "fish", label: "Fish" },
  { id: "crustaceans", label: "Crustaceans" },
  { id: "molluscs", label: "Molluscs" },
  { id: "mustard", label: "Mustard" },
  { id: "celery", label: "Celery" },
  { id: "lupin", label: "Lupin" },
  { id: "sulphites", label: "Sulphites" },
];

export type Macros = {
  maxCarbsPer100g?: number;
  minProteinPer100g?: number;
};

export type DietaryProfile = {
  restrictions: RestrictionId[];
  mayContain: TraceId[];
  macros: Macros;
};

export const EMPTY_PROFILE: DietaryProfile = {
  restrictions: [],
  mayContain: [],
  macros: {},
};
