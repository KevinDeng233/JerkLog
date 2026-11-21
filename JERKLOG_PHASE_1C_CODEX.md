# JerkLog — Phase 1C: Nutrition Lab (Codex Development Task)

> **Product:** JerkLog · Habits · Training · Nutrition  
> **Version target:** v0.1 / Phase 1C  
> **Style:** 外表抽象，内核严谨（humorous copy, rigorous calculations）  
> **Deliverable:** One reviewable Draft PR; **do not merge or release**.

## 0. Mission & preflight checks

Build a **usable, privacy-first, offline-capable nutrition tracking system** in the existing JerkLog React + TypeScript + Vite PWA. Preserve all working Habits and Training features. **This is Phase 1C only.**

Before editing code:

1. Inspect the current repository, working tree, branches and latest `main`; read `README.md`, `JERKLOG_CODEX_PLAN.md`, prior phase documentation, existing Dexie schema and tests.
2. Confirm that Phase 1B (Training) is actually merged into `main`. **Do not assume this from the chat history or a local branch name.** If not merged, stop and report which prerequisite is missing. Avoid developing on stale or divergent code.
3. Create `feat/nutrition-lab-phase-1c` from the up-to-date `main`. Do not overwrite pre-existing work. Explain conflicts between the master plan and actual source tree before changing anything.
4. Briefly report the implementation order, chosen schema migration version, and any risks; then implement without waiting for extra approvals for ordinary development.
5. Never commit personal sample logs, private credentials, food API keys, environment files, or browser profile data.

## 1. Scope — must ship in Phase 1C

### A. Food Library: offline food catalog & user foods

- Search/filter foods by name, with localized UI labels where feasible.
- Each food entry records: stable `id`, `name`, optional brand, per-100g `kcal`, `proteinG`, `carbsG`, `fatG`, source/provenance, food preparation state (`raw`, `cooked`, `unspecified`), optional default serving size in grams, `createdAt`, `updatedAt`, and whether it is built-in or user-created.
- Support **create, read, edit, archive/delete** for user-created foods, with validation and confirmation for destructive actions. Built-in food provenance must remain visible; do not silently mutate the upstream figures.
- Seed a **small, accurately sourced offline catalog** of familiar foods (e.g., rice, eggs, milk, chicken, tofu, oats) only if Codex can independently verify the values and re-use permission from reliable sources. Store the **source URL / dataset ID / revision date** alongside seeded items. If reliable sourcing is unavailable, ship the custom-food flow and clearly report the incomplete seed catalog rather than inventing nutritional numbers.
- Distinguish raw vs. cooked foods, e.g. dry oats versus cooked oatmeal; never apply implicit raw→cooked conversions.
- Add seed versioning and idempotent setup (reloading must not duplicate items). Keep seed assets small; no runtime API key or external image is required.
- Prefer USDA FoodData Central public-domain data (link in §8) for data that can be appropriately mapped. Do not import enormous datasets into the client.

### B. Food Diary: meal intake entry and history

- Add food to **breakfast, lunch, dinner, snack** with an explicitly entered amount in grams. Optional serving selection is allowed **only if a serving-to-gram conversion is explicitly defined**.
- The main Nutrition page must display today's entries with food name, preparation state, quantity, kcal and macros, meal category, and a prominent **Add Food** action.
- Support creating, editing quantity / date / meal type, deleting, browsing prior days, and optionally repeating a prior entry.
- Each diary entry stores a **nutrition snapshot** of the food and quantities used at logging time. Editing or deleting a food in the library must **not rewrite historical entries**.
- Store an explicit local calendar date (`YYYY-MM-DD`) for the diary day and an absolute creation timestamp (`ISO 8601` UTC); handle timezone/date changes deliberately rather than slicing UTC timestamps to get a local date.
- Prevent accidental duplicate writes from rapid taps/submits; handle failures without silent data loss.

### C. Calculation engine: kcal and three macronutrients

- With per-100g nutrition and consumed grams:

  `consumedNutrient = (grams / 100) * nutrientPer100g`

- Calculate **each entry → each meal → each day** from persisted diary entries. Do **not** make UI counters the source of truth.
- Calculate daily calories (`kcal`), protein (`g`), carbohydrates (`g`) and fat (`g`); show consumed amounts relative to user-selected targets.
- Prefer a trustworthy database/label `kcal` value; **never override it** by automatically recomputing kcal from `protein * 4 + carbs * 4 + fat * 9`. Label rounding and specific ingredients can create legitimate differences.
- Missing values are **unknown/null, not zero**. If part of a total is unknown, clearly label the total as partial or estimated; avoid presenting a misleading precise figure.
- Validate `grams > 0`, finite numbers, realistic bounds, nonnegative nutrient values and required names. Avoid `NaN`, `Infinity`, overflows, negative totals, and excessive fractional digits. Round at presentation boundaries; do not cumulatively round each item before summing.
- Define explicit units for `kcal`, `g` and date/time fields. Prefer pure calculation functions with deterministic unit tests.

### D. Nutrition Goals & optional adult energy estimator

