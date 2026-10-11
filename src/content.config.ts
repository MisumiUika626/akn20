import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

function removeDupsAndLowerCase(array: string[]) {
	if (!array.length) return array;
	const lowercaseItems = array.map((str) => str.toLowerCase());
	const distinctItems = new Set(lowercaseItems);
	return Array.from(distinctItems);
}

const postFiles = glob({ pattern: "**/*.{md,mdx}", base: "./src/content/post" });
const post = defineCollection({
	loader: {
		...postFiles,
		async load(context) {
			// Empty globs must also remove previously cached articles.
			context.store.clear();
			await postFiles.load(context);
		},
	},
	schema: ({ image }) =>
		z.object({
			coverImage: z
				.object({
					alt: z.string(),
					src: image(),
				})
				.optional(),
			description: z.string().min(10).max(160),
			draft: z.boolean().default(false),
			category: z.string().trim().min(1).max(50).default("Notes"),
			projects: z.array(z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/)).default([]),
			translationKey: z.string().trim().min(1).optional(),
			ogImage: z.string().optional(),
			publishDate: z
				.string()
				.or(z.date())
				.transform((val) => new Date(val)),
			tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
			title: z.string().max(120),
			updatedDate: z
				.string()
				.optional()
				.transform((str) => (str ? new Date(str) : undefined)),
		}),
});

const page = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/page" }),
	schema: z.object({
		title: z.string().max(120),
		description: z.string().max(160).optional(),
	}),
});

export const collections = { post, page };
