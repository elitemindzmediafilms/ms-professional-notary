import Link from 'next/link';
import { Phone } from 'lucide-react';
import { DEFAULT_SETTINGS } from '@/lib/notary-data';

const NAV = [
  { href: '/#services', label: 'Services' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#contact', label: 'Contact' },
];

export default function SiteHeader() {
  const { phone } = DEFAULT_SETTINGS.business;
  return (
    <header className="border-b-4 border-gold-500 bg-white text-black">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
        <Link href="/" aria-label="M&S Professional Notary Services — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ms-notary-logo.png" alt="M&S Professional Notary Services" className="h-14 w-auto sm:h-[72px]" />
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hidden hover:text-gold-700 sm:block">
              {n.label}
            </Link>
          ))}
          <Link href="/quote" className="hidden hover:text-gold-700 sm:block">
            Estimate
          </Link>
          <Link href="/request" className="rounded-lg bg-black px-4 py-2 text-gold-300 hover:bg-dark-600">
            Request appointment
          </Link>
          <a href={`tel:${phone.replace(/\D/g, '')}`} className="hidden items-center gap-1.5 md:flex hover:text-gold-700">
            <Phone size={15} /> {phone}
          </a>
        </nav>
      </div>
    </header>
  );
}
