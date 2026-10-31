# Security

## Reporting a problem

Please open a private security advisory on this repository (Security → Advisories → Report a vulnerability)
instead of a public issue. Include the steps to reproduce and the impact you expect.

## How the app protects users and the AI budget

| Layer           | Measure                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Secrets         | `GEMINI_API_KEY` and the Supabase service key exist only in the server environment. They are never sent to the browser, logged or committed (`.env` is gitignored).      |
| Authentication  | Every `/api` data route requires a Supabase access token, verified server-side on each request.                                                                          |
| Authorization   | Every repository method takes the signed-in user's id and filters by it, so a record cannot be read or changed through another user's session. Row Level Security is on. |
| Input           | Every request body is validated with zod (shared with the client forms), with length caps on free text and control characters stripped.                                  |
| AI output       | Gemini runs in JSON mode with a schema; the answer is trimmed to the schema limits and validated again before use. Invalid output becomes `502 AI_INVALID_RESPONSE`.     |
| Copilot changes | The copilot only _proposes_ changes. Nothing is saved until the user confirms it.                                                                                        |
| Privacy         | Vendor contact details are never sent to the AI provider. Prompts, keys and model output are never logged.                                                               |
| Abuse limits    | Per-IP API rate limit, stricter per-user limit on AI routes, 50 KB body cap, per-event limits on tasks, expenses and vendors.                                            |
| Browser / HTTP  | `helmet` with a `default-src 'none'` CSP, locked-down CORS origin list, `x-powered-by` disabled.                                                                         |
| Errors          | Responses carry a short error code and a friendly message. No stack traces or database messages reach the client.                                                        |
| Dependencies    | Lockfile committed, `npm ci` in CI, and `npm audit --omit=dev --audit-level=high` enforced in CI.                                                                        |

## Known limits

The rate limiter keeps its counters in memory, so on a multi-instance deployment each instance counts separately.
Put a shared store (for example Redis) behind it if the API is scaled out.
