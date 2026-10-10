import type { Locale } from "@/i18n/config";

export interface ShowcaseItem {
	name: string;
	href: string;
	stack: string;
	badge?: ShowcaseBadge;
	desc: Record<Locale, string>;
	/** Higher values appear first and are favored on the home page. */
	priority: number;
}

export interface ShowcaseBadge {
	icon?: "star";
	label: string;
}

export const showcase: ShowcaseItem[] = [
	{
		name: "akn20",
		href: "https://github.com/MisumiUika626/akn20",
		stack: "Astro · TypeScript · Pagefind",
		badge: { label: "V1" },
		desc: {
			en: "This bilingual technical notebook. Markdown and MDX, topic archives, full-text search, and GitHub Pages deployment, built on Astro Kami.",
			zh: "本站的开源源码：基于 Astro Kami 构建的双语技术博客，支持 Markdown 与 MDX、分类与标签、全文搜索和 GitHub Pages 部署。",
		},
		priority: 120,
	},
];

export function getShowcaseByPriority(): ShowcaseItem[] {
	return [...showcase].sort((a, b) => b.priority - a.priority);
}

export function getFeaturedShowcase(limit = 3): ShowcaseItem[] {
	return getShowcaseByPriority().slice(0, limit);
}
