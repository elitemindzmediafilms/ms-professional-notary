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
  FEE_DISCLOSURE,
  LOAN_SUPERVISION_NOTE,
  NOTARY_SERVICES,
  PACKAGES,
  PACKAGE_INCLUDES,
  PACKAGE_SERVICES,
  money,
  perDocument,
} from '@/lib/notary-data';

const { business, rates, standardMinimum, mobileMinimums, travel } = DEFAULT_SETTINGS;
const tel = `tel:${business.phone.replace(/\D/g, '')}`;

const WHY = [
  { Icon: ShieldCheck, label: 'Accurate service' },
  { Icon: Handshake, label: 'Professional & courteous' },
  { Icon: FileText, label: 'Confidential & secure' },
  { Icon: CalendarClock, label: 'Flexible scheduling' },
  { Icon: Car, label: 'Mobile notary available' },
];

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dark-400/60 pb-2 last:border-0">
      <dt className="text-gray-300">{k}</dt>
      <dd className="text-right font-medium text-gold-300">{v}</dd>
    </div>
  );
}

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
          We can assist with the following. Standard appointments start at {money(standardMinimum)}; mobile
          appointments start at {money(mobileMinimums['General Notary Work'])}.
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
                    Standard from {money(standardMinimum)} · Mobile from {money(mobileMinimums[s])}
                    {loan && ' · loan signing support available'}
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
          <h2 className="font-heading text-3xl text-gold-300 sm:text-4xl">Pricing</h2>
          <p className="mt-2 text-gray-400">Clear, up-front pricing — disclosed before your appointment.</p>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-dark-400 bg-dark-700 p-6">
              <p className="text-xs uppercase tracking-widest text-gold-500">Standard notary services</p>
              <dl className="mt-4 space-y-3 text-sm">
                <Row k="Georgia notarial act" v={`${money(rates.notarialFee)} per notarial act`} />
                <Row k="Mobile / convenience service" v={`starting at ${money(rates.convenienceFee)}`} />
                <Row k="Standard appointment minimum" v={money(standardMinimum)} />
              </dl>
              <p className="mt-4 text-xs text-gray-500">
                Together that is {money(perDocument(rates))} per document.
              </p>
            </div>

            <div className="rounded-2xl border border-dark-400 bg-dark-700 p-6">
              <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold-500">
                <Car size={14} /> Mobile notary services
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <Row k="General mobile notary" v={`${money(mobileMinimums['General Notary Work'])} minimum`} />
                <Row k="Power of attorney" v={`${money(mobileMinimums['Power of Attorney Documents'])} minimum`} />
                <Row k="Business documents" v={`${money(mobileMinimums['Business Documents'])} minimum`} />
                <Row
                  k="Wills & estate documents"
                  v={`${money(mobileMinimums['Wills & Estate Planning Documents'])} minimum`}
                />
                <Row k="Additional statutory notarial acts" v={`${money(rates.notarialFee)} each`} />
              </dl>
            </div>
          </div>

          <h3 className="mt-14 font-heading text-2xl text-white">Loan document signing support</h3>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-dark-400">
              <table className="w-full text-left text-sm">
                <thead className="bg-black text-xs uppercase tracking-widest text-gold-500">
                  <tr>
                    <th className="px-5 py-3">Package</th>
                    <th className="px-5 py-3">Starting at</th>
                  </tr>
                </thead>
                <tbody>
                  {PACKAGES.map((p) => (
                    <tr key={p.id} className="border-t border-dark-400 bg-dark-700">
                      <td className="px-5 py-4 font-medium text-white">{p.label}</td>
                      <td className="px-5 py-4 text-gold-300">
                        {money(p.fee)}
                        {p.to ? `–${money(p.to)}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl border border-gold-600/40 bg-dark-700 p-6">
              <h4 className="font-heading text-xl text-gold-300">Included with every loan signing</h4>
              <ul className="mt-4 space-y-3 text-sm text-gray-200">
                {PACKAGE_INCLUDES.map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check size={18} className="mt-0.5 shrink-0 text-gold-500" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-start gap-2 text-xs text-gray-400">
                <ScanLine size={14} className="mt-0.5 shrink-0" /> {LOAN_SUPERVISION_NOTE}
              </p>
            </div>
          </div>

          <h3 className="mt-14 font-heading text-2xl text-white">Travel</h3>
          <p className="mt-1 text-sm text-gray-400">Distance is measured one way from our base to your signing location.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [`0–${travel.includedMiles} miles`, 'Included with qualifying mobile service'],
              [`${travel.includedMiles + 1}–${travel.tier2Max} miles`, `+${money(travel.tier2Fee)}`],
              [`${travel.tier2Max + 1}–${travel.tier3Max} miles`, `+${money(travel.tier3Fee)}`],
              [`${travel.tier3Max}+ miles`, 'Custom quote'],
            ].map(([a, b]) => (
              <div key={a} className="rounded-xl border border-dark-400 bg-dark-700 p-5">
                <p className="font-heading text-xl text-white">{a}</p>
                <p className="mt-1 text-sm text-gold-300">{b}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-gray-400">
            <Printer size={14} /> Printing for non-loan documents is {money(rates.perPage)} per page.
          </p>

          <p className="mt-10 rounded-xl border border-dark-400 bg-black/40 p-5 text-xs leading-relaxed text-gray-400">
            <span className="font-semibold text-gray-300">Fee Disclosure:</span> {FEE_DISCLOSURE}
          </p>

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
