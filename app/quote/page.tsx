import type { Metadata } from 'next';
import Calculator from '@/components/Calculator';

export const metadata: Metadata = {
  title: 'Estimate & Invoice Calculator | M&S Professional Notary Services',
  description: 'Price a notary job — documents, mileage and printing — and download a PDF estimate or invoice.',
};

export default function QuotePage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-8">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-500">Estimate &amp; Invoice</p>
        <h1 className="font-heading text-3xl text-white sm:text-4xl">Price your notary job</h1>
      </section>
      <Calculator />
    </>
  );
}
