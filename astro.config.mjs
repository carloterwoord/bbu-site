import { defineConfig } from "astro/config";
import remarkImageFigures from "./src/lib/remark-image-figures.mjs";
import remarkUrlCards from "./src/lib/remark-url-cards.mjs";

export default defineConfig({
  markdown: {
    remarkPlugins: [
      [remarkUrlCards, { version: "url-cards-metadata-images-only" }],
      remarkImageFigures,
    ],
  },
  output: "static",
});
