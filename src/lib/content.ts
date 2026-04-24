import { getCollection, type CollectionEntry } from "astro:content";
import { withBase } from "./paths";

type PostEntry = CollectionEntry<"posts">;
type AuthorEntry = CollectionEntry<"authors">;
type CategoryEntry = CollectionEntry<"categories">;
type TagEntry = CollectionEntry<"tags">;

type NavGroup = "primary" | "secondary" | "utility";
type NavSource = {
  label: string;
  href: string;
  navLabel?: string;
  navGroup: NavGroup | "none";
  navOrder: number;
  dividerBefore: boolean;
  dividerAfter: boolean;
  icon?: string;
};

export type ResolvedPost = {
  entry: PostEntry;
  author: AuthorEntry | null;
  categories: CategoryEntry[];
};

export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  dividerBefore?: boolean;
  dividerAfter?: boolean;
};

const bySlug = <T extends { data: { slug: string } }>(items: T[]) =>
  new Map(items.map((item) => [item.data.slug, item]));

export type ResolvedTag = {
  slug: string;
  label: string;
  description: string;
  headerImage: string;
  entry: TagEntry | null;
};

export async function getAuthors() {
  return getCollection("authors");
}

export async function getCategories() {
  return getCollection("categories");
}

export async function getTags() {
  return getCollection("tags");
}

