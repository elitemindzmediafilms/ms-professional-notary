'use client';

import { useEffect, useMemo, useState } from 'react';
import { Car, FileText, Plus, Printer, RotateCcw, Settings2, Trash2, Download, Stamp } from 'lucide-react';
import {
  DEFAULT_SETTINGS,
  FEE_DISCLOSURE,
  LOAN_SUPERVISION_NOTE,
  MOBILE_SERVICE,
  NOTARY_SERVICES,
  PACKAGES,
  PACKAGE_INCLUDES,
  PACKAGE_SERVICES,
  calculateQuote,
  mergeSettings,
  money,
  packageFor,
  perDocument,
  travelTier,
  type LineItem,
  type NotaryService,
  type PackageId,
  type Settings,
} from '@/lib/notary-data';
import { buildNotaryPdf } from '@/lib/notary-pdf';

const STORAGE_KEY = 'ms-notary-settings-v4';

const uid = () => Math.random().toString(36).slice(2, 9);
const newItem = (): LineItem => ({ id: uid(), service: NOTARY_SERVICES[0], documents: 1, packageId: null });
const today = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const newNumber = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `MS-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(100 + Math.random() * 900)}`;
};

/** Number input that lets the user clear the field while typing. */
function NumField({
  value,
  onChange,
  step = 1,
  min = 0,
  prefix,
  suffix,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  prefix?: string;
  suffix?: string;
  label: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (Number(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="flex items-center rounded-lg border border-dark-400 bg-dark-700 focus-within:border-gold-500">
      {prefix && <span className="pl-3 text-sm text-gray-400">{prefix}</span>}
      <input
        aria-label={label}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseFloat(e.target.value);
          onChange(Number.isFinite(n) && n >= min ? n : 0);
        }}
        className="w-full bg-transparent px-3 py-2.5 text-white outline-none"
      />
      {suffix && <span className="pr-3 text-sm text-gray-400">{suffix}</span>}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-dark-400 bg-dark-700 px-3 py-2.5 text-white placeholder-gray-500 outline-none focus:border-gold-500';

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-dark-400 bg-dark-800 p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 font-heading text-xl text-gold-300">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-[#D4AF37]"
      />
      {label}
    </label>
  );
}

