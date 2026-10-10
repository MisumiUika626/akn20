export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeMeta: Record<
	Locale,
	{ dateLocale: string; htmlLang: string; ogLocale: string }
> = {
	en: { dateLocale: "en-US", htmlLang: "en", ogLocale: "en_US" },
	zh: { dateLocale: "zh-CN", htmlLang: "zh-CN", ogLocale: "zh_CN" },
};

export const messages = {
	en: {
		backToTop: "Back to Top",
		by: "By",
		copied: "Copied",
		copyLink: "Copy link",
		draft: "Draft",
		categories: "Categories",
		search: "Search",
		homeDescription:
			"akn20 — a bilingual personal blog.",
		latest: "Latest",
		link: "Link",
		morePosts: "More posts",
		newer: "Newer",
		older: "Older",
		posts: "Blog",
		postsDescription: "Technical notes, learning logs, and small experiments.",
		poweredBy: "Powered by",
		share: "Share",
		showcase: "Projects",
		showcaseDescription: "Projects",
		tags: "Tags",
		updated: "Updated",
		viewAllPosts: (count: number) => `View all ${count} posts →`,
		viewAllProjects: (count: number) => `View all ${count} ${count === 1 ? "project" : "projects"} →`,
		webmentions: "Webmentions for this post",
		webmentionsCredit: "Responses powered by",
		writing: "Writing",
		nav: {
			"/": "Home",
			"/about/": "About",
			"/posts/": "Blog",
			"/projects/": "Projects",
			"/search/": "Search",
			"/admin/": "Edit",
		} as Record<string, string>,
		theme: { dark: "Dark", light: "Light", toggle: "Toggle theme" },
	},
	zh: {
		backToTop: "回到顶部",
		by: "作者",
		copied: "已复制",
		copyLink: "复制链接",
		draft: "草稿",
		categories: "分类",
		search: "搜索",
		homeDescription:
			"akn20 — 中英文个人博客。",
		latest: "最新",
		link: "链接",
		morePosts: "更多文章",
		newer: "较新文章",
		older: "较早文章",
		posts: "博客",
		postsDescription: "技术笔记、学习记录与小实验。",
		poweredBy: "基于",
		share: "分享",
		showcase: "项目",
		showcaseDescription: "项目",
		tags: "标签",
		updated: "更新于",
		viewAllPosts: (count: number) => `查看全部 ${count} 篇文章 →`,
		viewAllProjects: (count: number) => `查看全部 ${count} 个项目 →`,
		webmentions: "这篇文章的站外回应",
		webmentionsCredit: "回应数据由以下服务提供：",
		writing: "文章",
		nav: {
			"/": "首页",
			"/about/": "关于",
			"/posts/": "博客",
			"/projects/": "项目",
			"/search/": "搜索",
			"/admin/": "编辑",
		} as Record<string, string>,
		theme: { dark: "深色", light: "浅色", toggle: "切换主题" },
	},
} as const;

export function normalizeLocale(value?: string): Locale {
	return value?.toLowerCase() === "zh" ? "zh" : defaultLocale;
}

/** Adds the locale URL prefix. The default locale deliberately remains unprefixed. */
export function localizedPath(locale: Locale, path = "/"): string {
	const absolutePath = path.startsWith("/") ? path : `/${path}`;
	if (locale === defaultLocale) return absolutePath;
	return absolutePath === "/" ? `/${locale}/` : `/${locale}${absolutePath}`;
}

export function postLocaleFromId(id: string): Locale {
	const prefix = id.split("/", 1)[0];
	return locales.includes(prefix as Locale) && prefix !== defaultLocale
		? (prefix as Locale)
		: defaultLocale;
}

export function postSlugFromId(id: string): string {
	const prefix = id.split("/", 1)[0];
	return locales.includes(prefix as Locale) ? id.slice(prefix.length + 1) : id;
}
