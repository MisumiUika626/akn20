import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const files = await readdir("dist", { recursive: true });
let hasArticles = false;
for (const file of files.filter((file) => file.endsWith(".html"))) {
	const html = await readFile(`dist/${file}`, "utf8");
	if (/<[^>]+\bdata-pagefind-body(?:[\s=>])/.test(html)) {
		hasArticles = true;
		break;
	}
}

if (hasArticles) {
	const result = spawnSync("pagefind", ["--site", "dist"], { stdio: "inherit" });
	if (result.error) throw result.error;
	process.exitCode = result.status ?? 1;
} else {
	// Pagefind exits with an error on an empty corpus. Keep a truthful empty marker;
	// the search page intentionally does not load the UI until articles exist.
	await mkdir("dist/pagefind", { recursive: true });
	await writeFile("dist/pagefind/pagefind-entry.json", JSON.stringify({ languages: {} }));
	console.log("No published articles: search remains empty until content is added.");
}
