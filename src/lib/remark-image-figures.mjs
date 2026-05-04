function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function getSingleImageChild(children = []) {
  const meaningfulChildren = children.filter((child) => {
    return child.type !== "text" || child.value.trim();
  });

  if (meaningfulChildren.length !== 1) return null;

  const [child] = meaningfulChildren;
  return child.type === "image" ? child : null;
}

function renderFigure(image) {
  const src = image.url || "";
  if (!src) return null;

  const alt = image.alt || "";
  const caption = image.title?.trim() || "";

  return [
    "<figure>",
    `  <img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy" decoding="async" />`,
    caption ? `  <figcaption>${escapeHtml(caption)}</figcaption>` : "",
    "</figure>",
  ].filter(Boolean).join("\n");
}

export default function remarkImageFigures() {
  return (tree) => {
    if (!Array.isArray(tree.children)) return;

    tree.children = tree.children.map((node) => {
      if (node.type !== "paragraph") return node;

      const image = getSingleImageChild(node.children);
      if (!image) return node;

      const value = renderFigure(image);
      return value ? { type: "html", value } : node;
    });
  };
}
