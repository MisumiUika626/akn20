import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("cached pages carry their layout styles without depending on deleted CSS hashes", async () => {
	for (const path of ["/", "/zh/", "/admin/", "/zh/admin/"]) {
		const html = await readFile(new URL(`../dist${path}index.html`, import.meta.url), "utf8");
		const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(([, css]) => css).join("\n");
		assert.ok(styles.includes("--theme-bg:"), `${path} must carry the theme styles in its HTML`);
		assert.ok(styles.includes(".site-header"), `${path} must carry the header layout`);
		assert.doesNotMatch(html, /<link\b[^>]*href=[^>]*\/_astro\/Base\.[^/\s"<>]+\.css/);
	}
});
