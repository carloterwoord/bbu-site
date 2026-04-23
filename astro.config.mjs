import { defineConfig } from "astro/config";

const indexHtmlAliasPlugin = {
  name: "index-html-alias-plugin",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (!req.url) {
        next();
        return;
      }

      const [rawPath, query = ""] = req.url.split("?");
      let path = rawPath;

      // Support legacy .html URLs in dev while Astro page routes stay extensionless.
      path = path
        .replace(/\/index\.html$/, "/")
        .replace(/\/post\.html$/, "/post")
        .replace(/\/page\.html$/, "/page")
        .replace(/\/category\.html$/, "/category")
        .replace(/\/author\.html$/, "/author")
        .replace(/\/search\.html$/, "/search")
        .replace(/\/results\.html$/, "/results")
        .replace(/\/error\.html$/, "/error")
        .replace(/\/(post|category|author)\/([^/]+)\.html$/, "/$1/$2");

      if (/\/admin\/?$/.test(path)) {
        path = path.replace(/\/admin\/?$/, "/admin/index.html");
      }

      req.url = query ? `${path}?${query}` : path;

      next();
    });
  },
};

export default defineConfig({
  output: "static",
  build: {
    format: "file",
  },
  vite: {
    plugins: [indexHtmlAliasPlugin],
  },
});
