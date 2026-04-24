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

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

function renderPreviewBlock(block: string) {
  const trimmedBlock = block.trim();
  if (!trimmedBlock || heavyPreviewContentPattern.test(trimmedBlock)) return "";

  const headingMatch = trimmedBlock.match(/^(#{2,6})\s+(.+)$/);
  if (headingMatch) {
    const headingLevel = Math.min(headingMatch[1].length, 6);
    return `<h${headingLevel}>${sanitizeHtml(
      markdownInlineToHtml(headingMatch[2])
    )}</h${headingLevel}>`;
  }

  const listHtml = renderMarkdownList(trimmedBlock);
  if (listHtml) return listHtml;

  const blockquoteHtml = renderMarkdownBlockquote(trimmedBlock);
  if (blockquoteHtml) return blockquoteHtml;

  if (/^<(section|blockquote|ul|ol|p|h[2-6])\b/i.test(trimmedBlock)) {
    return sanitizeHtml(trimmedBlock);
  }

  return `<p>${sanitizeHtml(markdownInlineToHtml(trimmedBlock))}</p>`;
}

export function getPostPreviewHtml(body = "", fallbackHtml = "", maxBlocks = 3) {
  const source = body.trim() || fallbackHtml.trim();
  const blocks = getCandidateBlocks(source)
    .map((block) => ({
      html: renderPreviewBlock(block),
      text: getPlainPreviewText(block),
    }))
    .filter((block) => block.html && block.text)
    .filter((block) => !/^https?:\/\//i.test(block.text));

  if (blocks.length === 0) return "";

  const previewBlockCount =
    blocks.length > maxBlocks ? maxBlocks : Math.max(1, blocks.length - 1);

  return blocks
    .slice(0, previewBlockCount)
    .map((block) => block.html)
    .join("");
}
