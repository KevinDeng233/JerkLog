import rows from './catalog-v1.json';
import type { Food } from '../../../db/models';
export const foodCatalog = rows as Food[];
export function filterFoods(
  foods: Food[],
  query: string,
  state = '',
  includeArchived = false,
) {
  const term = query.trim().toLocaleLowerCase();
  return foods.filter(
    (food) =>
      (includeArchived || !food.archived) &&
      (!state || food.state === state) &&
      (!term ||
        `${food.name} ${food.brand ?? ''} ${food.source.description ?? ''}`
          .toLocaleLowerCase()
          .includes(term)),
  );
}
