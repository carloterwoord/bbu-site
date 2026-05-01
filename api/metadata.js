const metadataTimeoutMs = 4500;
const maxHtmlLength = 1_000_000;

function sendJson(response, statusCode, payload) {
    response.statusCode = statusCode;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader(
        "Cache-Control",
        statusCode === 200
            ? "s-maxage=86400, stale-while-revalidate=604800"
            : "no-store",
    );
    response.end(JSON.stringify(payload));
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

    return String(value || "").replace(
        /&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi,
        (match, entity) => {
            const normalizedEntity = entity.toLowerCase();
            const codePoint = normalizedEntity.startsWith("#x")
                ? Number.parseInt(normalizedEntity.slice(2), 16)
                : normalizedEntity.startsWith("#")
                  ? Number.parseInt(normalizedEntity.slice(1), 10)
                  : null;

            if (codePoint !== null) {
                return Number.isFinite(codePoint)
                    ? String.fromCodePoint(codePoint)
                    : match;
            }

            return namedEntities[normalizedEntity] ?? match;
        },
    );
}

function normalizeMetadataValue(value) {
    return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}

function getTagAttributes(tag) {
    const attributes = {};
    const attributePattern =
        /([^\s=<>"']+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

    for (const match of tag.matchAll(attributePattern)) {
        attributes[match[1].toLowerCase()] = normalizeMetadataValue(
            match[2] ?? match[3] ?? match[4] ?? "",
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

function getJsonLdImageCandidate(value) {
    if (!value) return "";
    if (typeof value === "string") return value;

    if (Array.isArray(value)) {
        for (const item of value) {
            const candidate = getJsonLdImageCandidate(item);
            if (candidate) return candidate;
        }
        return "";
    }

    if (typeof value !== "object") return "";

    for (const key of [
        "url",
        "contentUrl",
        "thumbnailUrl",
        "image",
        "thumbnail",
        "primaryImageOfPage",
    ]) {
        const candidate = getJsonLdImageCandidate(value[key]);
        if (candidate) return candidate;
    }

    return "";
}

function getJsonLdImage(html, url) {
    const scriptPattern =
        /<script\b(?=[^>]*type=["']?application\/ld\+json["']?)[^>]*>([\s\S]*?)<\/script>/gi;

    for (const match of html.matchAll(scriptPattern)) {
        try {
            const data = JSON.parse(decodeHtmlEntities(match[1]).trim());
            const image = resolveMetadataUrl(getJsonLdImageCandidate(data), url);
            if (image) return image;
        } catch {
            /* Ignore malformed structured data. */
        }
    }

    return "";
}

function extractMetadata(html, url) {
    const title =
        getMetaContent(html, ["og:title", "twitter:title"]) ||
        getTitleContent(html);
    const description = getMetaContent(html, [
        "og:description",
        "twitter:description",
        "description",
    ]);
    const image =
        resolveMetadataUrl(
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
            url,
        ) || getJsonLdImage(html, url);

    return {
        title,
        description,
        image,
    };
}

function isPrivateIPv4(hostname) {
    const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
        return false;
    }

    const [first, second] = parts;
    return (
        first === 0 ||
        first === 10 ||
        first === 127 ||
        (first === 169 && second === 254) ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168)
    );
}

function isBlockedHostname(hostname) {
    const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

    return (
        normalized === "localhost" ||
        normalized === "::1" ||
        normalized.endsWith(".localhost") ||
        normalized.endsWith(".local") ||
        isPrivateIPv4(normalized)
    );
}

async function readHtml(response) {
    const reader = response.body?.getReader();
    if (!reader) return (await response.text()).slice(0, maxHtmlLength);

    const decoder = new TextDecoder();
    let html = "";

    while (html.length < maxHtmlLength) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
    }

    html += decoder.decode();
    reader.cancel().catch(() => {});
    return html.slice(0, maxHtmlLength);
}

export default async function handler(request, response) {
    const requestUrl = new URL(
        request.url || "/api/metadata",
        `https://${request.headers.host || "localhost"}`,
    );
    const targetUrlValue = requestUrl.searchParams.get("url");

    if (!targetUrlValue) {
        return sendJson(response, 400, {});
    }

    let targetUrl;
    try {
        targetUrl = new URL(targetUrlValue);
    } catch {
        return sendJson(response, 400, {});
    }

    if (
        !["http:", "https:"].includes(targetUrl.protocol) ||
        isBlockedHostname(targetUrl.hostname)
    ) {
        return sendJson(response, 400, {});
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), metadataTimeoutMs);

    try {
        const upstream = await fetch(targetUrl.href, {
            headers: {
                Accept: "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
                "User-Agent":
                    "Mozilla/5.0 (compatible; BuiltByUnderdogsBot/1.0; +https://www.buildbyunderdogs.com)",
            },
            redirect: "follow",
            signal: controller.signal,
        });

        if (!upstream.ok) {
            return sendJson(response, 200, {});
        }

        const contentType = upstream.headers.get("content-type") || "";
        if (contentType && !contentType.toLowerCase().includes("text/html")) {
            return sendJson(response, 200, {});
        }

        return sendJson(
            response,
            200,
            extractMetadata(await readHtml(upstream), targetUrl),
        );
    } catch {
        return sendJson(response, 200, {});
    } finally {
        clearTimeout(timeout);
    }
}
