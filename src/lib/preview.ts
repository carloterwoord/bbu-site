const htmlEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  ldquo: '"',
  lsquo: "'",
  lt: "<",
  mdash: "-",
  nbsp: " ",
  ndash: "-",
  quot: '"',
  rdquo: '"',
  rsquo: "'",
};

const allowedTags = new Set([
  "b",
  "blockquote",
  "cite",
  "em",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "li",
  "mark",
  "ol",
  "p",
  "q",
  "section",
  "strong",
  "u",
  "ul",
]);

const allowedClasses = new Set([
  "highlight--blue",
  "highlight--green",
  "highlight--red",
  "highlight--yellow",
  "underline--dotted",
  "underline--red",
  "underline--wavy",
]);

const heavyPreviewContentPattern =
  /<(audio|button|details|embed|figure|form|iframe|img|input|picture|script|select|source|style|textarea|video)\b/i;
const standaloneUrlPattern = /^https?:\/\/[^\s<>"']+$/i;
const metadataCache = new Map<string, Promise<UrlCardMetadata>>();
const metadataTimeoutMs = 3000;

interface UrlCardMetadata {
  title?: string;
  description?: string;
  image?: string;
}

interface RenderedPreviewBlock {
  html: string;
  isUrlCard: boolean;
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (match, entity) => {
    const normalizedEntity = entity.toLowerCase();
    if (normalizedEntity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(normalizedEntity.slice(2), 16));
    }
    if (normalizedEntity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(normalizedEntity.slice(1), 10));
    }

    return htmlEntities[normalizedEntity] ?? match;
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeUrl(value: string) {
  const candidate = value.trim();
  if (!standaloneUrlPattern.test(candidate)) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function formatHost(url: URL) {
  return url.hostname.replace(/^www\./i, "");
}

function getReadablePathTitle(url: URL) {
  const segments = url.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const lastSegment = segments.at(-1);
  if (!lastSegment) return "";

  let decodedSegment = lastSegment;
  try {
    decodedSegment = decodeURIComponent(lastSegment);
  } catch {
    decodedSegment = lastSegment;
  }

  const title = decodedSegment
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return title ? title.charAt(0).toUpperCase() + title.slice(1) : "";
}

function getDisplayUrl(url: URL) {
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${formatHost(url)}${path}`;
}

function normalizeMetadataValue(value: string) {
  return decodeHtmlEntities(value || "").replace(/\s+/g, " ").trim();
}

function getTagAttributes(tag: string) {
  const attributes: Record<string, string> = {};
  const attributePattern =
    /([^\s=<>"']+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

  for (const match of tag.matchAll(attributePattern)) {
    attributes[match[1].toLowerCase()] = normalizeMetadataValue(
      match[2] ?? match[3] ?? match[4] ?? ""
    );
  }

  return attributes;
}

function getMetaContent(html: string, names: string[]) {
  const normalizedNames = new Set(names.map((name) => name.toLowerCase()));
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const attributes = getTagAttributes(tag);
    const name = (
      attributes.property ||
      attributes.name ||
      attributes.itemprop ||
      ""
    ).toLowerCase();

    if (normalizedNames.has(name) && attributes.content) {
      return attributes.content;
    }
  }

  return "";
}

function getTitleContent(html: string) {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch ? normalizeMetadataValue(titleMatch[1]) : "";
}

function resolveMetadataUrl(value: string | undefined, baseUrl: URL) {
  if (!value) return "";

  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

function extractMetadata(html: string, url: URL): UrlCardMetadata {
  const title =
    getMetaContent(html, ["og:title", "twitter:title"]) || getTitleContent(html);
  const description = getMetaContent(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
  const image = resolveMetadataUrl(
    getMetaContent(html, [
      "og:image",
      "og:image:url",
      "og:image:secure_url",
      "twitter:image",
      "twitter:image:src",
      "thumbnail",
      "thumbnailurl",
      "image",
    ]),
    url
  );

  return {
    title,
    description,
    image,
  };
}

async function loadUrlMetadata(url: URL): Promise<UrlCardMetadata> {
  if (typeof fetch !== "function") return {};

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), metadataTimeoutMs);

  try {
    const response = await fetch(url.href, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (compatible; BuiltByUnderdogsBot/1.0; +https://www.buildbyunderdogs.com)",
      },
      signal: controller.signal,
    });
    if (!response.ok) return {};

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.toLowerCase().includes("text/html")) {
      return {};
    }

    return extractMetadata(await response.text(), url);
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

function getUrlMetadata(url: URL) {
  if (!metadataCache.has(url.href)) {
    metadataCache.set(url.href, loadUrlMetadata(url));
  }

  return metadataCache.get(url.href) ?? Promise.resolve({});
}

function renderPreviewUrlCard(url: URL, metadata: UrlCardMetadata = {}) {
  const href = url.href;
  const title = metadata.title || getReadablePathTitle(url) || formatHost(url);
  const displayUrl = getDisplayUrl(url);

  return [
    `<a class="url-card url-card--preview" data-url-card href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">`,
    metadata.image
      ? `<span class="url-card-image"><img src="${escapeAttribute(metadata.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="origin"></span>`
      : "",
    '<span class="url-card-content">',
    `<span class="url-card-title">${escapeHtml(title)}</span>`,
    `<span class="url-card-url">${escapeHtml(displayUrl)}</span>`,
    metadata.description
      ? `<span class="url-card-description">${escapeHtml(metadata.description)}</span>`
      : "",
    "</span>",
    "</a>",
  ].join("");
}

function markdownInlineToHtml(value: string) {
  return value
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>");
}

function normalizeTag(match: string, tagName: string, attributes = "") {
  const tag = tagName.toLowerCase();
  const isClosingTag = /^<\//.test(match);

  if (!allowedTags.has(tag)) return "";
  if (isClosingTag) return `</${tag}>`;

  const classMatch = attributes.match(/\bclass\s*=\s*(["'])([^"']+)\1/i);
  const safeClasses = classMatch
    ? classMatch[2].split(/\s+/).filter((className) => allowedClasses.has(className))
    : [];

  return safeClasses.length > 0
    ? `<${tag} class="${safeClasses.join(" ")}">`
    : `<${tag}>`;
}

function sanitizeHtml(value: string) {
  const tagTokens: string[] = [];
  const withTagTokens = value.replace(
    /<\/?([a-z][a-z0-9-]*)([^<>]*)?>/gi,
    (match, tagName, attributes = "") => {
      const token = normalizeTag(match, tagName, attributes);
      if (!token) return " ";

      const tokenIndex = tagTokens.push(token) - 1;
      return `__PREVIEW_TAG_${tokenIndex}__`;
    }
  );

  const escapedHtml = escapeHtml(decodeHtmlEntities(withTagTokens));

  return normalizeWhitespace(escapedHtml)
    .replace(/__PREVIEW_TAG_(\d+)__/g, (_match, tokenIndex) => {
      return tagTokens[Number(tokenIndex)] ?? "";
    })
    .replace(/>\s+</g, "><");
}

function getPlainPreviewText(value: string) {
  return normalizeWhitespace(
    decodeHtmlEntities(value)
      .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^[>*+\-\d.\s]+/gm, "")
      .replace(/[*_~]+/g, "")
  );
}

function getMarkdownChunks(value: string) {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function getCandidateBlocks(source: string) {
  const blocks: string[] = [];
  const blockPattern =
    /<(section|blockquote|ul|ol|figure|iframe|details)\b[\s\S]*?<\/\1>/gi;
  let lastIndex = 0;

  for (const match of source.matchAll(blockPattern)) {
    const index = match.index ?? 0;
    blocks.push(...getMarkdownChunks(source.slice(lastIndex, index)));
    blocks.push(match[0].trim());
    lastIndex = index + match[0].length;
  }

  blocks.push(...getMarkdownChunks(source.slice(lastIndex)));

  return blocks;
}

function renderMarkdownList(block: string) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return "";

  const isUnordered = lines.every((line) => /^[-*+]\s+/.test(line));
  const isOrdered = lines.every((line) => /^\d+[.)]\s+/.test(line));

  if (!isUnordered && !isOrdered) return "";

  const tag = isOrdered ? "ol" : "ul";
  const items = lines
    .map((line) =>
      line.replace(isOrdered ? /^\d+[.)]\s+/ : /^[-*+]\s+/, "")
    )
    .map((item) => `<li>${sanitizeHtml(markdownInlineToHtml(item))}</li>`)
    .join("");

  return `<${tag}>${items}</${tag}>`;
}

function renderMarkdownBlockquote(block: string) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0 || !lines.every((line) => /^>\s?/.test(line))) {
    return "";
  }

  const quote = lines.map((line) => line.replace(/^>\s?/, "")).join(" ");

  return `<blockquote><p>${sanitizeHtml(markdownInlineToHtml(quote))}</p></blockquote>`;
}

