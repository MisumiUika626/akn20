import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the wordmark owns home navigation and About is embedded in the hero", async () => {
	const [config, home] = await Promise.all([
		readSource("src/site.config.ts"),
		readSource("src/components/pages/HomePage.astro"),
	]);

	assert.doesNotMatch(config, /path:\s*"\/(?:about\/)?"/);
	assert.match(home, /getEntry\("page", aboutEntryId\)/);
	assert.match(home, /localizedAboutEntry\?\.body\?\.trim\(\)\s*\?\s*localizedAboutEntry\s*:\s*fallbackAboutEntry/);
	assert.match(home, /<AboutContent\s*\/>/);
	assert.doesNotMatch(home, /<h1>\{siteConfig\.title\}<\/h1>/);
});

test("the header exposes search and forwards its query to Pagefind", async () => {
	const [header, search] = await Promise.all([
		readSource("src/components/layout/Header.astro"),
		readSource("src/components/pages/SearchPage.astro"),
	]);

	assert.match(header, /<form class="header-search"[^>]+role="search">/);
	assert.match(header, /name="q" type="search"/);
	assert.match(search, /search\.triggerSearch\(query\)/);
});

test("the public header is Chinese-only until translation support is added", async () => {
	const [header, rootPage] = await Promise.all([
		readSource("src/components/layout/Header.astro"),
		readSource("src/pages/index.astro"),
	]);

	assert.doesNotMatch(header, /class="language-link"/);
	assert.doesNotMatch(header, /Switch to English/);
	assert.match(rootPage, /<HomePage locale="zh" \/>/);
});