export default function Calculator() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showRates, setShowRates] = useState(false);
  const [owner, setOwner] = useState(false);

  const [kind, setKind] = useState<'Invoice' | 'Estimate'>('Invoice');
  const [number, setNumber] = useState('');
  const [client, setClient] = useState({ name: '', email: '', phone: '', address: '' });
  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [travel, setTravel] = useState({ enabled: false, miles: 0, customFee: 0 });
  const [extraActs, setExtraActs] = useState(0);
  const [printing, setPrinting] = useState({ enabled: false, pages: 0 });
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // Invoice number is generated on the client to avoid a hydration mismatch.
  useEffect(() => {
    setNumber(newNumber());
    setOwner(new URLSearchParams(window.location.search).has('owner'));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSettings(mergeSettings(JSON.parse(raw)));
      }
    } catch {
      /* storage unavailable — defaults are fine */
    }
  }, []);

  const saveSettings = (next: Settings) => {
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  // The public page prices mobile appointments only. The standard (no-travel) option exists for the owner (?owner=1).
  const effTravel = owner ? travel : { ...travel, enabled: true };

  const quote = useMemo(
    () => calculateQuote({ items, extraActs, travel: effTravel, printing }, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, extraActs, travel, owner, printing, settings],
  );

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const chooseService = (id: string, service: NotaryService) => {
    updateItem(id, PACKAGE_SERVICES.includes(service) ? { service } : { service, packageId: null, packageFee: undefined });
    if (service === MOBILE_SERVICE) setTravel((t) => ({ ...t, enabled: true }));
  };

  const reset = () => {
    setClient({ name: '', email: '', phone: '', address: '' });
    setItems([newItem()]);
    setTravel({ enabled: false, miles: 0, customFee: 0 });
    setExtraActs(0);
    setPrinting({ enabled: false, pages: 0 });
    setNotes('');
    setNumber(newNumber());
  };

  async function download() {
    setBusy(true);
    try {
      const { blob, filename } = await buildNotaryPdf({
        kind,
        number,
        date: today(),
        client,
        jobNotes: notes,
        business: settings.business,
        quote,
      });
      // Log the client + totals to the CRM and notify the owner. Fire-and-forget: never blocks the PDF.
      if (client.name || client.email || client.phone) {
        fetch('/api/estimate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            kind,
            number,
            client,
            total: quote.total,
            lines: quote.lines.map((l) => ({ label: l.label, amount: l.amount })),
          }),
          keepalive: true,
        }).catch(() => {});
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setBusy(false);
    }
  }

  const rate = (k: keyof Settings['rates'], label: string, step: number, prefix?: string, suffix?: string) => (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">{label}</span>
      <NumField
        label={label}
        value={settings.rates[k]}
        step={step}
        prefix={prefix}
        suffix={suffix}
        onChange={(n) => saveSettings({ ...settings, rates: { ...settings.rates, [k]: n } })}
      />
    </label>
  );

  return (
    <div className="pb-16">
      {owner && (
        <div className="mx-auto flex max-w-6xl justify-end px-4 pt-4">
          <button
            onClick={() => setShowRates((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-gold-600/60 px-3 py-2 text-sm text-gold-300 hover:bg-dark-600"
          >
            <Settings2 size={16} /> Rates, minimums &amp; business info
          </button>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 pt-6">
        {showRates && (
          <div className="mb-6 rounded-2xl border border-gold-600/40 bg-dark-800 p-5 sm:p-6">
            <h2 className="mb-1 font-heading text-xl text-gold-300">Rates</h2>
            <p className="mb-4 text-sm text-gray-400">Saved on this device. Change anytime — totals update instantly.</p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {rate('notarialFee', 'Notarial act fee (GA: $2)', 0.5, '$')}
              {rate('convenienceFee', 'Mobile / convenience fee', 1, '$')}
              {rate('perPage', 'Print / page', 0.05, '$')}
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">Standard minimum</span>
                <NumField
                  label="Standard appointment minimum"
                  value={settings.standardMinimum}
                  prefix="$"
                  onChange={(n) => saveSettings({ ...settings, standardMinimum: n })}
                />
              </label>
            </div>

            <h2 className="mb-1 mt-6 font-heading text-xl text-gold-300">Travel tiers (one-way miles)</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {(
                [
                  ['includedMiles', 'Included up to', 'mi'],
                  ['tier2Max', 'Tier 2 up to', 'mi'],
                  ['tier2Fee', 'Tier 2 fee', '$'],
                  ['tier3Max', 'Tier 3 up to', 'mi'],
                  ['tier3Fee', 'Tier 3 fee', '$'],
                ] as const
              ).map(([k, label, unit]) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">{label}</span>
                  <NumField
                    label={label}
                    value={settings.travel[k]}
                    prefix={unit === '$' ? '$' : undefined}
                    suffix={unit === 'mi' ? 'mi' : undefined}
                    onChange={(n) => saveSettings({ ...settings, travel: { ...settings.travel, [k]: n } })}
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">Beyond tier 3 the job needs a custom quote.</p>

            <h2 className="mb-1 mt-6 font-heading text-xl text-gold-300">Loan document signing — starting fees</h2>
            <p className="mb-3 text-sm text-gray-400">
              Includes dual printing, scan-backs and travel within {settings.travel.includedMiles} mi.
            </p>
            <div className="grid gap-4 md:grid-cols-4">
              {PACKAGES.map((p) => (
                <label key={p.id} className="block">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">{p.label}</span>
                  <NumField
                    label={`${p.label} fee`}
                    value={settings.packageFees[p.id]}
                    prefix="$"
                    onChange={(n) =>
                      saveSettings({ ...settings, packageFees: { ...settings.packageFees, [p.id]: n } })
                    }
                  />
                </label>
              ))}
            </div>

            <h2 className="mb-1 mt-6 font-heading text-xl text-gold-300">Mobile appointment minimums</h2>
            <p className="mb-3 text-sm text-gray-400">
              A mobile appointment never bills less than the highest minimum among its services. Standard
              appointments use the standard minimum ({money(settings.standardMinimum)}).
            </p>
            <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
              {NOTARY_SERVICES.map((svc) => (
                <label key={svc} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-200">{svc}</span>
                  <div className="w-28 shrink-0">
                    <NumField
                      label={`${svc} mobile minimum`}
                      value={settings.mobileMinimums[svc] ?? 0}
                      prefix="$"
                      onChange={(n) =>
                        saveSettings({ ...settings, mobileMinimums: { ...settings.mobileMinimums, [svc]: n } })
                      }
                    />
                  </div>
                </label>
              ))}
            </div>
            <h2 className="mb-3 mt-6 font-heading text-xl text-gold-300">Business info on the PDF</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {(['name', 'tagline', 'phone', 'email'] as const).map((k) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">{k}</span>
                  <input
                    className={inputCls}
                    value={settings.business[k]}
                    onChange={(e) =>
                      saveSettings({ ...settings, business: { ...settings.business, [k]: e.target.value } })
                    }
                  />
                </label>
              ))}
            </div>
            <button
              onClick={() => saveSettings(DEFAULT_SETTINGS)}
              className="mt-5 text-sm text-gray-400 underline hover:text-gold-300"
            >
              Restore defaults
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Card title="Client" icon={<FileText size={20} />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  className={inputCls}
                  placeholder="Client name"
                  value={client.name}
                  onChange={(e) => setClient({ ...client, name: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Phone"
                  inputMode="tel"
                  value={client.phone}
                  onChange={(e) => setClient({ ...client, phone: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Email"
                  type="email"
                  value={client.email}
                  onChange={(e) => setClient({ ...client, email: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Signing address (if mobile)"
                  value={client.address}
                  onChange={(e) => setClient({ ...client, address: e.target.value })}
                />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                When you download a PDF, these contact details and the estimate total are sent to M&amp;S so we can follow up.
              </p>
            </Card>

            <Card title="Notary services" icon={<Stamp size={20} />}>
              <div className="space-y-3">
                {items.map((item) => {
                  const canPackage = PACKAGE_SERVICES.includes(item.service);
                  const pkg = canPackage ? packageFor(item.packageId) : null;
                  return (
                    <div key={item.id} className="rounded-xl border border-dark-400/70 p-3">
                      <div className="grid grid-cols-[1fr_auto] items-end gap-3 sm:grid-cols-[1fr_130px_auto]">
                        <label className="col-span-2 block sm:col-span-1">
                          <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">Service</span>
                          <select
                            className={inputCls}
                            value={item.service}
                            onChange={(e) => chooseService(item.id, e.target.value as NotaryService)}
                          >
                            {NOTARY_SERVICES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                        {pkg ? (
                          <div className="text-xs text-gray-400">Flat fee</div>
                        ) : (
                          <label className="block">
                            <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">Documents</span>
                            <NumField
                              label="Number of documents"
                              value={item.documents}
                              onChange={(n) => updateItem(item.id, { documents: Math.floor(n) })}
                            />
                          </label>
                        )}
                        <button
                          aria-label="Remove service"
                          disabled={items.length === 1}
                          onClick={() => setItems((l) => l.filter((i) => i.id !== item.id))}
                          className="mb-0.5 rounded-lg p-3 text-gray-400 hover:bg-dark-600 hover:text-red-400 disabled:opacity-30"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      {canPackage && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_130px]">
                          <label className="block">
                            <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">
                              Pricing
                            </span>
                            <select
                              aria-label="Pricing type"
                              className={inputCls}
                              value={item.packageId ?? ''}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  packageId: (e.target.value || null) as PackageId | null,
                                  packageFee: undefined,
                                })
                              }
                            >
                              <option value="">Single document(s) — per-document rate</option>
                              {PACKAGES.map((p) => (
                                <option key={p.id} value={p.id}>
                                  Loan signing: {p.label} (from {money(p.fee)})
                                </option>
                              ))}
                            </select>
                          </label>
                          {pkg && (
                            <label className="block">
                              <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">Fee</span>
                              <NumField
                                label="Package fee"
                                prefix="$"
                                value={item.packageFee ?? settings.packageFees[pkg.id]}
                                onChange={(n) => updateItem(item.id, { packageFee: n })}
                              />
                            </label>
                          )}
                          {pkg && (
                            <p className="text-xs text-gray-500 sm:col-span-2">
                              Includes: {PACKAGE_INCLUDES.map((t) => t.split(' (')[0].toLowerCase()).join(', ')}.{' '}
                              {LOAN_SUPERVISION_NOTE}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setItems((l) => [...l, newItem()])}
                className="mt-4 flex items-center gap-2 text-sm text-gold-300 hover:text-gold-400"
              >
                <Plus size={16} /> Add another service
              </button>
              <p className="mt-3 text-xs text-gray-500">
                {owner
                  ? `${money(perDocument(settings.rates))} per document: ${money(settings.rates.notarialFee)} notarial act + ${money(settings.rates.convenienceFee)} mobile/convenience service. Standard minimum ${money(settings.standardMinimum)}; mobile appointments start at ${money(settings.mobileMinimums[MOBILE_SERVICE] ?? 50)}.`
                  : `Mobile notary appointments start at ${money(settings.mobileMinimums[MOBILE_SERVICE] ?? 50)} (Wills & Estate ${money(settings.mobileMinimums['Wills & Estate Planning Documents'])}). Travel within ${settings.travel.includedMiles} miles is included.`}
              </p>
              <label className="mt-4 block max-w-xs">
                <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">
                  Additional notarial acts ({money(settings.rates.notarialFee)} each)
                </span>
                <NumField
                  label="Additional notarial acts"
                  value={extraActs}
                  onChange={(n) => setExtraActs(Math.floor(n))}
                />
              </label>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card title="Travel" icon={<Car size={20} />}>
                <div className="space-y-4">
                  {owner ? (
                    <Toggle
                      checked={travel.enabled}
                      onChange={(v) => setTravel({ ...travel, enabled: v })}
                      label="Mobile job (notary travels to client)"
                    />
                  ) : (
                    <p className="text-sm text-gray-300">Mobile notary — we come to you.</p>
                  )}
                  {effTravel.enabled && (
                    <>
                      <label className="block">
                        <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">
                          Distance to client (one way)
                        </span>
                        <NumField
                          label="Miles one way"
                          value={travel.miles}
                          step={0.5}
                          suffix="mi"
                          onChange={(n) => setTravel({ ...travel, miles: n })}
                        />
                      </label>
                      {quote.needsCustomTravel && (
                        <label className="block">
                          <span className="mb-1 block text-xs uppercase tracking-wider text-amber-300">
                            Over {settings.travel.tier3Max} mi — enter custom travel quote
                          </span>
                          <NumField
                            label="Custom travel quote"
                            value={travel.customFee}
                            prefix="$"
                            onChange={(n) => setTravel({ ...travel, customFee: n })}
                          />
                        </label>
                      )}
                      <ul className="space-y-0.5 text-xs text-gray-500">
                        {(
                          [
                            ['included', `0–${settings.travel.includedMiles} mi: included`],
                            [
                              'tier2',
                              `${settings.travel.includedMiles + 1}–${settings.travel.tier2Max} mi: +${money(settings.travel.tier2Fee)}`,
                            ],
                            [
                              'tier3',
                              `${settings.travel.tier2Max + 1}–${settings.travel.tier3Max} mi: +${money(settings.travel.tier3Fee)}`,
                            ],
                            ['custom', `${settings.travel.tier3Max}+ mi: custom quote`],
                          ] as const
                        ).map(([id, text]) => (
                          <li
                            key={id}
                            className={
                              travel.miles > 0 && travelTier(travel.miles, settings.travel) === id
                                ? 'font-semibold text-gold-300'
                                : ''
                            }
                          >
                            {text}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </Card>

              <Card title="Printing" icon={<Printer size={20} />}>
                <div className="space-y-4">
                  <Toggle
                    checked={printing.enabled}
                    onChange={(v) => setPrinting({ ...printing, enabled: v })}
                    label="Print documents for client"
                  />
                  {printing.enabled && (
                    <label className="block">
                      <span className="mb-1 block text-xs uppercase tracking-wider text-gray-400">Total pages</span>
                      <NumField
                        label="Pages to print"
                        value={printing.pages}
                        suffix="pages"
                        onChange={(n) => setPrinting({ ...printing, pages: Math.floor(n) })}
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        {money(settings.rates.perPage)} per page
                        {quote.hasPackage && ' — loan-signing packages already include their own stacks'}
                      </p>
                    </label>
                  )}
                </div>
              </Card>
            </div>

            <Card title="Notes for the client (optional)" icon={<FileText size={20} />}>
              <textarea
                className={inputCls}
                rows={3}
                placeholder="Appointment date/time, payment instructions, ID reminder…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Card>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-gold-600/60 bg-dark-800 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex rounded-lg border border-dark-400 p-0.5 text-sm">
                  {(['Invoice', 'Estimate'] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setKind(k)}
                      className={`rounded-md px-3 py-1.5 ${
                        kind === k ? 'bg-gold-500 font-semibold text-black' : 'text-gray-300'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <input
                  aria-label="Document number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-40 rounded-lg border border-dark-400 bg-dark-700 px-2 py-1.5 text-right text-xs text-gray-300 outline-none focus:border-gold-500"
                />
              </div>

              <div className="space-y-3 text-sm">
                {quote.lines.length === 0 && <p className="text-gray-500">Add a service to see pricing.</p>}
                {quote.lines.map((l, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-gray-100">{l.label}</p>
                      <p className="text-xs text-gray-500">{l.detail}</p>
                    </div>
                    <p className="whitespace-nowrap font-medium text-gray-100">{money(l.amount)}</p>
                  </div>
                ))}
              </div>

              <div className="my-5 h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent" />

              <dl className="space-y-1 text-sm text-gray-300">
                {quote.actFees > 0 && (
                  <div className="flex justify-between">
                    <dt>Notarial act fees</dt>
                    <dd>{money(quote.actFees)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt>Convenience &amp; service fees</dt>
                  <dd>{money(quote.convenienceFees)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Travel</dt>
                  <dd>{money(quote.travelTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Printing</dt>
                  <dd>{money(quote.printTotal)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="font-heading text-lg text-gold-300">Total</span>
                <span className="font-heading text-4xl text-gold-gradient" data-testid="total">
                  {money(quote.total)}
                </span>
              </div>

              <button
                onClick={download}
                disabled={busy || quote.lines.length === 0 || (quote.needsCustomTravel && travel.customFee <= 0)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3.5 font-semibold text-black transition hover:opacity-90 disabled:opacity-40"
              >
                <Download size={18} /> {busy ? 'Building PDF…' : `Download ${kind} PDF`}
              </button>
              {quote.needsCustomTravel && travel.customFee <= 0 && (
                <p className="mt-2 text-xs text-amber-300">Enter the custom travel quote to enable the PDF.</p>
              )}
              <p className="mt-4 text-[11px] leading-relaxed text-gray-500">
                <span className="font-semibold text-gray-400">Fee Disclosure:</span> {FEE_DISCLOSURE}
              </p>
              <button
                onClick={reset}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dark-400 py-2.5 text-sm text-gray-300 hover:bg-dark-600"
              >
                <RotateCcw size={15} /> New job
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
