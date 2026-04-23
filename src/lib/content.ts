import { getCollection, type CollectionEntry } from "astro:content";
import { withBase } from "./paths";

type PostEntry = CollectionEntry<"posts">;
type AuthorEntry = CollectionEntry<"authors">;
type CategoryEntry = CollectionEntry<"categories">;

export type ResolvedPost = {
  entry: PostEntry;
  author: AuthorEntry | null;
  categories: CategoryEntry[];
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
