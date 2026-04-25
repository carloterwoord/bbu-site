import {
  getAuthorHref,
  getAuthors,
  getCategories,
  getCategoryHref,
  getPageHref,
  getPostHref,
  getPublishedPages,
  getPublishedPosts,
  getResolvedTags,
  getTagHref,
} from "../lib/content";
import { siteUrl } from "../lib/site";

type SitemapEntry = {
  loc: string;
  lastmod?: Date;
};

const absoluteUrl = (path: string) => new URL(path, siteUrl).toString();

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const renderUrl = ({ loc, lastmod }: SitemapEntry) => `
  <url>
    <loc>${escapeXml(loc)}</loc>${
      lastmod ? `\n    <lastmod>${lastmod.toISOString()}</lastmod>` : ""
    }
  </url>`;

export async function GET() {
  const [posts, pages, categories, authors, tags] = await Promise.all([
    getPublishedPosts(),
    getPublishedPages(),
    getCategories(),
    getAuthors(),
    getResolvedTags(),
  ]);

  const entries = new Map<string, SitemapEntry>();
  const addEntry = (entry: SitemapEntry) => entries.set(entry.loc, entry);

  for (const page of pages) {
    addEntry({ loc: absoluteUrl(getPageHref(page.data.slug)) });
  }

  for (const post of posts) {
    addEntry({
      loc: absoluteUrl(getPostHref(post.data.slug)),
      lastmod: post.data.date,
    });
  }

  for (const category of categories) {
    addEntry({ loc: absoluteUrl(getCategoryHref(category.data.slug)) });
  }

  for (const author of authors) {
    addEntry({ loc: absoluteUrl(getAuthorHref(author.data.slug)) });
  }

  for (const tag of tags) {
    addEntry({ loc: absoluteUrl(getTagHref(tag.slug)) });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from(entries.values()).map(renderUrl).join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
