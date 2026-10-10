import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const baseHeadUrl = new URL("../src/components/BaseHead.astro", import.meta.url);

test("BaseHead preloads the installed Inter font instead of removed Newsreader", async () => {
	const source = await readFile(baseHeadUrl, "utf8");

	assert.match(
		source,
		/@fontsource-variable\/inter\/files\/inter-latin-wght-normal\.woff2\?url/,
	);
	assert.doesNotMatch(source, /newsreader/i);
});
