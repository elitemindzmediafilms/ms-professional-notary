import Link from 'next/link';
import {
  BadgeCheck,
  CalendarClock,
  Car,
  Check,
  FileText,
  Handshake,
  Mail,
  Phone,
  Printer,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import {
  DEFAULT_SETTINGS,
  NOTARY_SERVICES,
  PACKAGES,
  PACKAGE_INCLUDES,
  PACKAGE_SERVICES,
  money,
  perDocument,
} from '@/lib/notary-data';

const { business, rates, minimums } = DEFAULT_SETTINGS;
const tel = `tel:${business.phone.replace(/\D/g, '')}`;

const WHY = [
  { Icon: ShieldCheck, label: 'Accurate service' },
  { Icon: Handshake, label: 'Professional & courteous' },
  { Icon: FileText, label: 'Confidential & secure' },
  { Icon: CalendarClock, label: 'Flexible scheduling' },
  { Icon: Car, label: 'Mobile notary available' },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-black to-dark-600">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <p className="text-sm uppercase tracking-[0.35em] text-gold-500">Your</p>
          <h1 className="font-heading text-5xl font-bold leading-tight text-gold-gradient sm:text-7xl">
            Trusted Notary
            <br />
            Solution
          </h1>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.4em] text-gray-200">
            Sign &nbsp;•&nbsp; Seal &nbsp;•&nbsp; Confidently
          </p>
          <p className="mx-auto mt-6 max-w-xl text-gray-400">
            Professional. Reliable. Convenient. Serving individuals, families &amp; businesses — at your home, your
            workplace or a neutral meeting spot, by appointment.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/quote"
              className="rounded-xl bg-gold-gradient px-7 py-3.5 font-semibold text-black hover:opacity-90"
            >
              Get an estimate
            </Link>
            <a
              href={tel}
              className="flex items-center gap-2 rounded-xl border border-gold-600/70 px-7 py-3.5 font-semibold text-gold-300 hover:bg-dark-600"
            >
              <Phone size={18} /> {business.phone}
            </a>
          </div>
        </div>
        <div className="rule-gold" />
      </section>

      {/* Why */}
      <section className="bg-black">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 text-center sm:grid-cols-3 lg:grid-cols-5">
          {WHY.map(({ Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-xs uppercase tracking-widest text-gray-300">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold-600">
                <Icon size={22} className="text-gold-400" />
              </span>
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl scroll-mt-4 px-4 py-16">
        <h2 className="font-heading text-3xl text-gold-300 sm:text-4xl">Notary services</h2>
        <p className="mt-2 text-gray-400">
          We can assist with the following. Each document is {money(perDocument(rates))}: a{' '}
          {money(rates.notarialFee)} notarial act fee plus a {money(rates.convenienceFee)} convenience fee, with a
          minimum charge per service.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NOTARY_SERVICES.map((s) => {
            const loan = PACKAGE_SERVICES.includes(s);
            return (
              <div key={s} className="flex items-start gap-3 rounded-xl border border-dark-400 bg-dark-800 p-4">
                <BadgeCheck className="mt-0.5 shrink-0 text-gold-500" size={20} />
                <div>
                  <p className="font-medium text-white">{s}</p>
                  <p className="text-xs text-gray-500">
                    From {money(minimums[s])}
                    {loan && ' · flat-fee loan signings available'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-4 border-y border-gold-600/30 bg-dark-800 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-heading text-3xl text-gold-300 sm:text-4xl">Pricing &amp; what to expect</h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-dark-400 bg-dark-700 p-6">
              <p className="text-xs uppercase tracking-widest text-gold-500">Standard notarizations</p>
              <p className="mt-2 font-heading text-4xl text-white">{money(perDocument(rates))}</p>
              <p className="text-sm text-gray-400">per document / signed document</p>
              <p className="mt-4 text-sm text-gray-400">
                {money(rates.notarialFee)} notarial act fee (the Georgia per-act rate) + {money(rates.convenienceFee)}{' '}
                convenience fee for scheduling, handling and mobile availability. Each service has a minimum charge —
                see “From” prices above.
              </p>
            </div>
            <div className="rounded-2xl border border-dark-400 bg-dark-700 p-6">
              <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold-500">
                <Car size={14} /> Mobile travel
              </p>
              <p className="mt-2 font-heading text-4xl text-white">{money(rates.perMile)}</p>
              <p className="text-sm text-gray-400">per mile driven</p>
              <p className="mt-4 text-sm text-gray-400">Round trip, by appointment.</p>
            </div>
            <div className="rounded-2xl border border-dark-400 bg-dark-700 p-6">
              <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold-500">
                <Printer size={14} /> Printing
              </p>
              <p className="mt-2 font-heading text-4xl text-white">{money(rates.perPage)}</p>
              <p className="text-sm text-gray-400">per printed page</p>
              <p className="mt-4 text-sm text-gray-400">Loan-signing packages include their own printing.</p>
            </div>
          </div>

          <h3 className="mt-14 font-heading text-2xl text-white">Mortgage &amp; real estate loan signings</h3>
          <p className="mt-2 max-w-3xl text-gray-400">
            Unlike a quick walk-in notarization, a loan signing is a flat fee that covers a lot of back-end work. The
            total depends on the type of transaction:
          </p>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-dark-400">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-black text-xs uppercase tracking-widest text-gold-500">
                <tr>
                  <th className="px-5 py-3">Transaction type</th>
                  <th className="px-5 py-3">Typical range</th>
                  <th className="px-5 py-3">Why it varies</th>
                </tr>
              </thead>
              <tbody>
                {PACKAGES.map((p) => (
                  <tr key={p.id} className="border-t border-dark-400 bg-dark-700">
                    <td className="px-5 py-4 font-medium text-white">{p.label}</td>
                    <td className="px-5 py-4 text-gold-300">
                      {money(p.low)} – {money(p.high)}
                    </td>
                    <td className="px-5 py-4 text-gray-400">{p.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gold-600/40 bg-dark-700 p-6">
              <h4 className="font-heading text-xl text-gold-300">Included in every loan signing</h4>
              <ul className="mt-4 space-y-3 text-sm text-gray-200">
                {PACKAGE_INCLUDES.map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check size={18} className="mt-0.5 shrink-0 text-gold-500" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <ScanLine size={14} /> Scan-backs let the lender clear funding without waiting for mail.
              </p>
            </div>
            <div className="rounded-2xl border border-dark-400 bg-dark-700 p-6">
              <h4 className="font-heading text-xl text-gold-300">Where your total comes from</h4>
              <ul className="mt-4 space-y-3 text-sm text-gray-300">
                <li>
                  <span className="font-medium text-white">Notary sourced by your title or escrow company</span> —
                  about $75–$150, usually bundled into your settlement fees.
                </li>
                <li>
                  <span className="font-medium text-white">Independent mobile signing agent</span> hired directly to
                  come to your home or office — about $150–$250+, for their time and direct travel.
                </li>
              </ul>
              <p className="mt-4 text-xs text-gray-500">
                Packages include travel for the first {rates.packageFreeMiles} miles driven; mileage applies beyond that.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/quote"
              className="inline-block rounded-xl bg-gold-gradient px-8 py-3.5 font-semibold text-black hover:opacity-90"
            >
              Build your estimate
            </Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-4 bg-gradient-to-b from-dark-600 to-black py-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-heading text-3xl text-gold-gradient sm:text-5xl">Contact us today</h2>
          <p className="mt-2 text-sm uppercase tracking-[0.35em] text-gray-300">For your notary needs</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-10">
            <a href={tel} className="flex items-center gap-3 text-2xl font-semibold hover:text-gold-300">
              <Phone className="text-gold-500" /> {business.phone}
            </a>
            <a href={`mailto:${business.email}`} className="flex items-center gap-3 text-lg hover:text-gold-300">
              <Mail className="text-gold-500" /> {business.email}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
