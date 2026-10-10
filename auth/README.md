# Owner sign-in service

This Worker implements GitHub OAuth identity sign-in for GitHub user ID
`245514160` only. It is not a CMS or a content-write API.

## Deployment

Current service: `https://akn20-auth.akn20.workers.dev`.
The owner's Cloudflare account and GitHub application are configured. Both required
secrets are encrypted Cloudflare bindings; the blog's public service URL is set.
The remaining end-to-end check is a real owner login through the published admin page.

1. Authorize Wrangler to deploy to the owner's Cloudflare account.
2. Deploy `auth/wrangler.jsonc` to obtain its actual `workers.dev` URL.
3. Register a GitHub OAuth application with the blog homepage
   `https://misumiuika626.github.io/akn20/` and callback
   `https://<actual-worker-host>/callback`.
4. Configure `PUBLIC_URL` (the Worker origin) and `GITHUB_CLIENT_ID` in the Worker.
5. Add **secrets** `GITHUB_CLIENT_SECRET` and `SESSION_SECRET` through Cloudflare's
   secret input. The session secret must be independently randomly generated and
   at least 32 characters. Never put either secret in Git, a URL, or chat.
6. Set the public Worker origin in `src/data/auth.ts`, build, test and deploy the blog.
7. Perform a real owner login in the published admin page. Test rejection of an
   unrelated account before claiming the deployed login is verified.

Until credentials are configured, authentication endpoints fail with 503. The
frontend remains disabled while its service URL is empty.

## Security and lifecycle

- OAuth requests use a signed, expiring Secure/HttpOnly state cookie and PKCE S256.
- Token exchange and authenticated GitHub `/user` requests run on the Worker.
- Authorization compares the numeric owner ID, not a display name or frontend flag.
- The GitHub token is not returned to the browser. The app requests `read:user`,
  with no repository write scope.
- The popup targets only `https://misumiuika626.github.io`. The frontend checks
  both message origin and the exact popup window before validating a session.
- App sessions expire after one hour. They are stored in the browser tab's
  `sessionStorage`, not in URLs or persistent `localStorage`.
- Sign-out clears this tab's saved session. Previously issued tokens expire within
  one hour; this stateless identity-only version has no server-side revocation store.
- Every `/session` request verifies the signature, expiry, issuer, audience and ID.
- CORS allows only the blog origin; all authentication responses are `no-store`.

Run `node --test tests/auth-worker.test.mjs` from the repository root. These are
mocked protocol/security checks, not proof that live GitHub authorization completed.
