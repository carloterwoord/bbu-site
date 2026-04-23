import { getCollection, type CollectionEntry } from "astro:content";
import { withBase } from "./paths";

type PostEntry = CollectionEntry<"posts">;
type AuthorEntry = CollectionEntry<"authors">;
type CategoryEntry = CollectionEntry<"categories">;
type PageEntry = CollectionEntry<"pages">;

type NavGroup = "primary" | "secondary" | "utility";

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

export async function getAuthors() {
  return getCollection("authors");
}

export async function getCategories() {
  return getCollection("categories");
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

export async function getNavigationGroups() {
  const pages = await getPublishedPages();

  const groups: Record<NavGroup, { page: PageEntry; item: NavItem }[]> = {
    primary: [],
    secondary: [],
    utility: [],
  };

  for (const page of pages) {
    if (page.data.navGroup === "none") continue;
    const group = page.data.navGroup;
    groups[group].push({
      page,
      item: {
        label: page.data.navLabel?.trim() || page.data.title,
        href: getPageHref(page.data.slug),
        icon: page.data.icon || "home",
        dividerBefore: page.data.dividerBefore,
        dividerAfter: page.data.dividerAfter,
      },
    });
  }

  return (["primary", "secondary", "utility"] as const).map((group) =>
    groups[group]
      .sort((a, b) => {
        const navOrderDifference = a.page.data.navOrder - b.page.data.navOrder;
        if (navOrderDifference !== 0) return navOrderDifference;
        return a.page.data.title.localeCompare(b.page.data.title);
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
  return withBase(`/post/${slug}`);
}

export function getCategoryHref(slug: string) {
  return withBase(`/category/${slug}`);
}

export function getAuthorHref(slug: string) {
  return withBase(`/author/${slug}`);
}

export function getPageHref(slug: string) {
  if (slug === "home") return withBase("/");
  return withBase(`/${slug}`);
}
