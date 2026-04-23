export function withBase(path: string): string {
  if (!path.startsWith("/")) return path;

  const base = import.meta.env.BASE_URL ?? "/";
  if (base === "/") return path;

  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const [pathname, hash = ""] = path.split("#");
  const [cleanPath, query = ""] = pathname.split("?");

  const prefixedPath =
    cleanPath === "/" ? `${normalizedBase}/` : `${normalizedBase}${cleanPath}`;

  const queryPart = query ? `?${query}` : "";
  const hashPart = hash ? `#${hash}` : "";

  return `${prefixedPath}${queryPart}${hashPart}`;
}
