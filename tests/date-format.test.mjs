import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("all visible date helpers use the shared M/D/YYYY formatter", async () => {
	const source = await readFile(new URL("../src/utils/date.ts", import.meta.url), "utf8");

	assert.match(source, /new Intl\.DateTimeFormat\("en-US"/);
	for (const helper of [
		"formatRailDate",
		"formatStampDate",
		"formatBylineDate",
		"formatEyebrowDate",
	]) {
		assert.match(source, new RegExp(`function ${helper}\\([^}]+return formatNumericDate\\(date\\);`, "s"));
	}
	assert.doesNotMatch(source, /month: "(?:short|long)"/);
});
