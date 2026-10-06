var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/index.ts
var MAX_BODY = 2e4;
var json = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" }
}), "json");
var esc = /* @__PURE__ */ __name((s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"), "esc");
var str = /* @__PURE__ */ __name((v, max) => typeof v === "string" ? v.trim().slice(0, max) : "", "str");
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function cleanContact(c) {
  return {
    name: str(c?.name, 100),
    phone: str(c?.phone, 30),
    email: str(c?.email, 254).toLowerCase(),
    address: str(c?.address, 300)
  };
}
__name(cleanContact, "cleanContact");
var hasContact = /* @__PURE__ */ __name((c) => Boolean(c.name || c.phone || c.email), "hasContact");
async function sendEmail(env, msg) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");
  const res = await fetch(`${env.RESEND_URL ?? "https://api.resend.com"}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      ...msg.replyTo ? { reply_to: msg.replyTo } : {}
    })
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
}
__name(sendEmail, "sendEmail");
async function hubspot(env, path, body) {
  const res = await fetch(`${env.HUBSPOT_URL ?? "https://api.hubapi.com"}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.HUBSPOT_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HubSpot ${path} ${res.status}`);
  return res.json();
}
__name(hubspot, "hubspot");
async function saveToCrm(env, c, noteHtml) {
  if (!env.HUBSPOT_TOKEN) throw new Error("HUBSPOT_TOKEN not set");
  if (!c.email) throw new Error("no email: skipped CRM");
  const [first, ...rest] = c.name.split(/\s+/).filter(Boolean);
  const properties = { email: c.email };
  if (first) properties.firstname = first;
  if (rest.length) properties.lastname = rest.join(" ");
  if (c.phone) properties.phone = c.phone;
  if (c.address) properties.address = c.address;
  const up = await hubspot(env, "/crm/v3/objects/contacts/batch/upsert", {
    inputs: [{ idProperty: "email", id: c.email, properties }]
  });
  const contactId = up?.results?.[0]?.id;
  if (!contactId) throw new Error("HubSpot: no contact id");
  await hubspot(env, "/crm/v3/objects/notes", {
    properties: { hs_timestamp: (/* @__PURE__ */ new Date()).toISOString(), hs_note_body: noteHtml },
    associations: [
      { to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] }
    ]
  });
}
__name(saveToCrm, "saveToCrm");
async function notify(env, opts) {
  const table = opts.rows.filter(([, v]) => v).map(
    ([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${esc(v).replace(/\n/g, "<br>")}</td></tr>`
  ).join("");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111"><h2 style="margin:0 0 12px">${esc(opts.subject)}</h2><table>${table}</table>${opts.extraHtml ?? ""}</div>`;
  const jobs = [
    sendEmail(env, { to: env.NOTIFY_EMAIL, subject: opts.subject, html, replyTo: opts.contact.email || void 0 }),
    saveToCrm(env, opts.contact, opts.noteHtml)
  ];
  const wantsConfirm = env.CLIENT_CONFIRMATIONS === "true" && opts.confirmation && opts.contact.email;
  if (wantsConfirm) {
    jobs.push(sendEmail(env, { to: opts.contact.email, ...opts.confirmation }));
  }
  const results = await Promise.allSettled(jobs);
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`job ${i} failed:`, r.reason?.message);
  });
  return results[0].status === "fulfilled" || results[1].status === "fulfilled";
}
__name(notify, "notify");
async function handleLead(env, b) {
  if (str(b.website, 50)) return json({ ok: true });
  const contact = cleanContact(b);
  const service = str(b.service, 120);
  const date = str(b.date, 40);
  const time = str(b.time, 60);
  const notes = str(b.notes, 2e3);
  const docs = str(b.documents, 20);
  if (!contact.name) return json({ ok: false, error: "Please enter your name." }, 400);
  if (contact.phone.replace(/\D/g, "").length < 7) return json({ ok: false, error: "Please enter a valid phone number." }, 400);
  if (!EMAIL_RE.test(contact.email)) return json({ ok: false, error: "Please enter a valid email address." }, 400);
  if (b.consent !== true) return json({ ok: false, error: "Please confirm we may contact you." }, 400);
  const rows = [
    ["Name", contact.name],
    ["Phone", contact.phone],
    ["Email", contact.email],
    ["Service", service],
    ["Documents", docs],
    ["Preferred date", date],
    ["Preferred time", time],
    ["Signing address", contact.address],
    ["Notes", notes]
  ];
  const noteHtml = `<p><strong>Appointment request (website)</strong></p><p>${rows.map(([k, v]) => v ? `${esc(k)}: ${esc(v)}` : "").filter(Boolean).join("<br>")}</p>`;
  const ok = await notify(env, {
    subject: `New appointment request \u2014 ${contact.name}${service ? ` (${service})` : ""}`,
    contact,
    rows,
    noteHtml,
    confirmation: {
      subject: "We received your appointment request \u2014 M&S Professional Notary Services",
      html: `<div style="font-family:Arial,sans-serif;font-size:15px"><p>Hi ${esc(contact.name.split(" ")[0])},</p><p>Thank you for contacting M&amp;S Professional Notary Services. We received your request and will reach out shortly to confirm your appointment.</p><p>Need us sooner? Call or text ${esc("943-255-4501")}.</p><p style="color:#666;font-size:12px">M&amp;S Professional Notary Services does not provide legal advice or prepare legal documents.</p></div>`
    }
  });
  return ok ? json({ ok: true }) : json({ ok: false, error: "We could not send your request. Please call 943-255-4501." }, 502);
}
__name(handleLead, "handleLead");
async function handleEstimate(env, b) {
  const contact = cleanContact(b.client);
  if (!hasContact(contact)) return json({ ok: true, skipped: true });
  const kind = str(b.kind, 20) || "Estimate";
  const number = str(b.number, 40);
  const total = typeof b.total === "number" && Number.isFinite(b.total) ? b.total : 0;
  const lines = Array.isArray(b.lines) ? b.lines.slice(0, 30) : [];
  const money = /* @__PURE__ */ __name((n) => `$${n.toFixed(2)}`, "money");
  const lineText = lines.map((l) => `${str(l?.label, 120)} \u2014 ${money(Number(l?.amount) || 0)}`);
  const rows = [
    ["Document", `${kind} ${number}`.trim()],
    ["Name", contact.name],
    ["Phone", contact.phone],
    ["Email", contact.email],
    ["Address", contact.address],
    ["Total", money(total)],
    ["Items", lineText.join("\n")]
  ];
  const noteHtml = `<p><strong>${esc(kind)} ${esc(number)} generated \u2014 ${esc(money(total))}</strong></p><p>${lineText.map(esc).join("<br>")}</p>`;
  const ok = await notify(env, {
    subject: `${kind} downloaded \u2014 ${contact.name || contact.email || contact.phone} \u2014 ${money(total)}`,
    contact,
    rows,
    noteHtml
  });
  return ok ? json({ ok: true }) : json({ ok: false }, 502);
}
__name(handleEstimate, "handleEstimate");
function handleClick(b) {
  const kind = b?.kind === "email" ? "email" : "phone";
  const where = str(b?.page, 80);
  console.log(JSON.stringify({ event: "contact_click", kind, page: where, at: (/* @__PURE__ */ new Date()).toISOString() }));
  return json({ ok: true });
}
__name(handleClick, "handleClick");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== url.host) return json({ ok: false, error: "Forbidden" }, 403);
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ ok: false, error: "Too large" }, 413);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ ok: false, error: "Bad request" }, 400);
    }
    switch (url.pathname) {
      case "/api/lead":
        return handleLead(env, body);
      case "/api/estimate":
        return handleEstimate(env, body);
      case "/api/click":
        return handleClick(body);
      default:
        return json({ ok: false, error: "Not found" }, 404);
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-v6722v/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-v6722v/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
