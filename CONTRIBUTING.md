# Contributing

## Setup

```bash
npm install
cp .env.example .env      # see docs/DEPLOYMENT.md for the values; tests never call real services
npm run dev:server        # API on :8787
npm run dev:client        # web app on :5173
```

## Before you open a pull request

```bash
npm run check             # typecheck, strict lint, unit / API / component tests
npm run test:e2e          # Playwright + axe (run `npx playwright install chromium` once)
npm run format:check      # Prettier
```

## Where code goes

- **Money, dates and task logic:** only in `shared/calc` and `shared/*.ts`, as pure functions that take `today` as a parameter. Add tests for edge cases (zero, huge, rounding, past dates).
- **Validation rules:** one zod schema in `shared/schemas.ts`, used by both the API and the client forms.
- **API routes:** thin handlers in `server/routes`. Storage goes through the `Repository` interface, never directly to Supabase.
- **AI:** add the output schema in `shared/schemas.ts`, the prompt in `server/ai/prompts.ts`, and always validate the model's answer before using it.
- **Components:** render and dispatch. If a component needs a number, add a function in `shared/calc`.
- **Docs:** update `README.md` and the relevant file in `docs/` when behaviour changes.

## Style

- TypeScript strict; no `any`, `@ts-ignore` or non-null assertions.
- Prettier formatting and typescript-eslint `strictTypeChecked` (with jsx-a11y) are enforced in CI.
- Prefer small named CSS utility classes over inline `style` props.
- Keep files small and single-purpose.
- Commit messages follow `type(scope): summary`, for example `feat(budget): warn on overspend`.

## Security

Never commit keys. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
