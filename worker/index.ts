// M&S Professional Notary — backend for lead capture.
// Runs in front of the static site (see wrangler.toml). Only /api/* reaches this Worker.
//
//   POST /api/lead      appointment request form  -> HubSpot contact + note, email to owner (+ optional client confirmation)
//   POST /api/estimate  estimate/invoice downloaded -> same, with line items
//   POST /api/click     phone / email link tapped -> logged (anonymous, no personal data)
//
// Secrets (set in Cloudflare, never in the repo):  RESEND_API_KEY, HUBSPOT_TOKEN

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  RESEND_API_KEY?: string;
  HUBSPOT_TOKEN?: string;
  /** Optional HubSpot user (owner) id that follow-up tasks are assigned to. Without it tasks are unassigned. */
  HUBSPOT_OWNER_ID?: string;
  NOTIFY_EMAIL: string;
  FROM_EMAIL: string;
  /** "true" once the sending domain is verified in Resend; enables client confirmation emails. */
  CLIENT_CONFIRMATIONS?: string;
  /** Overridable for tests. */
  RESEND_URL?: string;
  HUBSPOT_URL?: string;
}

const MAX_BODY = 20_000;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Contact {
  name: string;
  phone: string;
  email: string;
  address: string;
}

function cleanContact(c: any): Contact {
  return {
    name: str(c?.name, 100),
    phone: str(c?.phone, 30),
    email: str(c?.email, 254).toLowerCase(),
    address: str(c?.address, 300),
  };
}

const hasContact = (c: Contact) => Boolean(c.name || c.phone || c.email);

// ---------- Resend ----------
async function sendEmail(env: Env, msg: { to: string; subject: string; html: string; replyTo?: string }) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
  const res = await fetch(`${env.RESEND_URL ?? 'https://api.resend.com'}/emails`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
}

// ---------- HubSpot ----------
async function hubspot(env: Env, path: string, body: unknown) {
  const res = await fetch(`${env.HUBSPOT_URL ?? 'https://api.hubapi.com'}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.HUBSPOT_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HubSpot ${path} ${res.status}`);
  return res.json() as Promise<any>;
}

interface FollowUp {
  subject: string;
  body: string;
  /** Minutes from now until the task is due. */
  dueInMinutes: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

async function saveToCrm(env: Env, c: Contact, noteHtml: string, followUp?: FollowUp) {
  if (!env.HUBSPOT_TOKEN) throw new Error('HUBSPOT_TOKEN not set');
  if (!c.email) throw new Error('no email: skipped CRM');
  const [first, ...rest] = c.name.split(/\s+/).filter(Boolean);
  const properties: Record<string, string> = { email: c.email };
  if (first) properties.firstname = first;
  if (rest.length) properties.lastname = rest.join(' ');
  if (c.phone) properties.phone = c.phone;
  if (c.address) properties.address = c.address;

  const up = await hubspot(env, '/crm/v3/objects/contacts/batch/upsert', {
    inputs: [{ idProperty: 'email', id: c.email, properties }],
  });
  const contactId = up?.results?.[0]?.id;
  if (!contactId) throw new Error('HubSpot: no contact id');

  // Note on the contact timeline (association type 202 = note -> contact).
  await hubspot(env, '/crm/v3/objects/notes', {
    properties: { hs_timestamp: new Date().toISOString(), hs_note_body: noteHtml },
    associations: [
      { to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] },
    ],
  });

  if (followUp) {
    // Task on the contact (association type 204 = task -> contact). Its own try so a missing
    // task scope never loses the contact or note that were already saved.
    try {
      await hubspot(env, '/crm/v3/objects/tasks', {
        properties: {
          hs_timestamp: new Date(Date.now() + followUp.dueInMinutes * 60_000).toISOString(),
          hs_task_subject: followUp.subject,
          hs_task_body: followUp.body,
          hs_task_status: 'NOT_STARTED',
          hs_task_priority: followUp.priority,
          hs_task_type: 'CALL',
          ...(env.HUBSPOT_OWNER_ID ? { hubspot_owner_id: env.HUBSPOT_OWNER_ID } : {}),
        },
        associations: [
          { to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }] },
        ],
      });
    } catch (e) {
      console.error('follow-up task failed:', (e as Error).message);
    }
  }
}

// ---------- shared pipeline ----------
async function notify(
  env: Env,
  opts: {
    subject: string;
    contact: Contact;
    rows: [string, string][];
    extraHtml?: string;
    noteHtml: string;
    followUp?: FollowUp;
    confirmation?: { subject: string; html: string };
  },
) {
  const table = opts.rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${esc(v).replace(/\n/g, '<br>')}</td></tr>`,
    )
    .join('');
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111"><h2 style="margin:0 0 12px">${esc(opts.subject)}</h2><table>${table}</table>${opts.extraHtml ?? ''}</div>`;

  const jobs: Promise<unknown>[] = [
    sendEmail(env, { to: env.NOTIFY_EMAIL, subject: opts.subject, html, replyTo: opts.contact.email || undefined }),
    saveToCrm(env, opts.contact, opts.noteHtml, opts.followUp),
  ];
  const wantsConfirm = env.CLIENT_CONFIRMATIONS === 'true' && opts.confirmation && opts.contact.email;
  if (wantsConfirm) {
    jobs.push(sendEmail(env, { to: opts.contact.email, ...opts.confirmation! }));
  }
  const results = await Promise.allSettled(jobs);
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`job ${i} failed:`, (r.reason as Error)?.message);
  });
  // Success if the owner was notified or the CRM saved it.
  return results[0].status === 'fulfilled' || results[1].status === 'fulfilled';
}

