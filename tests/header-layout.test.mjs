import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner navigation additions wrap as whole items instead of splitting labels", async () => {
	const header = await readFile(
		new URL("../src/components/layout/Header.astro", import.meta.url),
		"utf8",
	);

	assert.match(header, /\.nav\s*\{[^}]*flex-wrap:\s*wrap;[^}]*justify-content:\s*flex-end;/s);
	assert.match(header, /\.nav a\s*\{[^}]*flex:\s*0 0 auto;[^}]*white-space:\s*nowrap;/s);
});
