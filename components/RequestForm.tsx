'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { NOTARY_SERVICES } from '@/lib/notary-data';

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'consent', string>>;

const field =
  'w-full rounded-lg border border-dark-400 bg-dark-700 px-3 py-2.5 text-white placeholder-gray-500 outline-none focus:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500 aria-[invalid=true]:border-red-400';
const label = 'mb-1 block text-sm font-medium text-gray-200';

export default function RequestForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? '').trim();

    const next: Errors = {};
    if (!v('name')) next.name = 'Enter your name.';
    if (v('phone').replace(/\D/g, '').length < 7) next.phone = 'Enter a phone number we can reach you at.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) next.email = 'Enter a valid email address, like name@example.com.';
    if (f.get('consent') !== 'on') next.consent = 'Please confirm we may contact you about this request.';
    setErrors(next);
    if (Object.keys(next).length) {
      const first = (['name', 'phone', 'email', 'consent'] as const).find((k) => next[k]);
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setStatus('sending');
    setServerError('');
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: v('name'),
          phone: v('phone'),
          email: v('email'),
          service: v('service'),
          documents: v('documents'),
          date: v('date'),
          time: v('time'),
          address: v('address'),
          notes: v('notes'),
          website: v('website'), // honeypot
          consent: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus('done');
        setTimeout(() => doneRef.current?.focus(), 50);
      } else {
        setServerError(data.error ?? 'Something went wrong. Please call 943-255-4501.');
        setStatus('error');
      }
    } catch {
      setServerError('We could not reach the server. Please call 943-255-4501.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div role="status" className="rounded-2xl border border-gold-600/50 bg-dark-800 p-8 text-center">
        <CheckCircle2 className="mx-auto text-gold-400" size={44} aria-hidden="true" />
        <h2 ref={doneRef} tabIndex={-1} className="mt-4 font-heading text-2xl text-gold-300 outline-none">
          Request received
        </h2>
        <p className="mt-2 text-gray-300">Thank you. We&apos;ll contact you shortly to confirm your appointment.</p>
        <p className="mt-1 text-sm text-gray-400">Need us sooner? Call or text 943-255-4501.</p>
      </div>
    );
  }

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <p id={`${k}-err`} className="mt-1 text-sm text-red-300">
        {errors[k]}
      </p>
    ) : null;
  const a11y = (k: keyof Errors) => ({
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? `${k}-err` : undefined,
  });

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl border border-dark-400 bg-dark-800 p-5 sm:p-8">
      {Object.keys(errors).length > 0 && (
        <div role="alert" className="rounded-lg border border-red-400/60 bg-red-950/40 p-3 text-sm text-red-200">
          Please fix the highlighted fields below.
        </div>
      )}
      {status === 'error' && (
        <div role="alert" className="rounded-lg border border-red-400/60 bg-red-950/40 p-3 text-sm text-red-200">
          {serverError}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={label}>
            Full name <span aria-hidden="true">*</span>
          </label>
          <input id="name" name="name" autoComplete="name" required aria-required="true" className={field} {...a11y('name')} />
          {err('name')}
        </div>
        <div>
          <label htmlFor="phone" className={label}>
            Phone <span aria-hidden="true">*</span>
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" required aria-required="true" className={field} {...a11y('phone')} />
          {err('phone')}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="email" className={label}>
            Email <span aria-hidden="true">*</span>
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required aria-required="true" className={field} {...a11y('email')} />
          {err('email')}
        </div>
        <div>
          <label htmlFor="service" className={label}>
            Service needed
          </label>
          <select id="service" name="service" className={field} defaultValue="">
            <option value="">Not sure / other</option>
            {NOTARY_SERVICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="documents" className={label}>
            Number of documents
          </label>
          <input id="documents" name="documents" type="number" min={1} inputMode="numeric" className={field} />
        </div>
        <div>
          <label htmlFor="date" className={label}>
            Preferred date
          </label>
          <input id="date" name="date" type="date" className={field} />
        </div>
        <div>
          <label htmlFor="time" className={label}>
            Preferred time
          </label>
          <select id="time" name="time" className={field} defaultValue="">
            <option value="">Any time</option>
            <option>Morning (8am–12pm)</option>
            <option>Afternoon (12pm–5pm)</option>
            <option>Evening (5pm–8pm)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="address" className={label}>
            Signing location (for mobile appointments)
          </label>
          <input id="address" name="address" autoComplete="street-address" className={field} placeholder="Street, city, ZIP" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="notes" className={label}>
            Anything else we should know?
          </label>
          <textarea id="notes" name="notes" rows={4} maxLength={2000} className={field} />
        </div>
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm text-gray-200">
          <input type="checkbox" name="consent" className="mt-0.5 h-5 w-5 shrink-0 accent-[#D4AF37]" {...a11y('consent')} />
          <span>
            I agree that M&amp;S Professional Notary Services may contact me by phone, text or email about this request.
            We use your details only to respond to you.
          </span>
        </label>
        {err('consent')}
      </div>

      <p className="text-xs text-gray-500">
        A notary public is not an attorney and cannot give legal advice. Pricing is disclosed before your appointment.
      </p>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3.5 font-semibold text-black hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
      >
        {status === 'sending' ? (
          <>
            <Loader2 className="animate-spin" size={18} aria-hidden="true" /> Sending…
          </>
        ) : (
          'Request appointment'
        )}
      </button>
    </form>
  );
}
