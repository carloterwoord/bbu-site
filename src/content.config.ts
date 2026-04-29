import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const navGroups = ["primary", "secondary", "utility", "none"] as const;
const structuredDataTypes = ["BlogPosting", "Article", "NewsArticle"] as const;
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

function normalizeSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "untitled";
}

const defaultPostSeo = {
  title: "",
  description: "",
  canonicalUrl: "",
  keywords: [],
  noindex: false,
  nofollow: false,
  openGraphTitle: "",
  openGraphDescription: "",
  openGraphImage: "",
  openGraphImageAlt: "",
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: "",
  twitterImageAlt: "",
  geoSummary: "",
  geoKeyTakeaways: [],
  faq: [],
  structuredDataType: "BlogPosting" as const,
};

const postSeoSchema = z
  .object({
    title: z.string().default(""),
    description: z.string().default(""),
    canonicalUrl: z.string().default(""),
    keywords: z.array(z.string()).default([]),
    noindex: z.boolean().default(false),
    nofollow: z.boolean().default(false),
    openGraphTitle: z.string().default(""),
    openGraphDescription: z.string().default(""),
    openGraphImage: z.string().default(""),
    openGraphImageAlt: z.string().default(""),
    twitterTitle: z.string().default(""),
    twitterDescription: z.string().default(""),
    twitterImage: z.string().default(""),
    twitterImageAlt: z.string().default(""),
    geoSummary: z.string().default(""),
    geoKeyTakeaways: z.array(z.string()).default([]),
    faq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      )
      .default([]),
    structuredDataType: z.enum(structuredDataTypes).default("BlogPosting"),
  })
  .default(defaultPostSeo);

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z
    .object({
      title: z.string(),
      slug: z.string().default(""),
      date: z.coerce.date(),
      excerpt: z.string(),
      author: z.string(),
      categories: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      coverImage: z.string().default(""),
      coverImageAlt: z.string().default(""),
      readTime: z.string().default(""),
      showTableOfContents: z.boolean().default(true),
      showRelatedPosts: z.boolean().default(true),
      relatedPostsHeading: z.string().default("Related posts"),
      relatedPosts: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      seo: postSeoSchema,
    })
    .transform((data) => ({
      ...data,
      slug: normalizeSlug(data.slug || data.title),
    })),
});

const authors = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/authors" }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    bio: z.string(),
    avatar: z.string().default(""),
    avatarAlt: z.string().default(""),
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
    headerImageAlt: z.string().default(""),
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
    headerImageAlt: z.string().default(""),
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
