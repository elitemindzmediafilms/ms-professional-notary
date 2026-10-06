# M&S Professional Notary Services

Standalone website + estimate/invoice calculator. Independent of the Elite Mindz site: own `package.json`,
own dependencies, own deploy.

- `/` — services, pricing guide, contact
- `/quote` — estimate/invoice calculator: $2 notarial act + $23 mobile/convenience per document, appointment minimums (standard $25, mobile $50/$75), one-way travel tiers, loan-signing support packages, printing, PDF export
- `/quote?owner=1` — adds the owner panel to edit rates, minimums, travel tiers, package fees and the business info printed on PDFs (saved in that browser)

Defaults live in `lib/notary-data.ts`.

```
npm install
npm run dev
```

## Deploy to Cloudflare (Workers static assets)

The site is fully static (`next.config.js` uses `output: 'export'`), so it builds to `out/`, which `wrangler.toml` serves as static assets.

**Connect the GitHub repo (auto-deploys on every push to `main`)**

Workers & Pages -> Create -> Import a repository -> `ms-professional-notary`, then:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Build variables | none needed |

(The deploy command is a command, not a folder; the `out` folder is configured in `wrangler.toml`.)

**Or deploy from your computer**
```
npx wrangler login
npm run deploy      # builds, then `wrangler deploy`
```

`public/_headers` sets security and caching headers. `npm run preview` serves the built site locally on Cloudflare's runtime. Add a custom domain under the Worker's Settings -> Domains & Routes.
