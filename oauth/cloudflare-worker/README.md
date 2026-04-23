# Sveltia CMS Authenticator (Cloudflare Workers)

This project is configured to use GitHub OAuth for Sveltia CMS via a Cloudflare Worker base URL.

## Required steps

1. Create a GitHub OAuth app.
1. Set callback URL to `https://<your-worker-domain>/callback`.
1. Deploy an authenticator worker compatible with Sveltia/Decap OAuth flow.
1. Configure these Worker environment variables:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `OAUTH_AUTHORIZE_PATH` (default: `https://github.com/login/oauth/authorize`)
   - `OAUTH_ACCESS_TOKEN_PATH` (default: `https://github.com/login/oauth/access_token`)
1. Update `public/admin/config.yml`:
   - `backend.base_url: https://<your-worker-domain>`

## Local development

```bash
cd oauth/cloudflare-worker
npm install
npm run dev
```

## Deploy

```bash
cd oauth/cloudflare-worker
npm run deploy
```

After deploy, confirm `https://<your-worker-domain>/auth` returns an auth endpoint response and CMS login completes.
