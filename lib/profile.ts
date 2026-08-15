import {
  ALLERGENS,
  LIFESTYLE,
  TRACES,
  type DietaryProfile,
  type RestrictionId,
  type TraceId,
} from "@/lib/allergens";

const KNOWN_RESTRICTIONS = new Set<string>([
  ...ALLERGENS.map((a) => a.id),
  ...LIFESTYLE.map((l) => l.id),
]);
const KNOWN_TRACES = new Set<string>(TRACES.map((t) => t.id));

export function profileFromFormData(formData: FormData): DietaryProfile {
  const restrictions = formData
    .getAll("restrictions")
    .map(String)
    .filter((id) => KNOWN_RESTRICTIONS.has(id)) as RestrictionId[];

  const mayContain = formData
    .getAll("mayContain")
    .map(String)
    .filter((id) => KNOWN_TRACES.has(id)) as TraceId[];

  const maxCarbsRaw = formData.get("maxCarbsPer100g");
  const minProteinRaw = formData.get("minProteinPer100g");

  const maxCarbs = maxCarbsRaw ? Number.parseFloat(String(maxCarbsRaw)) : undefined;
  const minProtein = minProteinRaw ? Number.parseFloat(String(minProteinRaw)) : undefined;

  return {
    restrictions,
    mayContain,
    macros: {
      ...(Number.isFinite(maxCarbs) ? { maxCarbsPer100g: maxCarbs } : {}),
      ...(Number.isFinite(minProtein) ? { minProteinPer100g: minProtein } : {}),
    },
  };
}

type ProfileRow = {
  restrictions: string[] | null;
  may_contain: string[] | null;
  macros: Record<string, number> | null;
};

export function profileFromRow(row: ProfileRow | null): DietaryProfile {
  if (!row) return { restrictions: [], mayContain: [], macros: {} };
  return {
    restrictions: (row.restrictions || []) as RestrictionId[],
    mayContain: (row.may_contain || []) as TraceId[],
    macros: row.macros || {},
  };
}
