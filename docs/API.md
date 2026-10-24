# API reference

Base path `/api`. JSON in, JSON out. Private routes need `Authorization: Bearer <Supabase access token>`.

**Success:** `{ "data": … }` (or `204 No Content` for deletes).
**Error:** `{ "error": { "code": "SOME_CODE", "message": "Readable text", "details": { "field": ["message"] } } }` (`details` only for validation errors).

| Status | Meaning |
|---|---|
| 400 | `VALIDATION_ERROR` (with field details), `INVALID_JSON` |
| 401 | `UNAUTHENTICATED`: missing, malformed, invalid or expired token |
| 404 | `NOT_FOUND`: missing **or belonging to another user** (indistinguishable on purpose) |
| 409 | `LIMIT_REACHED`, `PLAN_IN_PROGRESS`, `NO_PLAN` |
| 413 | `PAYLOAD_TOO_LARGE` (body limit 50 kB) |
| 422 | `ALLOCATION_EXCEEDS_BUDGET`, `INVALID_VENDOR`, `AI_BLOCKED` |
| 429 | `RATE_LIMITED` (300 requests / 15 min per IP; 20 AI calls / 10 min per user), `AI_RATE_LIMITED` |
| 502 / 503 / 504 | `DATABASE_ERROR`, `AI_UNAVAILABLE`, `AI_AUTH_FAILED`, `AI_BAD_REQUEST`, `AI_EMPTY_RESPONSE`, `AI_TRUNCATED`, `AI_INVALID_RESPONSE`, `AI_NOT_CONFIGURED` (503), `AI_TIMEOUT` (504) |

## Public

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ status: "ok", aiConfigured: boolean }`. Never reveals keys |

## Events

| Method | Path | Body / result |
|---|---|---|
| GET | `/events` | List with server-computed summary (`taskProgressPercent`, `totalActual`, `percentConsumed`, `daysToEvent`). The large AI plan is omitted |
| POST | `/events` | Create. Fields: `name`*, `eventType`* (`wedding`, `birthday`, `anniversary`, `community`, `college`, `custom`), `totalBudget`* (₹1,000–1,000,000,000, whole rupees), `guestCount`* (1–100,000), `eventDate` (today or later, `YYYY-MM-DD`, nullable), `dateIsApproximate`, `city`, `venuePreference`, `durationHours` (1–240, default 4), `theme`, `colors`, `foodPreference` (`vegetarian`, `non_vegetarian`, `mixed`, `vegan`, `jain`), `venueSetting` (`indoor`, `outdoor`, `either`), `culturalNotes`, `priorities[]` (`affordability`, `luxury`, `sustainability`, `accessibility`, `convenience`). Returns `{ event, tasks, notes }`: default budget split, a starter task list, and plain-language input warnings. Max 20 events per user |
| POST | `/events/sample` | Creates a labelled sample wedding once per user (fictional vendors, `(demo)` suffix). Returns `{ event, created }` |
| GET | `/events/:id` | Whole workspace: `{ event, tasks, expenses, vendors }` |
| PATCH | `/events/:id` | Partial update; untouched fields are never reset. Changing `totalBudget` rescales allocations proportionally; `allocations` may be sent explicitly but cannot sum to more than the total (422) |
| DELETE | `/events/:id` | Deletes the event and everything under it |

## Tasks, expenses, vendors

Each has `POST /events/:id/<collection>`, `PATCH /events/:id/<collection>/:itemId` and `DELETE /events/:id/<collection>/:itemId`. A PATCH is validated as the merged record, so it follows the same rules as a create. Limits per event: 200 tasks, 300 expenses, 100 vendors.

- **tasks**: `title`*, `description`, `dueDate`, `priority` (`low|medium|high`), `status` (`pending|in_progress|completed`), `category`, `notes`, `vendorId`.
- **expenses**: `title`*, `category`* (venue, catering, decoration, photography, entertainment, attire, invitations, transportation, accommodation, miscellaneous), `estimatedAmount`, `actualAmount` (whole rupees ≥ 0, at least one > 0), `vendorId`, `notes`.
- **vendors**: `name`*, `category`* (venue, caterer, photographer, decorator, makeup_artist, florist, entertainment, invitation_designer, transportation, other), `contact`, `quotedPrice`, `advanceAmount` (≤ quote), `paymentStatus` (`unpaid|advance_paid|paid`), `bookingStatus` (`shortlisted|contacted|quoted|booked|rejected`), `notes`, `followUpDate`. Deleting a vendor keeps linked tasks/expenses and clears their link.

`vendorId` must belong to the same event (422 `INVALID_VENDOR`).

## AI (rate limited per user)

| Method | Path | Description |
|---|---|---|
| POST | `/events/:id/ai/plan` | Generates and stores the full plan. One call at a time per event (409 otherwise). Returns `{ event, notes }`; `event.plan` includes server-computed `allocationAmounts`, `estimatedTotal`, `budgetWarning`, and the model name |
| POST | `/events/:id/ai/plan/apply-tasks` | Creates tasks from the plan's timeline with computed due dates, skipping duplicate titles. `{ created, skipped }` |
| POST | `/events/:id/ai/plan/apply-budget` | Replaces the category allocations with the plan's split (amounts computed by the server, summing exactly to the budget) |
| POST | `/events/:id/ai/chat` | Body `{ message (≤1000 chars), history (≤6 turns of {role: user|assistant, content}) }`. Returns `{ reply, proposals[] }`. Proposals (`add_task`, `reallocate`) are validated against the real event; **the API never applies them**: the client applies a proposal through the ordinary task/event endpoints after the user confirms |
| POST | `/events/:id/ai/savings` | `{ ideas: [{ title, detail, category }] }` |
