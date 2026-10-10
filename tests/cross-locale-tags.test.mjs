import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("tag indexes and archives aggregate posts across locales", async () => {
	const [indexPage, englishArchive, chineseArchive] = await Promise.all([
		readSource("src/components/pages/TagIndexPage.astro"),
		readSource("src/pages/tags/[tag].astro"),
		readSource("src/pages/zh/tags/[tag].astro"),
	]);

	for (const source of [indexPage, englishArchive, chineseArchive]) {
		assert.match(source, /getAllPosts/);
		assert.doesNotMatch(source, /getPostsForLocale/);
	}
});

test("mixed-locale post lists link each post to its own locale route", async () => {
	const postList = await readSource("src/components/blog/PostList.astro");

	assert.match(postList, /localizedPath\(postLocaleFromId\(p\.id\)/);
	assert.match(postList, /formatRailDate\(getPostSortDate\(p\), postLocaleFromId\(p\.id\)\)/);
});

test("home and blog archives aggregate posts across locales", async () => {
	const [homePage, englishArchive, chineseArchive] = await Promise.all([
		readSource("src/components/pages/HomePage.astro"),
		readSource("src/pages/posts/[...page].astro"),
		readSource("src/pages/zh/posts/[...page].astro"),
	]);

	for (const source of [homePage, englishArchive, chineseArchive]) {
		assert.match(source, /getAllPosts/);
		assert.doesNotMatch(source, /getPostsForLocale/);
	}
	assert.match(homePage, /localizedPath\(featuredLocale, `\/posts\//);
});
