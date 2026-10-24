const toSnake = (key: string): string => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const toCamel = (key: string): string => key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

function mapKeys(source: object, convert: (key: string) => string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [convert(key), value]));
}

/** Converts a camelCase record to database column names. Only top-level keys change; JSON values are untouched. */
export function toRow(record: object): Record<string, unknown> {
  return mapKeys(record, toSnake);
}

/** Converts a database row to a camelCase record. `user_id` is internal and never leaves the data layer. */
export function fromRow<T>(row: Record<string, unknown>): T {
  const visible = Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'user_id'));
  return mapKeys(visible, toCamel) as T;
}
