# Owner-only editing

Status: owner-only requirements and repository access checked. A bilingual admin
entry page is implemented; its login control is disabled. The actual editor and
authentication service are not yet deployed.

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

Actual login/publishing requires a Cloudflare account deployment and registration
of the owner's GitHub OAuth application. Account ownership, service URL and OAuth
registration have not yet been provided. Do not present an unconfigured admin as
a functioning editor or claim owner-only protection without end-to-end validation.

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
