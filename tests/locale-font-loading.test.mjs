import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Noto Sans SC is loaded only by the Chinese route stylesheet", async () => {
	const chineseFonts = await readFile(
		new URL("../src/styles/fonts/zh.css", import.meta.url),
		"utf8",
	);

	assert.match(chineseFonts, /@fontsource-variable\/noto-sans-sc\/wght\.css/);
});