// ---------- handlers ----------
async function handleLead(env: Env, b: any) {
  if (str(b.website, 50)) return json({ ok: true }); // honeypot: pretend success
  const contact = cleanContact(b);
  const service = str(b.service, 120);
  const date = str(b.date, 40);
  const time = str(b.time, 60);
  const notes = str(b.notes, 2000);
  const docs = str(b.documents, 20);
  if (!contact.name) return json({ ok: false, error: 'Please enter your name.' }, 400);
  if (contact.phone.replace(/\D/g, '').length < 7) return json({ ok: false, error: 'Please enter a valid phone number.' }, 400);
  if (!EMAIL_RE.test(contact.email)) return json({ ok: false, error: 'Please enter a valid email address.' }, 400);
  if (b.consent !== true) return json({ ok: false, error: 'Please confirm we may contact you.' }, 400);

  const rows: [string, string][] = [
    ['Name', contact.name],
    ['Phone', contact.phone],
    ['Email', contact.email],
    ['Service', service],
    ['Documents', docs],
    ['Preferred date', date],
    ['Preferred time', time],
    ['Signing address', contact.address],
    ['Notes', notes],
  ];
  const noteHtml =
    `<p><strong>Appointment request (website)</strong></p>` +
    `<p>${rows.map(([k, v]) => (v ? `${esc(k)}: ${esc(v)}` : '')).filter(Boolean).join('<br>')}</p>`;

  const ok = await notify(env, {
    subject: `New appointment request — ${contact.name}${service ? ` (${service})` : ''}`,
    contact,
    rows,
    noteHtml,
    followUp: {
      subject: `Call ${contact.name} — appointment request${service ? ` (${service})` : ''}`,
      body: rows
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n'),
      dueInMinutes: 60,
      priority: 'HIGH',
    },
    confirmation: {
      subject: 'We received your appointment request — M&S Professional Notary Services',
      html: `<div style="font-family:Arial,sans-serif;font-size:15px"><p>Hi ${esc(contact.name.split(' ')[0])},</p><p>Thank you for contacting M&amp;S Professional Notary Services. We received your request and will reach out shortly to confirm your appointment.</p><p>Need us sooner? Call or text ${esc('943-255-4501')}.</p><p style="color:#666;font-size:12px">M&amp;S Professional Notary Services does not provide legal advice or prepare legal documents.</p></div>`,
    },
  });
  return ok ? json({ ok: true }) : json({ ok: false, error: 'We could not send your request. Please call 943-255-4501.' }, 502);
}

async function handleEstimate(env: Env, b: any) {
  const contact = cleanContact(b.client);
  if (!hasContact(contact)) return json({ ok: true, skipped: true });
  const kind = str(b.kind, 20) || 'Estimate';
  const number = str(b.number, 40);
  const total = typeof b.total === 'number' && Number.isFinite(b.total) ? b.total : 0;
  const lines: any[] = Array.isArray(b.lines) ? b.lines.slice(0, 30) : [];
  const money = (n: number) => `$${n.toFixed(2)}`;
  const lineText = lines.map((l) => `${str(l?.label, 120)} — ${money(Number(l?.amount) || 0)}`);

  const rows: [string, string][] = [
    ['Document', `${kind} ${number}`.trim()],
    ['Name', contact.name],
    ['Phone', contact.phone],
    ['Email', contact.email],
    ['Address', contact.address],
    ['Total', money(total)],
    ['Items', lineText.join('\n')],
  ];
  const noteHtml =
    `<p><strong>${esc(kind)} ${esc(number)} generated — ${esc(money(total))}</strong></p>` +
    `<p>${lineText.map(esc).join('<br>')}</p>`;

  const ok = await notify(env, {
    subject: `${kind} downloaded — ${contact.name || contact.email || contact.phone} — ${money(total)}`,
    contact,
    rows,
    noteHtml,
    followUp: {
      subject: `Follow up on ${kind.toLowerCase()} ${number} (${money(total)}) — ${contact.name || contact.email}`,
      body: lineText.join('\n'),
      dueInMinutes: 24 * 60,
      priority: 'MEDIUM',
    },
  });
  return ok ? json({ ok: true }) : json({ ok: false }, 502);
}

function handleClick(b: any) {
  const kind = b?.kind === 'email' ? 'email' : 'phone';
  const where = str(b?.page, 80);
  // Anonymous: no IP, user agent or identifiers are recorded.
  console.log(JSON.stringify({ event: 'contact_click', kind, page: where, at: new Date().toISOString() }));
  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== url.host) return json({ ok: false, error: 'Forbidden' }, 403);

    const text = await request.text();
    if (text.length > MAX_BODY) return json({ ok: false, error: 'Too large' }, 413);
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ ok: false, error: 'Bad request' }, 400);
    }

    switch (url.pathname) {
      case '/api/lead':
        return handleLead(env, body);
      case '/api/estimate':
        return handleEstimate(env, body);
      case '/api/click':
        return handleClick(body);
      default:
        return json({ ok: false, error: 'Not found' }, 404);
    }
  },
};