export async function getPublishedPosts() {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getPublishedPages() {
  const pages = await getCollection("pages", ({ data }) => !data.draft);
  return pages.sort((a, b) => {
    const navOrderDifference = a.data.navOrder - b.data.navOrder;
    if (navOrderDifference !== 0) return navOrderDifference;
    return a.data.title.localeCompare(b.data.title);
  });
}

export async function getResolvedPosts() {
  const [posts, authors, categories] = await Promise.all([
    getPublishedPosts(),
    getAuthors(),
    getCategories(),
  ]);

  const authorsBySlug = bySlug(authors);
  const categoriesBySlug = bySlug(categories);

  const resolved: ResolvedPost[] = posts.map((entry) => ({
    entry,
    author: authorsBySlug.get(entry.data.author) ?? null,
    categories: entry.data.categories
      .map((slug) => categoriesBySlug.get(slug))
      .filter((category): category is CategoryEntry => Boolean(category)),
  }));

  return resolved;
}

export async function getPostBySlug(slug: string) {
  const posts = await getPublishedPosts();
  return posts.find((post) => post.data.slug === slug) ?? null;
}

export async function getPageBySlug(slug: string) {
  const pages = await getPublishedPages();
  return pages.find((page) => page.data.slug === slug) ?? null;
}

export async function getResolvedPostBySlug(slug: string) {
  const [post, authors, categories] = await Promise.all([
    getPostBySlug(slug),
    getAuthors(),
    getCategories(),
  ]);

  if (!post) return null;

  const authorsBySlug = bySlug(authors);
  const categoriesBySlug = bySlug(categories);

  return {
    entry: post,
    author: authorsBySlug.get(post.data.author) ?? null,
    categories: post.data.categories
      .map((categorySlug) => categoriesBySlug.get(categorySlug))
      .filter((category): category is CategoryEntry => Boolean(category)),
  } satisfies ResolvedPost;
}

export async function getResolvedPostsByCategorySlug(categorySlug: string) {
  const posts = await getResolvedPosts();
  return posts.filter((post) =>
    post.entry.data.categories.includes(categorySlug)
  );
}

export async function getResolvedPostsByAuthorSlug(authorSlug: string) {
  const posts = await getResolvedPosts();
  return posts.filter((post) => post.entry.data.author === authorSlug);
}

export async function getResolvedPostsByTagSlug(tagSlug: string) {
  const posts = await getResolvedPosts();
  return posts.filter((post) =>
    post.entry.data.tags.some((tag) => getTaxonomySlug(tag) === tagSlug)
  );
}

export async function getResolvedTags() {
  const [posts, tags] = await Promise.all([getPublishedPosts(), getTags()]);
  const tagsBySlug = bySlug(tags);
  const resolvedTags = new Map<string, ResolvedTag>();

  for (const tag of tags) {
    resolvedTags.set(tag.data.slug, {
      slug: tag.data.slug,
      label: tag.data.name,
      description: tag.data.description,
      headerImage: tag.data.headerImage,
      entry: tag,
    });
  }

  for (const post of posts) {
    for (const tagValue of post.data.tags) {
      const trimmedTag = tagValue.trim();
      if (!trimmedTag) continue;

      const slug = getTaxonomySlug(trimmedTag);
      if (resolvedTags.has(slug)) continue;

      const tagEntry = tagsBySlug.get(slug) ?? null;
      resolvedTags.set(slug, {
        slug,
        label: tagEntry?.data.name ?? getTaxonomyLabel(trimmedTag),
        description: tagEntry?.data.description ?? "",
        headerImage: tagEntry?.data.headerImage ?? "",
        entry: tagEntry,
      });
    }
  }

  return Array.from(resolvedTags.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

export async function getResolvedPostsByYear(year: string) {
  const posts = await getResolvedPosts();
  return posts.filter((post) => String(post.entry.data.date.getFullYear()) === year);
}

export async function getResolvedPostsByYearMonth(year: string, month: string) {
  const monthNumber = Number(month);
  const posts = await getResolvedPostsByYear(year);

  return posts.filter(
    (post) => post.entry.data.date.getMonth() + 1 === monthNumber
  );
}

export async function getNavigationGroups() {
  const [pages, categories] = await Promise.all([
    getPublishedPages(),
    getCategories(),
  ]);

  const groups: Record<NavGroup, { source: NavSource; item: NavItem }[]> = {
    primary: [],
    secondary: [],
    utility: [],
  };

  for (const page of pages) {
    const source: NavSource = {
      label: page.data.title,
      href: getPageHref(page.data.slug),
      navLabel: page.data.navLabel,
      navGroup: page.data.navGroup,
      navOrder: page.data.navOrder,
      dividerBefore: page.data.dividerBefore,
      dividerAfter: page.data.dividerAfter,
      icon: page.data.icon || "home",
    };

    if (source.navGroup === "none") continue;
    groups[source.navGroup].push({
      source,
      item: {
        label: source.navLabel?.trim() || source.label,
        href: source.href,
        icon: source.icon,
        dividerBefore: source.dividerBefore,
        dividerAfter: source.dividerAfter,
      },
    });
  }

  for (const category of categories) {
    const source: NavSource = {
      label: category.data.name,
      href: getCategoryHref(category.data.slug),
      navLabel: category.data.navLabel,
      navGroup: category.data.navGroup,
      navOrder: category.data.navOrder,
      dividerBefore: category.data.dividerBefore,
      dividerAfter: category.data.dividerAfter,
      icon: category.data.icon || "category",
    };

    if (source.navGroup === "none") continue;
    groups[source.navGroup].push({
      source,
      item: {
        label: source.navLabel?.trim() || source.label,
        href: source.href,
        icon: source.icon,
        dividerBefore: source.dividerBefore,
        dividerAfter: source.dividerAfter,
      },
    });
  }

  return (["primary", "secondary", "utility"] as const).map((group) =>
    groups[group]
      .sort((a, b) => {
        const navOrderDifference = a.source.navOrder - b.source.navOrder;
        if (navOrderDifference !== 0) return navOrderDifference;
        return a.source.label.localeCompare(b.source.label);
      })
      .map(({ item }) => item)
  );
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getPostHref(slug: string) {
  return withBase(`/post/${slug}/`);
}

export function getTaxonomySlug(value: string) {
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

export function getTaxonomyLabel(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  return trimmedValue
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getTagHref(tag: string) {
  return withBase(`/tag/${getTaxonomySlug(tag)}`);
}

export function getCategoryHref(slug: string) {
  return withBase(`/category/${slug}`);
}

export function getAuthorHref(slug: string) {
  return withBase(`/author/${slug}`);
}

export function getArchiveYearHref(year: string | number) {
  return withBase(`/archive/${year}`);
}

export function getArchiveMonthHref(year: string | number, month: string | number) {
  return withBase(`/archive/${year}/${String(month).padStart(2, "0")}`);
}

export function getResultsHref() {
  return withBase("/results");
}

export function getPageHref(slug: string) {
  if (slug === "home") return withBase("/");
  return withBase(`/${slug}`);
}
