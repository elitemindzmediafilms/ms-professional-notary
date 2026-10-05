import { DEFAULT_SETTINGS } from '@/lib/notary-data';

export default function SiteFooter() {
  const { name } = DEFAULT_SETTINGS.business;
  return (
    <footer className="border-t border-gold-600/40 bg-black py-8 text-center text-sm text-gray-400">
      <p className="font-heading text-gold-300">{name}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.25em]">Trust | Accuracy | Convenience</p>
      <p className="mt-3 text-xs text-gray-500">
        © {new Date().getFullYear()} {name}. A notary public is not an attorney and cannot give legal advice.
      </p>
    </footer>
  );
}
