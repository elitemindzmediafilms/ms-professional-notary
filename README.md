# M&S Professional Notary Services

Standalone website + estimate/invoice calculator. Independent of the Elite Mindz site: own `package.json`,
own dependencies, own deploy.

- `/` — services, pricing guide, contact
- `/quote` — calculator (per-document fee with per-service minimums, loan-signing packages, mileage, printing) and PDF export
- `/quote?owner=1` — adds the owner panel to edit rates, minimums, package fees and the business info printed on PDFs (saved in that browser)

Defaults live in `lib/notary-data.ts`.

```
cd ms-notary
npm install
npm run dev
```

Deploy (e.g. Vercel): set the project **Root Directory** to `ms-notary`. To move it to its own repo, copy this folder out as-is.
