import { existsSync } from "node:fs";
import { extname, isAbsolute, relative, resolve } from "node:path";
import sharp from "sharp";

type ImageAltValue = string | null | undefined;
type ImageSrcValue = string | null | undefined;
const PUBLIC_DIR = resolve(process.cwd(), "public");
const LOCAL_IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
]);
const localPlaceholderCache = new Map<string, Promise<string>>();

function cleanAlt(value: ImageAltValue) {
  return value?.trim() ?? "";
}

export function getImageAlt(explicitAlt: ImageAltValue, fallbackAlt: ImageAltValue = "") {
  return cleanAlt(explicitAlt) || cleanAlt(fallbackAlt);
}

export function getPostCoverAlt(explicitAlt: ImageAltValue, title: string) {
  return getImageAlt(explicitAlt, `Featured image for ${title}`);
}

export function getAvatarAlt(explicitAlt: ImageAltValue, name: string) {
  return getImageAlt(explicitAlt, `Portrait of ${name}`);
}

export function getHeaderImageAlt(explicitAlt: ImageAltValue, title: string) {
  return getImageAlt(explicitAlt, `Header image for ${title}`);
}

function getUnsplashPlaceholder(url: URL) {
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", url.searchParams.get("fit") || "crop");
  url.searchParams.set("q", "20");
  url.searchParams.set("w", "32");
  return url.toString();
}

function getPicsumPlaceholder(url: URL) {
  const match = url.pathname.match(/^\/id\/([^/]+)\/(\d+)\/(\d+)(\.[a-z0-9]+)?$/i);
  if (!match) return "";

  const width = Number(match[2]);
  const height = Number(match[3]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0) {
    return "";
  }

  const placeholderWidth = 32;
  const placeholderHeight = Math.max(1, Math.round((height / width) * placeholderWidth));
  url.pathname = `/id/${match[1]}/${placeholderWidth}/${placeholderHeight}${match[4] ?? ""}`;
  return url.toString();
}

function getRemoteProgressiveImagePlaceholder(src: string) {
  const value = src?.trim();
  if (!value || value.startsWith("/") || value.startsWith("data:") || value.startsWith("blob:")) {
    return "";
  }

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    if (host === "images.unsplash.com") {
      return getUnsplashPlaceholder(url);
    }

    if (host === "picsum.photos") {
      return getPicsumPlaceholder(url);
    }
  } catch {
    return "";
  }

  return "";
}

function getPublicImagePath(src: string) {
  if (!src.startsWith("/") || src.startsWith("//")) {
    return "";
  }

  let pathname = "";
  try {
    pathname = decodeURIComponent(new URL(src, "https://builtbyunderdogs.local").pathname);
  } catch {
    return "";
  }

  if (!LOCAL_IMAGE_EXTENSIONS.has(extname(pathname).toLowerCase())) {
    return "";
  }

  const imagePath = resolve(PUBLIC_DIR, `.${pathname}`);
  const relativePath = relative(PUBLIC_DIR, imagePath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath) || !existsSync(imagePath)) {
    return "";
  }

  return imagePath;
}

async function createLocalImagePlaceholder(imagePath: string) {
  try {
    const buffer = await sharp(imagePath)
      .rotate()
      .resize({ width: 32, withoutEnlargement: true })
      .webp({ quality: 20 })
      .toBuffer();

    return `data:image/webp;base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}

async function getLocalProgressiveImagePlaceholder(src: string) {
  const imagePath = getPublicImagePath(src);
  if (!imagePath) return "";

  if (!localPlaceholderCache.has(imagePath)) {
    localPlaceholderCache.set(imagePath, createLocalImagePlaceholder(imagePath));
  }

  return localPlaceholderCache.get(imagePath) ?? "";
}

export async function getProgressiveImagePlaceholder(src: ImageSrcValue) {
  const value = src?.trim();
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) {
    return "";
  }

  const remotePlaceholder = getRemoteProgressiveImagePlaceholder(value);
  if (remotePlaceholder) return remotePlaceholder;

  return getLocalProgressiveImagePlaceholder(value);
}
