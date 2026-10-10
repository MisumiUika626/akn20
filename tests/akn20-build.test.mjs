import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import test from "node:test";

const base = "/akn20";
const origin = "https://misumiuika626.github.io";
const read = (path) => readFile(new URL(`../dist${path}index.html`, import.meta.url), "utf8");

test("Blog exposes working category, tag, search and project routes in both locales", async () => {
	for (const prefix of ["", "/zh"]) {
		const blog = await read(`${prefix}/posts/`);
		for (const route of ["categories", "tags", "search", "projects"]) {
			assert.ok(blog.includes(`${base}${prefix}/${route}/`), `${prefix} ${route} link`);
			await read(`${prefix}/${route}/`);
		}
		const category = prefix ? "笔记" : "Notes";
		const index = await read(`${prefix}/categories/`);
		assert.ok(index.includes(`${base}${prefix}/categories/${encodeURIComponent(category)}/`));
		const archive = await read(`${prefix}/categories/${category}/`);
		assert.match(archive, /hello-world/);
	}
});

test("Paired posts advertise real translations and switch directly to the translated article", async () => {
	for (const prefix of ["", "/zh"]) {
		const html = await read(`${prefix}/posts/hello-world/`);
		assert.ok(html.includes(`${origin}${base}/posts/hello-world/`));
		assert.ok(html.includes(`${origin}${base}/zh/posts/hello-world/`));
		assert.match(html, /hreflang=(?:"zh-CN"|zh-CN)/);
		const otherPrefix = prefix ? "" : "/zh";
		assert.ok(
			html.includes(`href=${base}${otherPrefix}/posts/hello-world/`) ||
				html.includes(`href="${base}${otherPrefix}/posts/hello-world/"`),
		);
	}
});

test("Untranslated posts switch to the other Blog without inventing an alternate", async () => {
	const html = await read("/posts/reading-notes/");
	assert.doesNotMatch(html, /rel=alternate[^>]*hreflang|hreflang[^>]*rel=alternate/);
	assert.ok(html.includes(`href=${base}/zh/posts/`) || html.includes(`href="${base}/zh/posts/"`));
});

test("Search has a base-aware UI and real indexes for both languages", async () => {
	for (const prefix of ["", "/zh"]) {
		const html = await read(`${prefix}/search/`);
		assert.ok(html.includes(`${base}/pagefind/pagefind-ui.js`));
		assert.ok(html.includes(`${base}/pagefind/pagefind-ui.css`));
		assert.ok(html.includes('id="search"') || html.includes("id=search"));
	}
	const entry = JSON.parse(
		await readFile(new URL("../dist/pagefind/pagefind-entry.json", import.meta.url)),
	);
	assert.ok(entry.languages.en.page_count > 0);
	assert.ok(entry.languages["zh-cn"].page_count > 0);
	await access(new URL("../dist/pagefind/pagefind-ui.js", import.meta.url));
});

test("Published pages do not contain example identity or unrelated demo projects", async () => {
	for (const route of ["/", "/zh/", "/about/", "/zh/about/", "/projects/", "/zh/projects/"]) {
		const html = await read(route);
		assert.doesNotMatch(
			html,
			/John Doe|john@example.com|github.com\/example|Example Inc|8.8k|Sample Project/,
		);
		assert.match(html, /akn20/);
	}
});
