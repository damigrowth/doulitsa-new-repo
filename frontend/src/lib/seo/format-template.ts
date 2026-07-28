import { getEntityValues } from './get-entity-values';

export function formatTemplate(template: string, entity: any): string {
  return template.replace(/%([^%]+)%/g, (match, property) => {
    const value = getEntityValues(entity, property);
    return value;
  });
}
