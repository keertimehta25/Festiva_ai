/**
 * Validation rules shared by the browser forms and the API. The schemas live in `./validation`, one file per
 * topic; this file keeps the public import path (`@shared/schemas`) stable.
 */
export { idSchema, stripControlChars } from './validation/fields';
export * from './validation/events';
export * from './validation/tasks';
export * from './validation/expenses';
export * from './validation/vendors';
export * from './validation/ai';