async function renderPreviewBlock(block: string): Promise<RenderedPreviewBlock | null> {
  const trimmedBlock = block.trim();
  if (!trimmedBlock || heavyPreviewContentPattern.test(trimmedBlock)) return null;

  const standaloneUrl = normalizeUrl(trimmedBlock);
  if (standaloneUrl) {
    return {
      html: renderPreviewUrlCard(standaloneUrl, await getUrlMetadata(standaloneUrl)),
      isUrlCard: true,
    };
  }

  const headingMatch = trimmedBlock.match(/^(#{2,6})\s+(.+)$/);
  if (headingMatch) {
    const headingLevel = Math.min(headingMatch[1].length, 6);
    return {
      html: `<h${headingLevel}>${sanitizeHtml(
        markdownInlineToHtml(headingMatch[2])
      )}</h${headingLevel}>`,
      isUrlCard: false,
    };
  }

  const listHtml = renderMarkdownList(trimmedBlock);
  if (listHtml) {
    return {
      html: listHtml,
      isUrlCard: false,
    };
  }

  const blockquoteHtml = renderMarkdownBlockquote(trimmedBlock);
  if (blockquoteHtml) {
    return {
      html: blockquoteHtml,
      isUrlCard: false,
    };
  }

  if (/^<(section|blockquote|ul|ol|p|h[2-6])\b/i.test(trimmedBlock)) {
    return {
      html: sanitizeHtml(trimmedBlock),
      isUrlCard: false,
    };
  }

  return {
    html: `<p>${sanitizeHtml(markdownInlineToHtml(trimmedBlock))}</p>`,
    isUrlCard: false,
  };
}

function getPreviewBlockWeight(block: RenderedPreviewBlock) {
  return block.isUrlCard ? 2 : 1;
}

function selectPreviewBlocks(blocks: RenderedPreviewBlock[], maxBlocks: number) {
  const budget = Math.max(1, maxBlocks);
  const selectedBlocks: RenderedPreviewBlock[] = [];
  let usedBudget = 0;

  for (const block of blocks) {
    const blockWeight = getPreviewBlockWeight(block);
    if (selectedBlocks.length > 0 && usedBudget + blockWeight > budget) {
      break;
    }

    selectedBlocks.push(block);
    usedBudget += blockWeight;
  }

  return selectedBlocks;
}

export async function getPostPreviewHtml(body = "", fallbackHtml = "", maxBlocks = 3) {
  const source = body.trim() || fallbackHtml.trim();
  const blocks = (
    await Promise.all(getCandidateBlocks(source).map(async (block) => ({
      renderedBlock: await renderPreviewBlock(block),
      text: getPlainPreviewText(block),
    })))
  )
    .filter((block) => block.renderedBlock && block.text)
    .map((block) => block.renderedBlock as RenderedPreviewBlock);

  if (blocks.length === 0) return "";

  return selectPreviewBlocks(blocks, maxBlocks)
    .map((block) => block.html)
    .join("");
}
