import type { Metadata } from 'next';
import RequestForm from '@/components/RequestForm';

export const metadata: Metadata = {
  title: 'Request an Appointment | M&S Professional Notary Services',
  description: 'Request a notary or mobile notary appointment. We respond quickly to confirm your time and pricing.',
};

export default function RequestPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-500">Appointments</p>
      <h1 className="font-heading text-3xl text-white sm:text-4xl">Request an appointment</h1>
      <p className="mb-8 mt-2 text-gray-400">
        Tell us what you need and when. We&apos;ll confirm your time and pricing before your appointment.
      </p>
      <RequestForm />
    </section>
  );
}
