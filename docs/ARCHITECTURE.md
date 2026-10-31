# Architecture

Festiva AI is a TypeScript monorepo with three layers that share one set of validation rules.

| Folder    | Role                                                                                     |
| --------- | ---------------------------------------------------------------------------------------- |
| `shared/` | Pure code used by both sides: zod schemas, types, constants, budget / task / vendor math |
| `server/` | Express API: auth, rate limiting, routes, repositories (Supabase or in-memory), Gemini   |
| `client/` | React app: pages, feature folders (`overview`, `budget`, `tasks`, ...), UI primitives    |

## Design decisions

- **One source of truth for rules.** Every request body is parsed with a schema from `shared/schemas.ts`; the
  client forms reuse the same limits, so the browser and the server cannot disagree.
- **Repositories hide storage.** Routes talk to the `Repository` interface (`server/data/repository.ts`).
  `supabaseRepository` is used in production, `memoryRepository` in tests. Every method takes the user id, so a
  record can never be read through another user's session.
- **Generic collection router.** Tasks, expenses and vendors share `createCollectionRouter`; each only supplies
  its schemas and limits.
- **AI output is never trusted.** `geminiClient` asks for JSON matching a schema, trims it to the schema limits,
  validates it and retries once. Copilot suggestions are proposals the user must confirm.
- **Pure calculations.** Budget, task and vendor logic in `shared/calc` has no I/O and is covered by unit tests.

## Conventions

- `npm run format` (Prettier) and `npm run lint` (ESLint, including jsx-a11y) must pass before merging.
- Prefer small named utility classes in `client/src/styles/components.css` over inline `style` props.
- Keep user-facing error text in the server's `AppError`, never raw provider or database messages.
