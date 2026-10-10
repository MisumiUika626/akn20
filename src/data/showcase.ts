import type { Locale } from "@/i18n/config";
import projects from "./projects.json";

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

export const showcase: ShowcaseItem[] = projects as ShowcaseItem[];

export function getShowcaseByPriority(): ShowcaseItem[] {
	return [...showcase].sort((a, b) => b.priority - a.priority);
}

export function getFeaturedShowcase(limit = 3): ShowcaseItem[] {
	return getShowcaseByPriority().slice(0, limit);
}
