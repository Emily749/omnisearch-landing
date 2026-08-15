import { ALLERGENS, LIFESTYLE, TRACES, type DietaryProfile } from "@/lib/allergens";

function CheckboxGrid({
  name,
  options,
  selected,
}: {
  name: string;
  options: { id: string; label: string }[];
  selected: string[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-ink px-3 py-2.5 text-sm text-text transition has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
        >
          <input
            type="checkbox"
            name={name}
            value={option.id}
            defaultChecked={selected.includes(option.id)}
            className="h-4 w-4 accent-[var(--brand)]"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

export function ProfileForm({
  action,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial: DietaryProfile;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-10">
      <section>
        <h2 className="text-base font-semibold text-text">Allergens &amp; intolerances</h2>
        <p className="mt-1 text-sm text-text-muted">
          Flag anything containing these as unsafe, every time.
        </p>
        <div className="mt-4">
          <CheckboxGrid name="restrictions" options={ALLERGENS} selected={initial.restrictions} />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-text">Lifestyle &amp; diet</h2>
        <p className="mt-1 text-sm text-text-muted">
          Optional dietary or faith-based requirements.
        </p>
        <div className="mt-4">
          <CheckboxGrid name="restrictions" options={LIFESTYLE} selected={initial.restrictions} />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-text">&ldquo;May contain&rdquo; traces</h2>
        <p className="mt-1 text-sm text-text-muted">
          Show a caution flag (not a hard block) when a product only warns of possible
          cross-contamination.
        </p>
        <div className="mt-4">
          <CheckboxGrid name="mayContain" options={TRACES} selected={initial.mayContain} />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-text">Macro thresholds</h2>
        <p className="mt-1 text-sm text-text-muted">Optional — leave blank to skip.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-text-muted">Max carbs per 100g</span>
            <input
              type="number"
              step="0.1"
              min="0"
              name="maxCarbsPer100g"
              defaultValue={initial.macros.maxCarbsPer100g ?? ""}
              className="mt-1.5 block w-full rounded-lg border border-border bg-ink px-3.5 py-2.5 text-sm text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-text-muted">Min protein per 100g</span>
            <input
              type="number"
              step="0.1"
              min="0"
              name="minProteinPer100g"
              defaultValue={initial.macros.minProteinPer100g ?? ""}
              className="mt-1.5 block w-full rounded-lg border border-border bg-ink px-3.5 py-2.5 text-sm text-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
        </div>
      </section>

      <button
        type="submit"
        className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-ink transition hover:bg-brand-strong hover:text-white sm:w-auto sm:px-8"
      >
        {submitLabel}
      </button>
    </form>
  );
}
