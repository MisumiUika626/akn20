# V1 verification — 2026-10-10

All local setup, cache, diagnostic scripts and artifacts were written under
`/home/misumi/workspace/akn20`. Node 24.18.0 and pnpm 10.19.0 were installed
in ignored `.local-tools/`; package and browser caches live in `.local-cache/`.
Missing Chromium libraries were downloaded from Ubuntu and extracted there,
without installing system packages. Diagnostic logs/screenshots are in ignored `work/`.

## Baseline

The target remote already contained upstream Kami commit
`0da8e4f1cb53819d3154ed9c48da1cf943913cbf` when execution began.
It was cloned into the requested empty WSL directory; existing history was retained.
Frozen dependency installation, lint, type-check/build, Pagefind and all **26**
upstream tests passed before source customization.

## Initial V1 checks (before content was cleared)

`pnpm lint` and `pnpm test` passed. The latter performs type checking, static
build with `/akn20/`, Pagefind generation and **31** passing integration tests.
Astro diagnostics report zero errors/warnings with inherited deprecation hints.
Pagefind indexes five sample posts in two languages; Chinese stemming is unavailable,
but Chinese full-text queries were exercised successfully.

Chromium browser checks exercised English and Chinese:

- Desktop home and narrow layouts at 375px and 320px, without horizontal overflow.
- Theme switching and persistence after reload.
- Direct language switching between the paired welcome articles.
- English query `experiment` and Chinese query `实验`, each returning two real articles
  in the selected language with correct `/akn20/` result links.
- Search filters have localized category/tag names; no browser page exceptions.

The built-output link/asset audit checked **35 HTML pages and 908 internal references**,
with no missing targets or missing `/akn20/` prefixes. The 404 canonical URL points
to the actual `404.html` artifact and carries `noindex`.

The finished content is deliberately modest: this actual blog is the initial project,
with five clearly labeled sample posts and a factual GitHub-based About profile.
Upstream demo articles were replaced and are recoverable in the imported Git history.
Contact details, education/employment and further project claims await real material.

GitHub Pages was enabled with `build_type: workflow`. The existing deploy workflow runs
locked installation, type checking/build and search indexing before publication;
the original CI also runs lint/build. The integration suite was run locally. GitHub
rejected workflow updates because the OAuth credential lacks `workflow` scope, so
both upstream workflow files are retained unchanged.

## Publication

Source commit: `20c99ba45d151ce1f741af96df00932945b367a7`.

- [CI passed](https://github.com/MisumiUika626/akn20/actions/runs/38043691387).
- [Pages build and deployment passed](https://github.com/MisumiUika626/akn20/actions/runs/38043691427).
- [English site](https://misumiuika626.github.io/akn20/).
- [Chinese site](https://misumiuika626.github.io/akn20/zh/).

The same Chromium checks were then repeated against the **public** site. English
and Chinese mobile layouts, theme persistence, welcome-article translation switching,
and actual full-text search all passed without browser page exceptions. The public
Chinese home contains the expected V1 copy; the public Pagefind entry contains
English and Chinese indexes. Local source and remote `main` were synchronized.

## Content cleared at the owner's request

All five sample articles, sample project entries, About bodies and introductory
home copy were removed. Unused stock article images were removed as well. Site
branding, bilingual routes, theme controls, article layouts, content schemas,
RSS, categories, tags, Projects, About, search and automatic deployment remain.
Deleted content is recoverable from Git history.

The empty site passed lint, type-check/build and **28 tests**. Browser checks covered
all seven primary route families in both languages and the 375px layout. The
internal-reference audit checked **19 pages and 425 references**, with no failures.
Pagefind has a truthful empty marker and the search UI stays hidden until articles
exist. A separate disposable article fixture verified that normal indexing still
works when content is present. The content loader clears old cached posts even
when the content directory becomes empty.
