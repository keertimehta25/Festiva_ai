// Checks a deployed Festiva AI API from the outside.
// Usage: node scripts/verify-deployment.mjs <api-url> <web-origin> [access-token]
//   api-url      e.g. https://festiva-ai-api.onrender.com
//   web-origin   your Vercel URL, e.g. https://festiva-ai.vercel.app
//   access-token optional: a signed-in user's Supabase access token, to also test the AI end to end.
//                Copy it from the browser: DevTools -> Application -> Local Storage -> sb-...-auth-token -> access_token.
const [apiUrl, webOrigin, token] = process.argv.slice(2);
if (!apiUrl || !webOrigin) {
  console.error('Usage: node scripts/verify-deployment.mjs <api-url> <web-origin> [access-token]');
  process.exit(2);
}
const base = apiUrl.replace(/\/$/, '');
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed += 1;
};
const call = (path, init = {}) => fetch(`${base}/api${path}`, { signal: AbortSignal.timeout(90_000), ...init });

console.log('Note: Render free services sleep after 15 minutes idle; the first request can take about a minute.');

const health = await call('/health').catch((error) => {
  console.error(`FAIL  Could not reach ${base}/api/health: ${error.cause?.code ?? error.name}. Check the URL, and wait a minute if the Render service was asleep.`);
  process.exit(1);
});
const body = await health.json().catch(() => ({}));
check('Health endpoint answers 200', health.status === 200, `HTTP ${health.status}`);
check('AI key is configured on the server', body?.data?.aiConfigured === true, `aiConfigured=${body?.data?.aiConfigured}`);

const anonymous = await call('/events');
check('Private routes reject anonymous requests (401)', anonymous.status === 401, `HTTP ${anonymous.status}`);

const allowed = await call('/health', { headers: { Origin: webOrigin } });
check('CORS allows your web origin', allowed.headers.get('access-control-allow-origin') === webOrigin, `got ${allowed.headers.get('access-control-allow-origin')}`);
const blocked = await call('/health', { headers: { Origin: 'https://evil.example' } });
check('CORS blocks other origins', blocked.headers.get('access-control-allow-origin') === null);
check('Security headers present', health.headers.get('x-content-type-options') === 'nosniff' && Boolean(health.headers.get('content-security-policy')));

if (token) {
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const list = await call('/events', { headers: auth });
  check('Signed-in request to the database works', list.status === 200, `HTTP ${list.status}`);
  if (list.status === 200) {
    const created = await call('/events', { method: 'POST', headers: auth, body: JSON.stringify({ name: 'Deployment check (safe to delete)', eventType: 'birthday', totalBudget: 50000, guestCount: 40 }) });
    const event = (await created.json()).data?.event;
    check('Event can be created and stored', created.status === 201 && Boolean(event?.id), `HTTP ${created.status}`);
    if (event?.id) {
      const chat = await call(`/events/${event.id}/ai/chat`, { method: 'POST', headers: auth, body: JSON.stringify({ message: 'In one sentence, what should I book first?' }) });
      const reply = await chat.json();
      check('Real Gemini copilot reply works', chat.status === 200 && typeof reply.data?.reply === 'string', `HTTP ${chat.status} ${reply.error?.code ?? ''}`);
      const removed = await call(`/events/${event.id}`, { method: 'DELETE', headers: auth });
      check('Test event cleaned up', removed.status === 204, `HTTP ${removed.status}`);
    }
  }
} else {
  console.log('SKIP  Signed-in checks (pass an access token as the third argument to test database + Gemini).');
}
console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
