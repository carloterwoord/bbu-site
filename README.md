# Built by Underdogs (Astro + Sveltia CMS)

This project has been migrated to Astro 6 with Sveltia CMS integration.

## Versions

- `astro@6.1.9`
- `@sveltia/cms@0.156.3`

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run check
npm run build
```

## Content Collections

Collections are defined in `src/content.config.ts`:

- `posts`
- `authors`
- `categories`

Content files live in:

- `src/content/posts/*.md`
- `src/content/authors/*.md`
- `src/content/categories/*.md`

## One-time Migration Script

Seed content from the current HTML baseline:

```bash
node scripts/migrate-html-to-content.mjs
```

## CMS Admin

- Admin app: `public/admin/index.html`
- CMS config: `public/admin/config.yml`

Default backend target is:

- `repo: carloterwoord/bbu-site`
- `publish_mode: editorial_workflow`

Set your OAuth worker URL in `public/admin/config.yml`:

```yml
backend:
  base_url: https://YOUR-SVELTIA-AUTH-WORKER.workers.dev
```

## OAuth Worker (Cloudflare)

Starter scaffold is in `oauth/cloudflare-worker/`.

See `oauth/cloudflare-worker/README.md` for setup and deploy steps.
