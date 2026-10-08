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
| `POST /api/lead` | "Request an appointment" form (`/request`) | HubSpot contact created/updated by email + a note and a **follow-up task** (call within 1 hour) on the contact; email to the owner; optional confirmation email to the client |
| `POST /api/estimate` | Downloading an estimate/invoice PDF with client details filled in | Same, with the line items and total; follow-up task due in 24 hours |
| `POST /api/distance` | Calculator: client enters their signing address | Driving distance from the business base address, returned as whole miles (rounded up) and auto-filled into Travel. The base address and the route are never sent to the browser |
| `POST /api/click` | Tapping a phone or email link | Anonymous log line (kind + page only), visible under the Worker's Logs |

Spam protection: hidden honeypot field, same-origin check, payload size limit, server-side validation. For more, add a Cloudflare WAF rate-limiting rule on `/api/*`.

### One-time setup

1. **Resend** (email): create an account at resend.com, then API Keys -> Create. Until you verify a sending domain, Resend can only deliver to the email you signed up with, so sign up with `mwrightsr.ganotary@gmail.com`. To email clients too, verify a domain in Resend, change `FROM_EMAIL` in `wrangler.toml`, and set `CLIENT_CONFIRMATIONS = "true"`.
2. **HubSpot** (CRM): Settings -> Integrations -> Private Apps -> Create. Scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write`. If notes or tasks fail with a 403, also grant the scope named in the error (notes and tasks are separate activity scopes). Copy the access token. Tasks are created as HubSpot tasks of type Call: high priority for appointment requests, medium for estimates.
3. **Cloudflare**: Worker -> Settings -> Variables and Secrets -> Add, type **Secret**:
   - `RESEND_API_KEY`
   - `HUBSPOT_TOKEN`

   Optional variable (not secret): `HUBSPOT_OWNER_ID` = the HubSpot user id the follow-up tasks are assigned to (so they show under your own Tasks). Find it in HubSpot -> Settings -> Users & Teams -> your user (the number in the page URL), or leave it unset and tasks are created unassigned.
4. Change `NOTIFY_EMAIL` in `wrangler.toml` if notifications should go somewhere else, then push to `main`.

Secrets added in the dashboard persist across deploys. If a service is unconfigured, the other still works, and failures are logged without personal data.

### Travel distance auto-fill (`/api/distance`)

The business base address is a **secret**, not code: it is never committed, never in the page bundle, and never in any response. The browser only ever receives a whole number of miles.

Add in Cloudflare -> Worker -> Settings -> Variables and Secrets (type **Secret**):

- `ORIGIN_ADDRESS` — the full street address, city, state and ZIP of your base. Add it under the Worker's **Settings -> Variables and Secrets** (runtime), not the Build section, and choose type **Secret**.
- `GOOGLE_MAPS_API_KEY` *(recommended)* — enable **Routes API** on a Google Cloud project and create an API key restricted to that API. Without it the Worker falls back to OpenStreetMap (Nominatim + OSRM), which is free but best-effort and has fair-use limits.

If `ORIGIN_ADDRESS` is not set, or a lookup fails, the calculator tells the visitor to enter the miles by hand. On the public page the miles field is locked to the calculated value once a lookup succeeds, so a quote can't be lowered by editing it.

Because the endpoint reveals a distance for any address you ask it about, add a Cloudflare WAF rate-limiting rule on `/api/*` (for example 20 requests per minute per IP) to discourage someone mapping your location by probing.
