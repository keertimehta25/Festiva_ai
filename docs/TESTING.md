# Testing

## Running

```bash
npm run check          # typecheck + strict lint + all unit and integration tests
npm run coverage       # the same tests with coverage thresholds (fails below them)
npm run test:e2e       # Playwright in real Chromium, desktop and Pixel 7 (run `npx playwright install chromium` once)
npm run format:check   # Prettier
```

CI (`.github/workflows/ci.yml`) runs format, check, coverage, build and `npm audit` in one job, then the Playwright suite in a second job, on every push and pull request.

## Results

| Suite                                                                                            | Folder        | Tests   | Result         |
| ------------------------------------------------------------------------------------------------ | ------------- | ------- | -------------- |
| Shared logic: budget, task and vendor maths, schemas, templates, project hygiene                 | `shared/`     | 83      | Passed         |
| Server: API routes, auth and ownership, config, AI client and prompts, repositories, token cache | `server/`     | 108     | Passed         |
| Client: pages, tabs, dialogs, forms, routing, auth provider, API client, accessibility (axe)     | `client/src/` | 163     | Passed         |
| **Unit and integration total**                                                                   | 33 files      | **354** | **All passed** |
| End to end in real Chromium (3 journeys × desktop and mobile), each with a full axe audit        | `e2e/`        | 6       | All passed     |

| Coverage (shared, server, client) | Result | Threshold enforced in CI |
| --------------------------------- | ------ | ------------------------ |
| Lines                             | 98.2%  | 95%                      |
| Statements                        | 96.8%  | 94%                      |
| Functions                         | 95.6%  | 90%                      |
| Branches                          | 88.7%  | 82%                      |

Dependencies: `npm audit --omit=dev --audit-level=high` reports 0 vulnerabilities and runs in CI.

## What each area proves

- **Money and dates** (`shared/calc`): totals, remaining balance, overspend, reallocation, vendor payments and task progress are pure functions with edge cases for zero, rounding, huge values and past dates.
- **Validation** (`shared/schemas.test.ts`, `EventForm*.test.tsx`): every rule has a passing and a failing case; messages are the ones users see.
- **Authorization** (`server/api.test.ts`): signed-out calls are rejected, one user can never read, change or delete another user's event or its tasks, expenses and vendors, and vendors from another event cannot be linked.
- **Repositories** (`server/data`): the database layer is checked for user scoping on every query, row mapping, and that database messages never reach callers.
- **AI safety** (`server/ai`): timeouts, rate limits, blocked or empty answers, truncated output, malformed JSON and schema violations each map to a clear error; oversized answers are trimmed instead of discarded; prompts keep user data separate from instructions.
- **Screens** (`client/src/features`, `pages`): add, edit, delete and filter flows for tasks, vendors, expenses and the event itself, including failure messages, confirmations and cancel paths.
- **Routing and sign-in** (`App.test.tsx`, `AuthProvider.test.tsx`): signed-out visitors are redirected, a missing configuration is explained, cached data is cleared on sign-out.
- **API client** (`client/src/lib/api.test.ts`): every endpoint is checked for its HTTP method and path.
- **Accessibility**: axe runs in component tests and in the real browser on desktop and mobile; see [ACCESSIBILITY.md](ACCESSIBILITY.md).
- **Project hygiene** (`shared/projectHygiene.test.ts`): required documents exist, every source file stays under 250 lines, no `any` or `@ts-ignore`, no stray `console` calls and no secret-like strings.

## Approach

- Tests describe behaviour a user or caller can observe, not implementation details.
- External services are never called: the database, Supabase auth and Gemini are replaced by test doubles, and the browser tests use a canned AI provider with the real routes and validation.
- Time is injected (`today` is a parameter), so date logic is deterministic in any time zone. The suite was also run in UTC, Los Angeles and Kiritimati.
- Failure paths are tested as carefully as success paths.

## Not automated

- Manual screen-reader testing.
- Live Gemini and Supabase behaviour: it is confirmed by hand on the deployed site and with `scripts/verify-deployment.mjs`.
- Load and performance testing.
