import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { gzipSync } from "node:zlib";

const siteOrigin = "https://misumiuika626.github.io";
const basePath = "/akn20";

async function readPage(path) {
	return readFile(new URL(`../dist${path}index.html`, import.meta.url), "utf8");
}

async function readBuiltAsset(href) {
	const path = href.startsWith(basePath) ? href.slice(basePath.length) : href;
	return readFile(new URL(`../dist${path}`, import.meta.url));
}

async function readSharedStyles(html) {
	const shared = linkAttributes(html).find(({ href, rel }) => rel === "stylesheet" && /\/_astro\/Base\.[^/]+\.css$/u.test(href));
	if (shared) return (await readBuiltAsset(shared.href)).toString();
	return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(([, css]) => css).join("\n");
}

function elementAttributes(html, tagName) {
	return [...html.matchAll(new RegExp(`<${tagName}\\b([^>]*)>`, "gi"))].map(([, source]) =>
		Object.fromEntries(
			[...source.matchAll(/([:\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map(
				([, name, doubleQuoted, singleQuoted, unquoted]) => [
					name.toLowerCase(),
					doubleQuoted ?? singleQuoted ?? unquoted ?? "",
				],
			),
		),
	);
}

function linkAttributes(html) {
	return elementAttributes(html, "link");
}

function languageAlternates(html) {
	return linkAttributes(html)
		.filter((attributes) => attributes.rel === "alternate" && attributes.hreflang)
		.map(({ href, hreflang }) => [hreflang, href]);
}

test("Showcase language variants identify each other to search engines", async () => {
	const expected = [
		["en", `${siteOrigin}${basePath}/projects/`],
		["zh-CN", `${siteOrigin}${basePath}/zh/projects/`],
		["x-default", `${siteOrigin}${basePath}/projects/`],
	];

	for (const path of ["/projects/", "/zh/projects/"]) {
		const html = await readPage(path);
		assert.deepEqual(languageAlternates(html), expected);
	}
});

test("Every paired static page family publishes language alternates", async () => {
	for (const route of ["/", "/about/", "/posts/", "/tags/", "/projects/"]) {
		const expected = [
			["en", `${siteOrigin}${basePath}${route}`],
			["zh-CN", `${siteOrigin}${basePath}/zh${route}`],
			["x-default", `${siteOrigin}${basePath}${route}`],
		];

		for (const localizedRoute of [route, `/zh${route}`]) {
			const html = await readPage(localizedRoute);
			assert.deepEqual(languageAlternates(html), expected, localizedRoute);
		}
	}
});

test("The sitemap groups localized Showcase URLs", async () => {
	const sitemap = await readFile(new URL("../dist/sitemap-0.xml", import.meta.url), "utf8");
	const englishUrl = `${siteOrigin}${basePath}/projects/`;
	const chineseUrl = `${siteOrigin}${basePath}/zh/projects/`;

	for (const pageUrl of [englishUrl, chineseUrl]) {
		const entry = sitemap.match(new RegExp(`<url><loc>${pageUrl}</loc>(.*?)</url>`))?.[1];
		assert.ok(entry, `missing sitemap entry for ${pageUrl}`);
		assert.match(entry, new RegExp(`<xhtml:link[^>]+hreflang="en"[^>]+href="${englishUrl}"`));
		assert.match(entry, new RegExp(`<xhtml:link[^>]+hreflang="zh-CN"[^>]+href="${chineseUrl}"`));
	}
});

test("Showcase routes preserve localized content, navigation, and canonical URLs", async () => {
	const cases = [
		{
			path: "/projects/",
			navigationHref: `${basePath}/projects/`,
			canonicalHref: `${siteOrigin}${basePath}/projects/`,
			text: "Projects",
		},
		{
			path: "/zh/projects/",
			navigationHref: `${basePath}/zh/projects/`,
			canonicalHref: `${siteOrigin}${basePath}/zh/projects/`,
			text: "项目",
		},
	];

	for (const { path, navigationHref, canonicalHref, text } of cases) {
		const html = await readPage(path);
		const links = linkAttributes(html);
		const navigationLinks = elementAttributes(html, "a");
		assert.ok(
			navigationLinks.some(({ href }) => href === navigationHref),
			`${path} navigation`,
		);
		assert.ok(
			links.some(({ href, rel }) => href === canonicalHref && rel === "canonical"),
			`${path} canonical`,
		);
		assert.match(html, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
	}
});

test("Home pages report the total number of Showcase projects", async () => {
	const englishHome = await readPage("/");
	const chineseHome = await readPage("/zh/");

	assert.doesNotMatch(englishHome, /View all \d+ projects? →/);
	assert.doesNotMatch(chineseHome, /查看全部 \d+ 个项目 →/);
});

test("Home pages load only their locale-specific Maple stylesheet", async () => {
	const englishHome = await readPage("/");
	const chineseHome = await readPage("/zh/");
	const englishFonts = linkAttributes(englishHome).filter(
		(attributes) => attributes["data-font-locale"],
	);
	const chineseFonts = linkAttributes(chineseHome).filter(
		(attributes) => attributes["data-font-locale"],
	);

	assert.equal(englishFonts.length, 1);
	assert.equal(chineseFonts.length, 1);
	assert.equal(englishFonts[0]["data-font-locale"], "en");
	assert.equal(chineseFonts[0]["data-font-locale"], "zh");
	assert.notEqual(englishFonts[0].href, chineseFonts[0].href);
});

test("All pages preload the shared Inter LCP font", async () => {
	const englishHome = linkAttributes(await readPage("/"));
	const chineseHome = linkAttributes(await readPage("/zh/"));
	const interPreloads = (links) =>
		links.filter(
			({ as, href, rel }) =>
				rel === "preload" && as === "font" && href?.includes("inter-latin-wght-normal"),
		);

	assert.equal(interPreloads(englishHome).length, 1);
	assert.equal(interPreloads(chineseHome).length, 1);
});

test("The shared and English font stylesheets stay within their performance budgets", async () => {
	const englishLinks = linkAttributes(await readPage("/")).filter(
		({ rel }) => rel === "stylesheet",
	);
	const chineseLinks = linkAttributes(await readPage("/zh/")).filter(
		({ rel }) => rel === "stylesheet",
	);
	const sharedStyles = await readSharedStyles(await readPage("/"));
	const englishFonts = englishLinks.find(({ "data-font-locale": locale }) => locale === "en");
	const chineseFonts = chineseLinks.find(({ "data-font-locale": locale }) => locale === "zh");

	assert.ok(sharedStyles.includes("--theme-bg:"), "missing shared theme styles");
	assert.ok(englishFonts, "missing English font stylesheet");
	assert.ok(chineseFonts, "missing Chinese font stylesheet");
	const englishFontCss = (await readBuiltAsset(englishFonts.href)).toString();
	const chineseFontCss = (await readBuiltAsset(chineseFonts.href)).toString();
	const weights = (css) => [...new Set(css.match(/font-weight:\d+/gu) ?? [])].sort();

	assert.ok(Buffer.byteLength(sharedStyles) < 100 * 1024);
	assert.ok(Buffer.byteLength(englishFontCss) < 8 * 1024);
	// CJK font CSS contains many repetitive unicode-range declarations. Keep a
	// generous raw-size guard, but budget the gzip transfer size users receive.
	assert.ok(Buffer.byteLength(chineseFontCss) < 800 * 1024);
	assert.ok(gzipSync(chineseFontCss).byteLength < 400 * 1024);
	assert.match(englishFontCss, /font-family:Maple Mono[;}]/u);
	assert.doesNotMatch(englishFontCss, /Maple Mono CN/u);
	assert.deepEqual(weights(englishFontCss), ["font-weight:400", "font-weight:500"]);
	assert.match(chineseFontCss, /font-family:Maple Mono CN[;}]/u);
	assert.match(chineseFontCss, /font-family:["']?Noto Sans SC Variable/u);
	assert.deepEqual(weights(chineseFontCss), [
		"font-weight:100",
		"font-weight:300",
		"font-weight:400",
		"font-weight:500",
	]);
	assert.ok(englishLinks.every(({ href }) => !/BlogPost|\/ec\./u.test(href)));
});

test("Production CSS preserves responsive layout breakpoints", async () => {
	const sharedStyles = await readSharedStyles(await readPage("/"));
	assert.match(sharedStyles, /@media\s*\((?:max-width:\s*720px|width<=720px)\)/u);
	assert.match(sharedStyles, /@media\s*\((?:max-width:\s*420px|width<=420px)\)/u);
});

test("About routes render their localized Markdown documents", async () => {
	const englishAbout = await readPage("/about/");
	const chineseAbout = await readPage("/zh/about/");

	assert.match(englishAbout, /About/);
	assert.match(chineseAbout, /关于/);
	assert.doesNotMatch(englishAbout, /a place for technical notes/);
	assert.doesNotMatch(chineseAbout, /用来记录技术笔记/);
});

test("Legacy post URLs remain valid, non-indexed redirect documents", async () => {
	const cases = [
		{
			legacyPath: "/posts/designing-a-visual-system/",
			destination: `${basePath}/zh/posts/`,
		},
		{
			legacyPath: "/posts/preparing-for-multilingual-content/",
			destination: `${basePath}/zh/posts/`,
		},
	];

	for (const { legacyPath, destination } of cases) {
		const html = await readPage(legacyPath);
		const htmlElements = elementAttributes(html, "html");
		const links = linkAttributes(html);
		const metas = elementAttributes(html, "meta");
		const anchors = elementAttributes(html, "a");

		assert.equal(htmlElements.length, 1, `${legacyPath} must have an <html> root`);
		assert.equal(htmlElements[0]["data-pagefind-ignore"], "all");
		assert.ok(
			metas.some(
				({ content, "http-equiv": httpEquiv }) =>
					httpEquiv === "refresh" && content === `0;url=${destination}`,
			),
			`${legacyPath} refresh target`,
		);
		assert.ok(metas.some(({ content, name }) => name === "robots" && content === "noindex"));
		assert.ok(
			links.some(({ href, rel }) => href === `${siteOrigin}${destination}` && rel === "canonical"),
			`${legacyPath} canonical`,
		);
		assert.ok(
			anchors.some(({ href }) => href === destination),
			`${legacyPath} fallback link`,
		);
	}
});
