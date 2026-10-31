import { useState } from 'react';
import type { z } from 'zod';
import { fieldErrorsFromApi, fieldErrorsFromZod, type FieldErrors } from '../lib/formErrors';

interface FormDialogOptions<Form extends Record<string, string>, Parsed> {
  /** Starting values. Every field is kept as text, exactly as typed. */
  initial: Form;
  /** Rules the finished form must satisfy (the same schema the server applies). */
  schema: z.ZodType<Parsed>;
  /** Turns the typed text into the shape the schema expects (numbers, nulls for blanks). */
  toInput: (form: Form) => unknown;
  /** Saves the validated data. Usually a workspace mutation's `mutateAsync`. */
  save: (data: Parsed) => Promise<unknown>;
  onDone: () => void;
}

/**
 * State and submit logic shared by the add/edit dialogs: typed text, validation errors per field,
 * a server failure, and the validate → save → close sequence.
 */
export function useFormDialog<Form extends Record<string, string>, Parsed>(options: FormDialogOptions<Form, Parsed>) {
  const { initial, schema, toInput, save, onDone } = options;
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<unknown>(null);

  const set = (key: keyof Form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function submit(): Promise<void> {
    setFailure(null);
    const parsed = schema.safeParse(toInput(form));
    if (!parsed.success) {
      setErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setErrors({});
    try {
      await save(parsed.data);
      onDone();
    } catch (error) {
      setErrors(fieldErrorsFromApi(error));
      setFailure(error);
    }
  }

  return { form, set, errors, failure, submit };
}
