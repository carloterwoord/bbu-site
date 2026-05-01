const standaloneUrlPattern = /^https?:\/\/[^\s<>"']+$/i;
const metadataCache = new Map();
const metadataTimeoutMs = 3000;

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function decodeHtmlEntities(value) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (match, entity) => {
    const normalizedEntity = entity.toLowerCase();
    if (normalizedEntity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(normalizedEntity.slice(2), 16));
    }
    if (normalizedEntity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(normalizedEntity.slice(1), 10));
    }

    return namedEntities[normalizedEntity] ?? match;
  });
}

function normalizeUrl(value) {
  const candidate = value.trim();
  if (!standaloneUrlPattern.test(candidate)) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function getTextContent(node) {
  if (!node) return "";
  if (node.type === "text") return node.value || "";
  if (!Array.isArray(node.children)) return "";

  return node.children.map(getTextContent).join("");
}

function getSingleMeaningfulChild(children = []) {
  const meaningfulChildren = children.filter((child) => {
    return child.type !== "text" || child.value.trim();
  });

  return meaningfulChildren.length === 1 ? meaningfulChildren[0] : null;
}

function getStandaloneUrl(node) {
  const child = getSingleMeaningfulChild(node.children);
  if (!child) return null;

  if (child.type === "text") {
    return normalizeUrl(child.value);
  }

  if (child.type === "link") {
    const url = normalizeUrl(child.url || "");
    const label = getTextContent(child).trim();

    return url && (!label || label === child.url) ? url : null;
  }

  return null;
}

function formatHost(url) {
  return url.hostname.replace(/^www\./i, "");
}

function getReadablePathTitle(url) {
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

function getDisplayUrl(url) {
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${formatHost(url)}${path}`;
}

function normalizeMetadataValue(value) {
  return decodeHtmlEntities(value || "").replace(/\s+/g, " ").trim();
}

function getTagAttributes(tag) {
  const attributes = {};
  const attributePattern =
    /([^\s=<>"']+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

  for (const match of tag.matchAll(attributePattern)) {
    attributes[match[1].toLowerCase()] = normalizeMetadataValue(
      match[2] ?? match[3] ?? match[4] ?? ""
    );
  }

  return attributes;
}

function getMetaContent(html, names) {
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

function getTitleContent(html) {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch ? normalizeMetadataValue(titleMatch[1]) : "";
}

function resolveMetadataUrl(value, baseUrl) {
  if (!value) return "";

  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

function extractMetadata(html, url) {
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

async function loadUrlMetadata(url) {
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

function getUrlMetadata(url) {
  if (!metadataCache.has(url.href)) {
    metadataCache.set(url.href, loadUrlMetadata(url));
  }

  return metadataCache.get(url.href);
}

function renderUrlCard(url, metadata = {}) {
  const href = url.href;
  const title = metadata.title || getReadablePathTitle(url) || formatHost(url);
  const displayUrl = getDisplayUrl(url);

  return [
    `<a class="url-card" data-url-card href="${escapeAttribute(href)}">`,
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

export default function remarkUrlCards() {
  return async (tree) => {
    if (!Array.isArray(tree.children)) return;

    tree.children = await Promise.all(tree.children.map(async (node) => {
      if (node.type !== "paragraph") return node;

      const url = getStandaloneUrl(node);
      if (!url) return node;
      const metadata = await getUrlMetadata(url);

      return {
        type: "html",
        value: renderUrlCard(url, metadata),
      };
    }));
  };
}
