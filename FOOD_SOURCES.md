# Offline food sources / catalog v1

## Source, units and permission

The six rows in `src/features/nutrition/foods/catalog-v1.json` were individually retrieved and checked against the official USDA FoodData Central API on **2026-11-21**. Dataset: **SR Legacy**; each row's FDC publication date: **2019-04-01**. That date is stored as source revision, not presented as a new laboratory measurement. The original English descriptions are retained beside Chinese display names.

USDA declares FoodData Central data public domain under [CC0](https://fdc.nal.usda.gov/api-guide/). See also [dataset documentation](https://fdc.nal.usda.gov/data-documentation/) and [downloads](https://fdc.nal.usda.gov/download-datasets/). The app attribution remains visible. API retrieval was authoring-only: no API key, remote food request or private record upload exists in the shipped app.

Values below are for **100 g edible food in the described state**. Nutrient identifiers: Energy **1008** (kcal), Protein **1003** (g), Carbohydrate by difference **1005** (g), Total lipid (fat) **1004** (g). Values are copied from those nutrient fields, not computed using 4/4/9.

| Food / exact preparation                                                          | FDC ID                                                           | NDB   | kcal | Protein g | Carbs g | Fat g |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----- | ---: | --------: | ------: | ----: |
| White long-grain enriched rice, cooked                                            | [168878](https://fdc.nal.usda.gov/food-details/168878/nutrients) | 20045 |  130 |      2.69 |   28.17 |  0.28 |
| Whole egg, raw, fresh, edible portion                                             | [171287](https://fdc.nal.usda.gov/food-details/171287/nutrients) | 01123 |  143 |     12.56 |    0.72 |  9.51 |
| Whole milk, 3.25% milkfat, added vitamin D                                        | [171265](https://fdc.nal.usda.gov/food-details/171265/nutrients) | 01077 |   61 |      3.15 |    4.80 |  3.25 |
| Chicken breast, skinless, boneless, raw                                           | [171077](https://fdc.nal.usda.gov/food-details/171077/nutrients) | 05062 |  120 |     22.50 |       0 |  2.62 |
| Tofu, raw, firm, prepared with calcium sulfate                                    | [172475](https://fdc.nal.usda.gov/food-details/172475/nutrients) | 16426 |  144 |     17.27 |    2.78 |  8.72 |
| Oats, unprepared dry grain, “Includes foods for USDA's Food Distribution Program” | [169705](https://fdc.nal.usda.gov/food-details/169705/nutrients) | 20038 |  389 |     16.89 |   66.27 |  6.90 |

Milk uses state `unspecified` because the source description does not identify a cooking state. Rice uses `cooked`; egg/chicken/tofu/oats use `raw`, with oats explicitly labeled unprepared grain rather than cooked oatmeal. These are food composition descriptions, not advice to consume raw animal foods. Brand, egg size, cooking-water yield, density and portion weights are not guessed. No default serving conversion is seeded.

Coverage is deliberately small: these exact US food rows do not represent every Chinese rice variety, tofu firmness, milk product, chicken cooking method or packaged oatmeal. Users should create label-based foods for their own products. The source is a composition database, not a guarantee of the exact composition of a person's meal.

## Maintenance and history

Stable IDs are `usda:<fdcId>`. An IndexedDB control marker makes catalog v1 setup idempotent, without overwriting any existing same-ID row or adding diary entries. Built-ins are immutable in the UI; use a custom food for changes. User foods require a name, preparation state and source explanation; unknown nutrients remain null.

Before distributing a new catalog version: independently retrieve each exact official FDC row, verify IDs/descriptions/preparation/nutrient IDs and units, check reuse terms, retain only required fields, update review/publication metadata and source tests, and explicitly version any seed change. Do not mutate old diary snapshots.

## Estimator and meal ideas

The optional Mifflin–St Jeor equations were checked against the [original research abstract](https://pubmed.ncbi.nlm.nih.gov/2305711/). The original study sampled healthy adults aged 19–78; the app's 18–100 input gate does not establish validation at all ages or health circumstances. Sex-specific coefficients are explicit, users may opt out, pregnancy/breastfeeding/unsuitability disables estimation, and no automatic weight-loss prescription exists.

Activity multipliers 1.2, 1.4, 1.6 and 1.8 are explicitly **rough user-selected assumptions**; they are not claimed to come from the original equation or to measure expenditure. Outputs display to the nearest 50 kcal, carry an estimate/non-medical label, and never silently overwrite goals.

Meal cards are deterministic, non-quantified examples, broadly consistent with [WHO healthy-diet principles](https://www.who.int/news-room/fact-sheets/detail/healthy-diet). Their particular combinations are application rules, not WHO-prescribed meals, allergen guarantees or medical advice. They use only explicit Nutrition preferences and known diary values; no Habits or Training data is read.
