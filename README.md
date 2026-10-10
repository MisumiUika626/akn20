# akn20

A bilingual technical notebook built on [Astro Kami](https://github.com/automann/astro-kami).

- Website: [misumiuika626.github.io/akn20](https://misumiuika626.github.io/akn20/)
- 中文首页：[技术笔记](https://misumiuika626.github.io/akn20/zh/)
- Repository: [MisumiUika626/akn20](https://github.com/MisumiUika626/akn20)

## Local development

Use Node **24** (`.nvmrc`) and pnpm **10.19.0** (`packageManager`).
The WSL checkout is `/home/misumi/workspace/akn20`.

```sh
cd /home/misumi/workspace/akn20
pnpm install --frozen-lockfile
pnpm dev
```

In the current workspace, local Node/pnpm are also available without changing
global tools. Their dependencies and caches are ignored by Git:

```sh
export PATH="$PWD/.local-tools/node_modules/.bin:$PATH"
export XDG_CACHE_HOME="$PWD/.local-cache"
export TMPDIR="$PWD/.local-cache/tmp"
export ASTRO_TELEMETRY_DISABLED=1
pnpm dev
```

Development normally runs at `http://localhost:4321/`. To preview the actual
GitHub Pages subpath and production search:

```sh
BASE_PATH=/akn20 pnpm build
BASE_PATH=/akn20 pnpm preview
# Open http://localhost:4321/akn20/
```

## V1 features

- Minimal academic/editorial home, responsive layout, light and dark themes.
- English `/` and Chinese `/zh/`, including navigation, About and Projects.
- Blog `/posts/`, category and tag archives, localized Pagefind full-text search.
- Markdown and MDX, code highlighting, KaTeX, RSS, sitemap and article cards.
- Article translations linked by `translationKey`, including differing filenames.
- Automatic GitHub Pages deployment; CI lint/build and local integration tests.

Search uses the **production** index generated during `pnpm build`. English and
Chinese are searched independently; switch the interface language to change corpus.
Published content is currently empty. Add articles when ready; empty Blog, categories,
tags and Projects routes remain available. Search shows an empty state until articles exist.

## Writing / 写作

English posts live in `src/content/post/`; Chinese posts in `src/content/post/zh/`.
Use `.md` or `.mdx`. The filename becomes the article URL.

```yaml
---
title: "Your title"
publishDate: 2026-10-10
description: "A concise summary of 10–160 characters."
category: Notes
tags: [algorithms, python]
translationKey: my-note
# draft: true
---
```

中文文章可使用 `category: 笔记` 和中文标签。分类是一个大方向，标签可以有多个。
中英文译文填写同一个 `translationKey`，两篇都发布后会自动关联。
同一语言不允许重复的 `translationKey`；缺少译文时，语言按钮进入另一语言的博客。
`draft: true` 会从生产页面、RSS、搜索和译文关联中排除文章。

## Personalization / 个性化

The header's **Edit / 编辑** entry opens `/admin/` (Chinese: `/zh/admin/`).
The entry page is live, but authentication is not configured and its login control
is disabled. It currently provides no write or publish operation. Connect the
owner-only authentication service before enabling an actual editor.

| File | Purpose |
| --- | --- |
| `src/site.config.ts` | Site title, author, optional contact links and integrations |
| `src/i18n/config.ts` | English and Chinese interface text |
| `src/data/showcase.ts` | Projects, localized descriptions, status badge and priority |
| `src/content/page/about.md` | English About |
| `src/content/page/zh/about.md` | 中文介绍 |
| `src/styles/global.css` | Shared palette and layout |
| `public/icon.svg` | Editable favicon source |

Run `node scripts/brand-assets.mjs` after editing the icon or social-card source.
About intentionally includes no invented employer, education, email or avatar.
Write your own articles and add project entries when ready. Both About documents
currently contain only metadata; their bodies are blank.
Comments, analytics and webmentions remain optional configuration in `site.config.ts`.

## Verification and deployment

```sh
pnpm lint
pnpm test
```

`pnpm test` type-checks, builds with `/akn20/`, generates the search index and runs
the built-output integration suite. Tests cover bilingual URLs and SEO, categories,
translation pairs and unpaired posts, search assets/indexes, responsive styles and
generated PNG dimensions. The upstream baseline passed all 26 tests before changes.

Pushes to `main` deploy through the retained `.github/workflows/deploy.yml`. The workflow
detects the project base with `actions/configure-pages`, installs frozen dependencies,
type-checks/builds and generates Pagefind before uploading `dist/`. The original CI
also runs lint and build. Run `pnpm test` locally before pushing: the original workflows
do not run the integration suite. Pages source must be **GitHub Actions**.
The Actions results and the public site are separate verification steps.

The current GitHub OAuth credential can push code but cannot modify workflow files
without the `workflow` scope. V1 therefore keeps both upstream workflow files unchanged.

## Attribution and license

MIT; retain [LICENSE](LICENSE). This project is based on Astro Kami by
[automann](https://github.com/automann), originally derived from
[astro-sienna](https://github.com/anjay-goel/astro-sienna) by Anjay Goel.
The imported history is preserved because the remote already contained Kami at setup.
