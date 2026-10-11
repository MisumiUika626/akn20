import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("posts and projects expose a bidirectional many-to-many association", async () => {
	const schema = await readFile(new URL("src/content.config.ts", root), "utf8");
	const editor = await readFile(new URL("src/components/ContentEditor.astro", root), "utf8");
	const article = await readFile(new URL("src/layouts/BlogPost.astro", root), "utf8");
	const projects = await readFile(new URL("src/components/pages/ShowcasePage.astro", root), "utf8");
	assert.match(schema, /projects:\s*z\.array/);
	assert.match(editor, /name="projects"\s+multiple/);
	assert.match(article, /getProjectsByIds\(projects\)/);
	assert.match(projects, /post\.data\.projects\.includes\(item\.id\)/);
	assert.match(projects, /relatedPosts\.map/);
});
