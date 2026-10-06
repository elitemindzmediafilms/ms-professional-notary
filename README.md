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

## Lead capture backend (email + HubSpot)

`worker/index.ts` is a Cloudflare Worker that runs in front of the static site. Only `/api/*` reaches it.

| Endpoint | Fired by | What happens |
|---|---|---|
| `POST /api/lead` | "Request an appointment" form (`/request`) | HubSpot contact created/updated by email + a note on the contact; email to the owner; optional confirmation email to the client |
| `POST /api/estimate` | Downloading an estimate/invoice PDF with client details filled in | Same, with the line items and total |
| `POST /api/click` | Tapping a phone or email link | Anonymous log line (kind + page only), visible under the Worker's Logs |

Spam protection: hidden honeypot field, same-origin check, payload size limit, server-side validation. For more, add a Cloudflare WAF rate-limiting rule on `/api/*`.

### One-time setup

1. **Resend** (email): create an account at resend.com, then API Keys -> Create. Until you verify a sending domain, Resend can only deliver to the email you signed up with, so sign up with `mwrightsr.ganotary@gmail.com`. To email clients too, verify a domain in Resend, change `FROM_EMAIL` in `wrangler.toml`, and set `CLIENT_CONFIRMATIONS = "true"`.
2. **HubSpot** (CRM): Settings -> Integrations -> Private Apps -> Create. Scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write`. If notes fail with a 403, also grant the notes/engagements scope. Copy the access token.
3. **Cloudflare**: Worker -> Settings -> Variables and Secrets -> Add, type **Secret**:
   - `RESEND_API_KEY`
   - `HUBSPOT_TOKEN`
4. Change `NOTIFY_EMAIL` in `wrangler.toml` if notifications should go somewhere else, then push to `main`.

Secrets added in the dashboard persist across deploys. If a service is unconfigured, the other still works, and failures are logged without personal data.
