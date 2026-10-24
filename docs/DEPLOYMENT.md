# Deployment guide

Architecture: **Supabase** (sign-in + database) → **Render** (Express API) → **Vercel** (React site), with **Gemini** called only from the API. All three hosts have a free tier. I checked Render, Vercel and Supabase free-tier notes on 22 Oct 2026; plans change, so skim each pricing page before you start.

| Service | Free-tier things to know |
|---|---|
| Render | Free web service sleeps after ~15 min idle; first request after sleep takes ~1 minute. 750 instance hours / month |
| Vercel Hobby | For personal, non-commercial use (fine for a competition entry) |
| Supabase | Free project pauses after ~7 days of inactivity (resume it in the dashboard); 500 MB database |
| Gemini API | Free tier has per-minute and per-day limits; see Google's rate-limit page |

You will do these steps in your own accounts. Nothing below has been run for you, so the live URLs do not exist yet.

## 1. Put the code on GitHub

```bash
cd festiva-ai
git add -A && git commit -m "Festiva AI"          # already committed if you used the provided history
# Create an empty PUBLIC repo on github.com (no README/licence), then:
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Check `git status` shows no `.env` file before you push (it is git-ignored).

## 2. Supabase (database + sign-in)

1. supabase.com → New project. Pick a region near India (e.g. Mumbai) and save the database password somewhere safe.
2. **SQL Editor → New query**, paste all of `supabase/schema.sql`, **Run**. It creates the tables, constraints and Row Level Security. It is safe to run twice.
3. **Authentication → Providers → Email**: enabled. For an easy demo, **Authentication → Sign In / Providers → Email → turn off "Confirm email"** (otherwise each new user must click an emailed link first).
4. **Project Settings → API** (or "API Keys"). Copy:
   - Project URL → `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - `anon` / public key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**secret**: only ever in Render)
   If your dashboard shows new-style keys ("publishable" / "secret"), use the publishable key as the anon key and the secret key as the service-role key.
5. After Vercel gives you a URL (step 4), set **Authentication → URL Configuration → Site URL** to it.

## 3. Gemini key

Google AI Studio → **Get API key** (aistudio.google.com/apikey) → create a key. This is `GEMINI_API_KEY` (**secret**). Confirm the model name in `GEMINI_MODEL` is still listed on Google's models page; if it is retired, change only that variable.

## 4. Render (API)

1. render.com → **New → Blueprint** → connect your GitHub repo. It reads `render.yaml`. (Or **New → Web Service** and enter the values below by hand.)
2. Settings used:

| Setting | Value |
|---|---|
| Root directory | _(leave empty: repo root)_ |
| Runtime | Node (`NODE_VERSION` = 22) |
| Build command | `npm ci --include=dev && npm run build:server` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Plan | Free |

3. Environment variables (Environment tab):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | from step 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | from step 2 (secret) |
| `GEMINI_API_KEY` | from step 3 (secret) |
| `GEMINI_MODEL` | `gemini-3.6-flash` |
| `CORS_ORIGINS` | your exact Vercel URL, no trailing slash. Add it after step 5, then redeploy |
| `GEMINI_THINKING_LEVEL` | optional: `low` if plans feel slow or get cut off |

4. Deploy. Your API URL looks like `https://festiva-ai-api.onrender.com`. Open `<url>/api/health`; you should see `{"data":{"status":"ok","aiConfigured":true}}`.

The server refuses to start in production without `CORS_ORIGINS`, so a missing value shows up in the Render logs as "Invalid server configuration".

## 5. Vercel (web)

1. vercel.com → **Add New → Project** → import the repo.
2. Settings (also in `vercel.json`):

| Setting | Value |
|---|---|
| Framework preset | Other |
| Root directory | _(repo root)_ |
| Install command | `npm ci` |
| Build command | `npm run build:client` |
| Output directory | `dist/client` |

3. Environment variables (Production):

| Key | Value |
|---|---|
| `VITE_API_URL` | your Render URL, no trailing slash |
| `VITE_SUPABASE_URL` | from step 2 |
| `VITE_SUPABASE_ANON_KEY` | anon / publishable key from step 2 |

4. Deploy. `vercel.json` already contains the single-page-app rewrite (so refreshing `/events/...` works), cache headers and security headers. Its Content-Security-Policy allows API calls to `https://*.onrender.com` and `https://*.supabase.co`; if you use a custom API domain, add it to `connect-src`.
5. Copy the Vercel URL into Render's `CORS_ORIGINS` and Supabase's Site URL, then redeploy Render.

## 6. Verify the live deployment

```bash
node scripts/verify-deployment.mjs https://<api>.onrender.com https://<site>.vercel.app
```

Expect PASS for health, `aiConfigured`, 401 on private routes, CORS allow/deny and security headers. To also test the database and the real Gemini call, sign in on the live site, then copy your access token (browser DevTools → Application → Local Storage → the `sb-…-auth-token` entry → `access_token`) and pass it as a third argument. The script creates a throwaway event, asks the copilot one question, and deletes the event.

Then in the browser (use the real site, not localhost):

1. Sign up. On the empty **My events** page click **Explore a sample wedding** (it only appears while you have no events), or create an event.
2. **AI plan → Generate AI plan**; confirm a plan appears. This is the first real Gemini call.
3. Add an expense; the remaining balance changes. Refresh the page; data is still there.
4. Open DevTools → Console and Network: no red errors, no request to `localhost`, no API keys in any request or response.
5. Ask the copilot a question; apply a proposal and see it appear in Tasks.

If something fails, see "Troubleshooting".

## Updating after a fix

Push to `main`; Vercel and Render redeploy automatically. Database changes: edit `supabase/schema.sql` in an additive, re-runnable way and run it again in the SQL Editor.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Site loads, "Could not reach the server" | `VITE_API_URL` wrong, or Render is waking up (wait ~1 min) |
| Browser console shows a CORS error | `CORS_ORIGINS` does not exactly equal the site URL (scheme, no trailing slash) |
| Sign-up says check your email but no email | Turn off "Confirm email" or configure SMTP in Supabase |
| `401` after signing in | `SUPABASE_URL` / service-role key on Render belong to a different project than the site's |
| AI answers `AI_NOT_CONFIGURED` (503) | `GEMINI_API_KEY` not set on Render |
| `AI_AUTH_FAILED` | Key invalid or restricted |
| `AI_BAD_REQUEST` | `GEMINI_MODEL` is retired or misspelled; or the API changed the request fields: check Render logs for the provider message |
| `AI_TRUNCATED` | Set `GEMINI_THINKING_LEVEL=low` |
| `AI_RATE_LIMITED` | Free-tier quota; wait or use a billed key |
| Database errors (502 `DATABASE_ERROR`) | Schema not run, or Supabase project is paused |

## Record the repository size before submitting

```bash
git count-objects -vH
du -sh --exclude=node_modules --exclude=dist --exclude=.git .
```