- Provide a **manual mode first**: users can set their own daily targets for kcal, protein, carbs and fat (each optional); store locally; allow editing/resetting and leaving targets unset.
- Implement a **clearly optional adult-only energy-needs estimator** without requiring any profile details for basic tracking. For adults 18+, it may use the Mifflin–St Jeor equation for estimated resting energy expenditure (REE):
  - Male equation: `10 × weightKg + 6.25 × heightCm − 5 × ageYears + 5`
  - Female equation: `10 × weightKg + 6.25 × heightCm − 5 × ageYears − 161`

  Explain that these equations have sex-specific coefficients; allow opting out entirely and entering a manual goal instead. If users do not want to provide the parameters required by the equation, do not guess them.

- For an activity-based _maintenance_ estimate, document whichever activity multipliers are used as **rough assumptions**, not measured TDEE; make the chosen multiplier visible. Do not silently change a saved daily goal based on a recommendation.
- No auto-generated weight-loss prescriptions for under-18 users, pregnant/breastfeeding users, or users who say the calculator is unsuitable for their health circumstances. In these cases, leave the calculator unavailable with an explanation and allow ordinary food logging/manual targets without aggressive nudges.
- Keep estimation code isolated and tested; clearly label outputs **“估算值 / estimate”** and **“不构成医疗建议”**. Avoid pretending that a result to the single kcal is physiologically accurate.
- If adding the estimator would compromise tested core logging, deliver the manual goal system first and mark the estimator incomplete in the PR; never represent unfinished work as shipped.

### E. Meal recommendation cards: explainable and non-medical

- Recommend simple meal ideas based on the user's **explicit** goal (balanced eating / muscle-gain support), dietary preferences, allergies/restrictions and **known** diary nutrition data.
- Use small, deterministic, explainable rules and a few **non-quantified** example meal combinations. Provide alternatives for restrictions; do not assert that a meal meets a precise macro target unless the ingredient weights and verified nutrition data support the arithmetic.
- Show why a suggestion was made (e.g., “今天记录的蛋白质低于你设置的目标；可考虑豆腐、鸡蛋等”). Do not imply a deficiency diagnosis from one day of incomplete logs.
- Suggestions should be optional, not shaming, punitive, or strongly restrictive. Allow the user to dismiss or ignore them.
- No AI-generated medical advice, diagnosis, extreme diets, supplement pushing, or medical claims.
- **Absolutely never** use Habits/masturbation frequency as input to dietary targets, nutrient loss, recovery, performance, or diet recommendations.

## 2. Data design & safe migration

Adapt actual names to the repository's existing conventions; avoid duplicate tables if equivalent entities already exist. Suggested models:

```ts
type NutrientValue = number | null;

type NutritionPer100g = {
  kcal: NutrientValue;
  proteinG: NutrientValue;
  carbsG: NutrientValue;
  fatG: NutrientValue;
};

type Food = {
  id: string;
  name: string;
  brand?: string;
  state: 'raw' | 'cooked' | 'unspecified';
  per100g: NutritionPer100g;
  source: {
    kind: 'usda' | 'label' | 'user';
    reference?: string;
    revision?: string;
  };
  servingGrams?: number;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
};

type MealEntry = {
  id: string;
  foodId?: string;
  localDate: string; // YYYY-MM-DD on user's chosen diary day
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  grams: number;
  nutritionSnapshot: {
    foodName: string;
    state: Food['state'];
    per100g: NutritionPer100g;
    source: Food['source'];
  };
  createdAt: string;
  updatedAt: string;
};

type NutritionGoals = {
  id: string;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  updatedAt: string;
};
```

**Migration safeguards:**

1. Use a forward-only, incremental Dexie schema version upgrade from the **actual current version**, not a hard-coded assumption. Preserve Habits/Training/settings and all existing Nutrition data if any.
2. Add indexes appropriate for `localDate`, `mealType`, food ID and records' stable IDs; avoid schema changes that remove older stores unexpectedly. Verify migration on an existing database fixture, including nonempty Habits + Training entries.
3. Prefer a transaction for logically atomic multi-table updates; report errors to the user. Deleting a food must not delete logged history.
4. Avoid online storage, background sync, accounts, telemetry, user-data query strings, or uploads of personal records.
5. Follow existing export/import strategy if present; update version/schema only if warranted, keeping old backups compatible where feasible. Do not rebuild the entire backup feature within this phase.

## 3. UI requirements

- Navigation: preserve `Dashboard / Habits / Training / Nutrition / Settings` and existing responsive shell.
- Nutrition page includes subviews: `Overview`, `Food Diary`, `Food Library`, `Goals` (tabs or routes consistent with repo).
- Show kcal + three macros, goal progress when a target exists, meal-grouped entries, selected day, and relevant meal suggestion cards.
- Add accessible food search/create dialog, quantity input and units, date picker, edit/delete actions, and empty/loading/error states.
- Preserve dark/light themes and humorous/serious copy toggle. Only copy changes between modes; calculations and health statements remain identical.
- Keyboard access, explicit labels, high-contrast indicators, responsive mobile input, and readable screen-reader summaries for progress charts.
- Clearly show what is **measured from a label**, **database-derived**, **user-entered**, or **estimated**.
- No hardcoded pretend user consumption or fake nutrition success statuses in production.

