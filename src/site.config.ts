import type { SiteConfig } from "@/types";
import type { AstroExpressiveCodeOptions } from "astro-expressive-code";
import settings from "./data/site-settings.json";

export const siteConfig: SiteConfig = {
	author: "MisumiUika626",
	date: {
		locale: "en-US",
		options: {
			day: "numeric",
			month: "short",
			year: "numeric",
		},
	},
	description:
		`${settings.title} — a bilingual personal blog.`,
	lang: "en-US",
	ogLocale: "en_US",
	sortPostsByUpdatedDate: false,
	title: settings.title,
	hideThemeCredit: false,
	profile: {
		name: "MisumiUika626",
		github: "https://github.com/MisumiUika626",
	},
	// Uncomment & fill in to enable Giscus comments on every post.
	// comments: {
	// 	repo: "your-handle/your-repo",
	// 	repoId: "...",
	// 	category: "General",
	// 	categoryId: "...",
	// },
	// Uncomment to enable analytics. Both providers load via Partytown.
	// analytics: {
	// 	googleAnalyticsId: "G-XXXXXXX",
	// 	goatcounterUrl: "https://your-handle.goatcounter.com/count",
	// },
};

export const menuLinks: { path: string; title: string }[] = [
	{
		path: "/",
		title: "Home",
	},
	{
		path: "/posts/",
		title: "Blog",
	},
	{
		path: "/projects/",
		title: "Projects",
	},
	{
		path: "/about/",
		title: "About",
	},
	{
		path: "/search/",
		title: "Search",
	},
];

export const expressiveCodeOptions: AstroExpressiveCodeOptions = {
	styleOverrides: {
		borderRadius: "4px",
		codeBackground: ({ theme }) => (theme.type === "light" ? "#f0e9d6" : "#151517"),
		codeFontFamily: "var(--font-mono)",
		codeFontSize: "clamp(0.8125rem, 0.75rem + 0.25vw, 0.875rem)",
		codeLineHeight: "1.7142857rem",
		codePaddingInline: "1rem",
		frames: {
			editorActiveTabBackground: ({ theme }) => (theme.type === "light" ? "#f0e9d6" : "#151517"),
			editorTabBarBackground: ({ theme }) => (theme.type === "light" ? "#ebe3cd" : "#0b0b0c"),
			frameBoxShadowCssValue: "none",
			terminalBackground: ({ theme }) => (theme.type === "light" ? "#f0e9d6" : "#151517"),
			terminalTitlebarBackground: ({ theme }) => (theme.type === "light" ? "#ebe3cd" : "#0b0b0c"),
		},
		uiFontFamily: "var(--font-mono)",
		uiLineHeight: "inherit",
	},
	themeCssSelector(theme, { styleVariants }) {
		if (styleVariants.length >= 2) {
			const baseTheme = styleVariants[0]?.theme;
			const altTheme = styleVariants.find((v) => v.theme.type !== baseTheme?.type)?.theme;
			if (theme === baseTheme || theme === altTheme) return `[data-theme='${theme.type}']`;
		}
		return `[data-theme="${theme.name}"]`;
	},
	themes: ["min-dark", "min-light"],
	useThemedScrollbars: false,
};
