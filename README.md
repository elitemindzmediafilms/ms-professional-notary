# M&S Professional Notary Services

Standalone website + estimate/invoice calculator. Independent of the Elite Mindz site: own `package.json`,
own dependencies, own deploy.

- `/` — services, pricing guide, contact
- `/quote` — calculator (per-document fee with per-service minimums, loan-signing packages, mileage, printing) and PDF export
- `/quote?owner=1` — adds the owner panel to edit rates, minimums, package fees and the business info printed on PDFs (saved in that browser)

Defaults live in `lib/notary-data.ts`.

```
npm install
npm run dev
```

## Deploy to Cloudflare Pages

The site is fully static (`next.config.js` uses `output: 'export'`), so it builds to `out/`.

**Option A — connect the GitHub repo (auto-deploys on every push)**
1. Cloudflare dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git -> pick `ms-professional-notary`.
2. Framework preset: **Next.js (Static HTML Export)**. Build command: `npm run build`. Build output directory: `out`.
3. Environment variable: `NODE_VERSION` = `20`.
4. Save and Deploy. Add the custom domain under the project's Custom domains tab.

**Option B — deploy from your computer**
```
npx wrangler login
npm run deploy      # builds, then `wrangler pages deploy out`
```
The first run creates the Pages project named in `wrangler.toml`.

`public/_headers` sets security and caching headers. `npm run preview` serves the built site locally using Cloudflare's runtime.
