import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("article editor records publication time, not only the calendar date", async () => {
	const editor = await readFile(new URL("src/components/ContentEditor.astro", root), "utf8");
	const script = await readFile(new URL("src/scripts/content-editor.ts", root), "utf8");
	assert.match(editor, /type="datetime-local"/);
	assert.match(script, /publishDate:\s*new Date\(input\("publishDate"\)\.value\)\.toISOString\(\)/);
});

test("same-day posts are ordered by their publication timestamps", async () => {
	const open = await readFile(new URL("src/content/post/zh/open_the_gate.md", root), "utf8");
	const autograd = await readFile(new URL("src/content/post/zh/topo-autograd.md", root), "utf8");
	const timestamp = (source) => new Date(source.match(/publishDate:\s*["']([^"']+)/)?.[1] ?? "");
	assert.ok(timestamp(autograd) > timestamp(open));

	const home = await readFile(new URL("dist/zh/index.html", root), "utf8");
	assert.ok(home.indexOf("拓扑排序的自动微分") < home.indexOf("OPEN THE G☆TE!!!"));
});
