import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const base = "/akn20";
const read = (path) => readFile(new URL(`../dist${path}index.html`, import.meta.url), "utf8");
const sources = await readdir(new URL("../src/content/post/", import.meta.url), { recursive: true });
const empty = !sources.some((file) => /\.mdx?$/.test(file));

test("Empty content preserves bilingual Blog, Projects, About and taxonomy routes", { skip: !empty }, async () => {
	for (const prefix of ["", "/zh"]) {
		const home = await read(`${prefix}/`);
		for (const route of ["posts", "projects", "about", "search", "categories", "tags"]) {
			await read(`${prefix}/${route}/`);
			assert.ok(home.includes(`${base}${prefix}/${route}/`), `${prefix} ${route} navigation`);
		}
		const blog = await read(`${prefix}/posts/`);
		assert.match(blog, prefix ? /0 篇文章/ : /0 posts/);
		const about = await read(`${prefix}/about/`);
		assert.match(about, /class=bio[^>]*>\s*<\/div>|class="bio"[^>]*>\s*<\/div>/);
		assert.doesNotMatch(home, /Think carefully|把问题写清楚|关注方向|Areas of interest/);
	}
});

test("No old sample articles or projects remain published", async () => {
	for (const route of ["/", "/zh/", "/projects/", "/zh/projects/", "/about/", "/zh/about/"]) {
		const html = await read(route);
		assert.doesNotMatch(html, /Sample article|示例文章|hello-world|writing-guide|本站的开源源码|This bilingual technical notebook/);
	}
});

test("Empty search has no indexed site chrome or unusable search UI", { skip: !empty }, async () => {
	for (const prefix of ["", "/zh"]) {
		const html = await read(`${prefix}/search/`);
		assert.match(html, prefix ? /暂无文章/ : /No articles yet/);
		assert.doesNotMatch(html, /pagefind-ui\.js/);
	}
	const index = JSON.parse(await readFile(new URL("../dist/pagefind/pagefind-entry.json", import.meta.url), "utf8"));
	assert.deepEqual(index.languages, {});
});
