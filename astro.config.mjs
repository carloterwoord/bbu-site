import { defineConfig } from "astro/config";
import remarkUrlCards from "./src/lib/remark-url-cards.mjs";

export default defineConfig({
  markdown: {
    remarkPlugins: [[remarkUrlCards, { version: "url-cards-metadata-images-only" }]],
  },
  output: "static",
});
