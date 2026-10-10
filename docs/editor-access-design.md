# Owner-only editing

Status: owner-only GitHub identity login implemented. The authentication service
is deployed at `https://akn20-auth.akn20.workers.dev`. The blog is connected to it.
Articles, projects, About and display-title editing are implemented through a
fixed-repository content API. A real owner login with repository-write permission
must be completed in the published browser page before claiming end-to-end validation.

## Confirmed requirements

- Retain the existing Kami frontend and bilingual content model.
- Provide an in-site admin editor, preview, image upload, content management and publication.
- Only the owner may create, edit, delete, upload or publish.
- Visitors may read, search and download publicly available content, without a login.
- All local changes remain within `/home/misumi/workspace/akn20`.

Reference: https://mip001.com/ exposes a public personal blog with articles, archives,
tags and resources. Its public pages do not establish how its private editor works.
Use it as a visitor-experience reference, not evidence of a particular CMS/backend.

## Verified ownership

GitHub login: `MisumiUika626`.
Immutable GitHub user ID: `245514160`.
Repository: `MisumiUika626/akn20`, public, publication branch `main`.
Current collaborator inspection found only that owner with repository write access.

## Proposed implementation

Decap CMS supplies `/akn20/admin/`, using the existing Markdown and MDX directories.
The auth service runs on a Cloudflare Worker. During OAuth callback it must query
GitHub's authenticated `/user` endpoint and compare the returned numeric ID with
`245514160` before delivering any access token to the editor. Other accounts must
be denied even if they find the admin URL. The frontend is not an access-control boundary.

Enforce OAuth state validation, an expiring secure HttpOnly cookie, and an exact
popup message origin of `https://misumiuika626.github.io`. Client secrets live only
in Worker secrets, never in the repository, built HTML or client-side scripts.
The repo configuration remains fixed to the owner's content repository.

Published content is publicly readable and downloadable. Decap's editorial-workflow
draft branches in a public GitHub repository are also publicly readable as raw files;
that workflow must not be presented as private draft storage. If private drafts are
required, select private storage before enabling that workflow.

## Deployment dependency

Cloudflare was authorized by the owner and the account email was verified. The
Worker is deployed, its session secret generated server-side, and the GitHub OAuth
application configured. Its public client ID is `Ov23lirFdsFAYE72U84T`; client and
session secrets are Cloudflare encrypted bindings. No secret values belong in Git.
The current login requests `read:user public_repo`. It seals the GitHub token inside
an AES-GCM encrypted session; the frontend never receives a readable GitHub token.
Every content request validates the session and requires the write grant. API paths
allow only managed Markdown articles, localized About and the projects/title JSON
files in `MisumiUika626/akn20` on `main`. SHA revisions reject conflicting updates.

Verification: 36 automated tests passed, including mocked OAuth/owner checks,
bad/expired state, forged/expired sessions and denied origins. Browser tests with
mocked session responses covered guest hiding, owner-only navigation, restored
sessions, forged popup rejection and logout. Live Worker checks confirmed the GitHub
redirect, PKCE, secure cookie, anonymous denial, invalid-state denial and origin denial.
These tests do not substitute for a human completing a real GitHub OAuth sign-in.

The intended initial cost is the free service tiers; paid subscriptions and a custom
domain require a separate user purchase decision. Reference documentation:

- https://decapcms.org/docs/github-backend/
- https://decapcms.org/docs/editorial-workflows/
- https://developers.cloudflare.com/workers/platform/pricing/

## Acceptance

Test anonymous access, the owner's login, a different GitHub user, invalid/expired
OAuth state, wrong popup origin, denied write attempts, successful content changes,
uploaded-image paths, bilingual articles and the final deployed website. An exposed
admin page is acceptable; an exposed write credential or unauthorized write is not.
