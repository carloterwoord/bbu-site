(() => {
    const cms = globalThis.CMS;
    if (!cms?.registerEditorComponent) return;

    const escapeHtml = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    const escapeAttribute = (value) =>
        escapeHtml(value).replace(/'/g, "&#39;");

    const decodeHtml = (value) => {
        const element = document.createElement("textarea");
        element.innerHTML = String(value ?? "");
        return element.value;
    };

    const stripTags = (value) => String(value ?? "").replace(/<[^>]*>/g, "");

    const renderFigure = ({ src = "", alt = "", caption = "" }) => {
        const safeSrc = escapeAttribute(src);
        if (!safeSrc) return "";

        const safeAlt = escapeAttribute(alt);
        const safeCaption = escapeHtml(caption).trim();

        return [
            "<figure>",
            `  <img src="${safeSrc}" alt="${safeAlt}" loading="lazy" decoding="async" />`,
            safeCaption ? `  <figcaption>${safeCaption}</figcaption>` : "",
            "</figure>",
        ].filter(Boolean).join("\n");
    };

    cms.registerEditorComponent({
        id: "figure-image",
        label: "Figure image",
        icon: "image",
        fields: [
            {
                label: "Image",
                name: "src",
                widget: "image",
            },
            {
                label: "Alt text",
                name: "alt",
                widget: "string",
                required: false,
            },
            {
                label: "Caption",
                name: "caption",
                widget: "text",
                required: false,
            },
        ],
        pattern:
            /^<figure>\s*<img\s+src="([^"]*)"\s+alt="([^"]*)"(?:\s+[^>]*)?\/?>\s*(?:<figcaption>([\s\S]*?)<\/figcaption>\s*)?<\/figure>$/m,
        fromBlock: (match) => ({
            src: decodeHtml(match[1]),
            alt: decodeHtml(match[2]),
            caption: decodeHtml(stripTags(match[3] ?? "")),
        }),
        toBlock: renderFigure,
        toPreview: renderFigure,
    });
})();
