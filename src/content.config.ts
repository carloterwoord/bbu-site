import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const navGroups = ["primary", "secondary", "utility", "none"] as const;
const navFields = {
  navLabel: z.string().optional(),
  navGroup: z.enum(navGroups).default("none"),
  navOrder: z.number().int().default(0),
  dividerBefore: z.boolean().default(false),
  dividerAfter: z.boolean().default(false),
};
const reservedPageSlugs = new Set([
  "admin",
  "error",
]);

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    date: z.coerce.date(),
    excerpt: z.string(),
    author: z.string(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    coverImage: z.string().default(""),
    readTime: z.string().default(""),
    draft: z.boolean().default(false),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/authors" }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    bio: z.string(),
    avatar: z.string().default(""),
    socialLinks: z
      .array(
        z.object({
          label: z.string(),
          url: z.string(),
        })
      )
      .default([]),
  }),
});

const categories = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/categories" }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    description: z.string().default(""),
    headerImage: z.string().default(""),
    ...navFields,
    icon: z.string().default("category"),
  }),
});

const tags = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/tags" }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    description: z.string().default(""),
    headerImage: z.string().default(""),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: "Use lowercase letters, numbers, and hyphens only.",
      })
      .refine((slug) => !reservedPageSlugs.has(slug), {
        message: "This slug is reserved by a system route.",
      }),
    excerpt: z.string().default(""),
    showHeader: z.boolean().default(true),
    showTitle: z.boolean().default(true),
    showExcerpt: z.boolean().default(true),
    ...navFields,
    icon: z.string().default("home"),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  posts,
  authors,
  categories,
  tags,
  pages,
};
