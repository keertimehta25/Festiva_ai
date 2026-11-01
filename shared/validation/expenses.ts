import { z } from 'zod';
import { BUDGET_CATEGORIES } from '../constants';
import { idSchema, money, partialUpdate, requiredText, text } from './fields';

const expenseCore = {
  title: requiredText(120, 'Expense title'),
  category: z.enum(BUDGET_CATEGORIES, 'Choose a category'),
  estimatedAmount: money,
  actualAmount: money,
  vendorId: idSchema.nullable(),
  notes: text(300),
};

export const expenseInputSchema = z
  .object({
    ...expenseCore,
    estimatedAmount: expenseCore.estimatedAmount.default(0),
    actualAmount: expenseCore.actualAmount.default(0),
    vendorId: expenseCore.vendorId.default(null),
    notes: expenseCore.notes.default(''),
  })
  .refine((expense) => expense.estimatedAmount > 0 || expense.actualAmount > 0, {
    path: ['actualAmount'],
    message: 'Enter an estimated or an actual amount',
  });
export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export const expenseUpdateSchema = partialUpdate(expenseCore);
