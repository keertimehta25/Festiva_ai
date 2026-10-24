# Submission pack

Submission window: 19 Oct 2026, 4:33 PM IST to **1 Nov 2026, 11:59 PM IST**. Maximum three submissions. Fill the `<…>` placeholders only with real, verified links. Do not submit until the live checks in [DEPLOYMENT.md](DEPLOYMENT.md) pass.

## Pre-submission checklist

- [ ] GitHub repo is **public**, `git count-objects -vH` and working tree size < 10 MB, no `.env` committed (`git log --all -p -S"AIza" | head` is empty)
- [ ] Live URL opens in a private window; `node scripts/verify-deployment.mjs <api> <site> <token>` all PASS (this proves the real Gemini call and the real database)
- [ ] Generate one plan and one copilot answer on the live site; refresh and confirm data persists
- [ ] Demo video uploaded and viewable while signed out
- [ ] README links to the live app and video updated (replace the two "add after…" lines)

## A. Public GitHub repository link

`<https://github.com/YOUR-USER/YOUR-REPO>` (paste after you create it and confirm it is public)

## B. Project deployed link

`<https://YOUR-SITE.vercel.app>` (paste after `verify-deployment.mjs` passes)

## C. Demo video

Target 3–4 minutes. Open the live site once a minute beforehand (Render wakes slowly) and create the account before recording. Do not show any API keys, tokens or the Supabase dashboard secrets.

| Time | Show | Say |
|---|---|---|
| 0:00 | Landing page, hero, preview budget tabs | "Festiva AI helps people plan weddings, birthdays and community events without scattered spreadsheets." |
| 0:20 | Click **Plan My Event**; fill name, city, ₹8,00,000, 300 guests, vegetarian, priorities | "One short form. Optional fields have sensible defaults." |
| 0:50 | Submit, then **AI plan → Generate AI plan** (real Gemini call) | "This calls Gemini from my server. The key never reaches the browser." While it runs, point out the "AI suggestion, not a quote" notice |
| 1:20 | Scroll the plan: concept, budget split, timeline, vendor checklist, schedule, risks | "Amounts are labelled estimates with stated assumptions. No vendors are invented." |
| 1:50 | **Apply timeline to tasks**, open **Tasks**; show overdue/upcoming, filter, complete one | "Due dates are worked back from the event date. Progress is calculated by code." |
| 2:15 | **Budget**: add an expense; remaining balance and chart update; add one that overspends to show the warning and reallocation suggestion | "All the maths is deterministic, not done by the AI." |
| 2:45 | **Vendors**: add a vendor, set booked and advance paid; show pending payment | "Vendors are records I enter; the app doesn't claim to verify real businesses." |
| 3:10 | **Copilot**: use a quick prompt; apply a proposed task | "It sees my budget, tasks and vendors. Changes need my confirmation." |
| 3:30 | Refresh the page; show everything persisted | "Saved per account in Postgres with row-level security." |
| 3:40 | Slide or README: stack, 212 + 3 tests, security, accessibility audit, Vercel + Render + Supabase | "React, TypeScript, Express, Supabase, Gemini. Tests cover the maths, validation, authorization and AI failure handling." |

**Upload:** YouTube Studio → Create → Upload videos → Visibility **Unlisted** → copy the link. Or Google Drive → upload → Share → General access **Anyone with the link: Viewer**. Open the link in a private window to confirm.

Video URL: `<paste after upload>`

## D. Changes / updates in the deployed version (≤ 1024 characters)

The last sentence is only true after you have deployed and verified; edit it if you host elsewhere.

```
Festiva AI is a full-stack event planner for weddings, birthdays and community events. Users sign in (Supabase Auth) and create events that persist in Postgres with row-level security and per-user server-side authorization. Features: AI-generated personalised plan, budget manager (estimated vs actual, overspend warnings, reallocation), dated task timeline with filters, vendor tracker with payments and follow-ups, and an event-aware copilot whose proposed changes need user confirmation. India-first (INR, Indian formats, vegetarian options). Budget, progress and payment maths run in deterministic code. Security: validation, rate limits, CORS, helmet and CSP, no secrets in the client. Tested with 212 unit/API/component tests and 3 browser tests with axe accessibility audits. Deployed on Vercel (web) and Render (API).
```

## E. GenAI services used and where (≤ 1024 characters)

```
Provider: Google Gemini API (model gemini-3.6-flash, set by the GEMINI_MODEL variable), called only from the Express server; the key is a server environment variable. Used for: (1) full event plan generation: concept, budget split, itemised estimates, timeline, vendor checklist, ideas, day-of schedule, risks; (2) the event copilot chat, which receives the saved event, budget, tasks and vendor names; (3) AI cost-saving ideas on the budget page. Task generation from the plan reuses the stored plan. Output is schema-constrained JSON, re-validated with zod, retried once if malformed; timeouts, rate limits, truncation and a missing key return clear errors, never mock output. Rupee totals, percentages and progress are computed by application code, not the model. Copilot proposals are checked against real data and applied only after user confirmation. Prompts treat user text as data and exclude vendor contact details.
```

## F. LinkedIn post

```
I built Festiva AI for the Celebration & Event Planner challenge.

The problem: planning a wedding or a community festival means scattered spreadsheets, a budget that quietly drifts, and deadlines that appear too late.

What it does:
• Turns a short form into a personalised plan: concept, budget split, timeline, vendor checklist and a day-of schedule
• Tracks estimated vs actual spend and warns before a category overshoots
• Works back from the event date to build a task timeline (weddings start months out, birthdays weeks)
• Keeps vendor quotes, advances and follow-ups organised
• Includes an AI copilot that knows your event and only changes things after you approve

What I cared about:
• AI is helpful but not trusted with arithmetic. All money maths is deterministic, and AI amounts are labelled estimates, never quotes
• Security: per-user authorization, row-level security, validated input, rate limits, no secrets in the browser
• Accessibility and testing: keyboard friendly, contrast-checked, axe audits, and 200+ automated tests

Built with React, TypeScript, Express, Supabase and Google Gemini.

What I learned: structured AI output needs validation on both sides, and the end-to-end browser test caught a real navigation bug that unit tests missed.

Code: <GitHub link>
Try it: <live link>

#GenAI #React #TypeScript #Gemini #BuildInPublic
```

## Evaluation checklist by judging criterion

| Criterion | Where it is addressed |
|---|---|
| **Code quality** | Shared zod schemas as single source of truth; repository and `AiService` interfaces; domain maths isolated in `shared/calc` with tests; small feature folders; strict TypeScript with `noUncheckedIndexedAccess`; ESLint with a11y rules; central error handler |
| **Security** | See README "Security": auth on every private route, user-scoped queries, RLS without policies, validation, limits, CORS, helmet, prompt-injection separation, no secrets or sensitive logging, tested cross-user access |
| **Efficiency** | Route-level code splitting, bounded queries and prompts, one model call per request, in-flight guard and per-user AI rate limit, short auth cache (hash only, success only), server-side dashboard aggregates, deterministic local maths |
| **Testing** | 212 Vitest tests + 3 Playwright tests; failures, timeouts, malformed AI output and authorization all covered |
| **Accessibility** | Landmarks, labels, dialogs, live regions, chart table alternative, reduced motion, contrast script, axe in jsdom and real browser. Manual screen-reader pass not done |
| **Problem alignment** | Weddings, birthdays, community events; budgets, timelines, vendor checklists and personalised ideas, all backed by a real GenAI integration |
