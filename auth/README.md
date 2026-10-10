# Owner sign-in service

This Worker implements GitHub OAuth sign-in and content management for GitHub user
ID `245514160` only. The API is restricted to `MisumiUika626/akn20`, branch `main`.

## Deployment

Current service: `https://akn20-auth.akn20.workers.dev`.
The owner's Cloudflare account and GitHub application are configured. Both required
secrets are encrypted Cloudflare bindings; the blog's public service URL is set.
The owner must sign in again after the content-management upgrade to grant editing access.

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
- The GitHub token is protected inside an AES-GCM encrypted app session. It is not
  exposed as a readable token in the browser or returned by the content API.
- The app requests `read:user public_repo`. GitHub's OAuth grant covers the owner's
  public repositories; the Worker independently limits all operations to `akn20`
  and the allowlisted Markdown/JSON content paths. No arbitrary proxy URL, repository,
  branch or code/workflow path can be supplied by the client.
- The popup targets only `https://misumiuika626.github.io`. The frontend checks
  both message origin and the exact popup window before validating a session.
- App sessions expire after one hour. They are stored in the browser tab's
  `sessionStorage`, not in URLs or persistent `localStorage`.
- Sign-out clears this tab's saved session. Previously issued app sessions expire
  within one hour; this stateless version has no server-side revocation store.
- Every `/session` request verifies the signature, expiry, issuer, audience and ID.
- CORS allows only the blog origin; all authentication responses are `no-store`.

Run `node --test tests/auth-worker.test.mjs` from the repository root. These are
mocked protocol/security checks, not proof that live GitHub authorization completed.

## Editable content

- `/content/posts`, `/content/post`: list/read/create/update/delete `.md` articles
  directly in `src/content/post/` or `src/content/post/zh/`. Filenames use lowercase
  English letters, numbers, hyphens and underscores. MDX remains supported by the
  public site but is not managed by this first Markdown editor.
- `/content/projects`: structured JSON at `src/data/projects.json`.
- `/content/about`: localized About Markdown files.
- `/content/settings`: display title at `src/data/site-settings.json`.

GitHub file SHA revisions provide optimistic concurrency. A stale save is rejected
instead of overwriting newer edits. Content validation runs before GitHub writes.
Saving commits to `main` and triggers the existing Pages workflow. Draft files are
excluded from the website but are still readable in the public GitHub repository.