## 4. Not in Phase 1C

- Food photo recognition, barcode scanners, online food searches requiring a backend/API key, AI chat-based coaching, cloud sync, social feeds, gamified punishment.
- Automatic linking of intimacy habits with energy intake or recovery.
- Complex periodized meal plans, medical advice, clinically tailored diets, supplement protocols.
- Reworking completed Training/Habits business logic, major unrelated package upgrades, a wholesale design rewrite.

## 5. Verification: automated tests

At minimum, add tests covering:

**Nutrition calculation**

- `120 kcal / 100g × 150g = 180 kcal`.
- Food at `10g protein, 20g carbs, 5g fat per 100g`, 150g portion → `15g protein, 30g carbs, 7.5g fat`.
- Multiple entries across meals aggregate by selected local date, not UTC date.
- Editing `grams` changes totals; deleting one entry reduces totals; unchanged food library edits don't change past diary snapshots.
- Missing macro is unknown/partial instead of magically zero.
- Negative/zero grams, invalid inputs, large values, accidental double-submission are rejected or safely handled.
- kcal on a label is retained even when kcal != `4*P + 4*C + 9*F`.

**Persistence, sources & migration**

- Custom food CRUD; seed idempotence; search; raw/cooked distinction; optional servings with known gram weight.
- Food deletion does not erase diary history.
- Persistence across reload (test the actual persistence layer and separately note any untested manual browser persistence).
- Previous Dexie version with nonempty Habits + Training data migrates without loss or resetting settings.
- Daily goals saved/edited/unset; no goal = no invented percentage or deficit warning.
- Adult estimator with known fixed examples, boundaries, invalid/missing parameters and under-18 exclusion if included.
- No Habits data is referenced by Nutrition recommendation/calculation code.

**User journeys (manual/E2E if possible)**

1. Add a self-created food: 120 kcal per 100g; log 150g at lunch; verify 180 kcal.
2. Add a second food to dinner; confirm daily totals and meal grouping.
3. Edit lunch amount to 100g, change date and then delete it; verify both days' totals.
4. Change the food catalog entry: previously logged meal retains its original nutrition snapshot.
5. Set a calorie goal; verify progress and that no goal is interpreted as an absence of target (not zero calories).
6. Refresh and open offline after assets have cached: confirm stored diary and Training/Habits remain available where PWA has been configured.
7. Check nutrition on narrow mobile layout; verify forms and accessibility without disabling antivirus protections.

Run and **truthfully** report:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Run available Playwright smoke tests if the environment permits. If Kaspersky blocks an injected browser-test script, **do not disable protection**. Report this and use unaffected checks; explicitly label actual Safari/physical-device/offline cases as untested unless genuinely verified.

## 6. Release blockers & privacy

- No silently lost or duplicated records, no migrations that reset existing user data, and no fabricated food composition data.
- All personal data stays in local IndexedDB; no unapproved external SDKs, tracking, upload, or user-data logging.
- No indication that browser local storage is encrypted by default; do not claim it is a secure encrypted vault.
- No guaranteed health outcomes, no eating-disorder-promoting or coercive calorie recommendations.
- Food nutrition figures have source and state; ambiguous or partial data is represented transparently.
- Do not reuse a production user's nutrition or Habits records as test fixtures.

## 7. Delivery and Git protocol

1. Use a feature branch from updated `main`: `feat/nutrition-lab-phase-1c`.
2. Keep changes scoped to Nutrition and required safe database extensions. Commit manageable units; add test fixtures containing only synthetic data.
3. Open a **Draft PR** targeting `main` if repository/permissions permit. If not, report the branch/commit and exact blocker.
4. **Do not merge, deploy, publish a release, or begin Phase 2 without explicit user authorization.**
5. Report:
   - Features implemented, major files changed and decisions made;
   - Schema version and migration test evidence;
   - Nutritional data sources/licenses and coverage;
   - Real commands/tests run with pass/fail/blocked counts;
   - Remaining gaps (especially mobile/Safari/PWA or adult estimator if deferred);
   - Draft PR link or explanation for not creating it.

**Stop at the end of Phase 1C and await user review.**

## 8. Reference sources (for implementation and provenance checks)

- USDA FoodData Central, official dataset and public-domain notice: https://fdc.nal.usda.gov/
- USDA FoodData Central downloadable datasets: https://fdc.nal.usda.gov/download-datasets/
- USDA FoodData Central food data documentation: https://fdc.nal.usda.gov/data-documentation/
- Original Mifflin–St Jeor REE research (PubMed): https://pubmed.ncbi.nlm.nih.gov/2305711/
- US NIDDK Body Weight Planner, energy balance context: https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner/
- WHO Healthy Diet fact sheet: https://www.who.int/news-room/fact-sheets/detail/healthy-diet
- FDA food labeling regulations (food calories/rounding context): https://www.law.cornell.edu/cfr/text/21/101.9

Use these references as starting points; validate the exact food rows you distribute and document their identifiers and units. Avoid unsupported medical conclusions.
