// M&S Professional Notary Services — service menu, pricing rules and quote math.
// Service names come straight from the printed flyer.

export const NOTARY_SERVICES = [
  'Acknowledgments',
  'Jurat (Oaths & Affirmations)',
  'Power of Attorney Documents',
  'Real Estate Documents',
  'Loan & Mortgage Documents',
  'Affidavits',
  'Wills & Estate Planning Documents',
  'Vehicle/Title Documents',
  'Business Documents',
  'Medical & Healthcare Forms',
  'School & Consent Forms',
  'Travel Consent Letters',
  'Copy Certification (if allowed)',
  'General Notary Work',
  'Mobile Notary Services (by appointment)',
] as const;

export type NotaryService = (typeof NOTARY_SERVICES)[number];

export const MOBILE_SERVICE: NotaryService = 'Mobile Notary Services (by appointment)';

/** Services that can be priced as a flat loan-signing package instead of per document. */
export const PACKAGE_SERVICES: NotaryService[] = ['Real Estate Documents', 'Loan & Mortgage Documents'];

/** Flat-fee loan signing packages. Each includes dual printing, travel and scan-backs. */
export const PACKAGES = [
  {
    id: 'heloc',
    label: 'HELOC (Line of Credit)',
    low: 75,
    high: 125,
    fee: 100,
    why: 'Very small paper stack; fewer forms.',
  },
  {
    id: 'seller',
    label: 'Seller-Only Package',
    low: 100,
    high: 150,
    fee: 125,
    why: 'Minimal lending paperwork; mostly transferring the deed.',
  },
  {
    id: 'refi-purchase',
    label: 'Refinance / Home Purchase',
    low: 150,
    high: 250,
    fee: 200,
    why: 'Full 100+ page lender stacks requiring maximum execution time.',
  },
] as const;

export type PackageId = (typeof PACKAGES)[number]['id'];

export const PACKAGE_INCLUDES = [
  'Dual document printing (lender stack + borrower copy)',
  'Travel to your home, workplace or a neutral meeting spot',
  'Scan-backs of the executed pages straight after signing',
];

export interface Business {
  name: string;
  tagline: string;
  phone: string;
  email: string;
}

export interface Rates {
  /** Notarial act fee per document. Georgia caps this by statute ($2 per act). */
  notarialFee: number;
  /** Convenience (service) fee per document: scheduling, handling, mobile availability. */
  convenienceFee: number;
  /** Price per printed page. */
  perPage: number;
  /** Price per mile driven. */
  perMile: number;
  /** Miles driven that are not charged. */
  freeMiles: number;
  /** Flat fee added to any non-package job that involves travel. */
  tripFee: number;
  /** Miles driven (total) covered by a loan-signing package before mileage applies. */
  packageFreeMiles: number;
}

export interface Settings {
  business: Business;
  rates: Rates;
  /** Minimum charge per service line (applies when documents × per-document fee is lower). */
  minimums: Record<string, number>;
  /** Flat fee per loan-signing package. */
  packageFees: Record<string, number>;
}

/**
 * Proposed minimums. Every service bills $25 per document; the minimum is the least
 * a single service line will ever cost. Edit them on the owner screen (/quote?owner=1).
 */
export const DEFAULT_MINIMUMS: Record<NotaryService, number> = {
  Acknowledgments: 25,
  'Jurat (Oaths & Affirmations)': 25,
  'Power of Attorney Documents': 50,
  'Real Estate Documents': 50,
  'Loan & Mortgage Documents': 50,
  Affidavits: 25,
  'Wills & Estate Planning Documents': 75,
  'Vehicle/Title Documents': 25,
  'Business Documents': 50,
  'Medical & Healthcare Forms': 25,
  'School & Consent Forms': 25,
  'Travel Consent Letters': 25,
  'Copy Certification (if allowed)': 25,
  'General Notary Work': 25,
  'Mobile Notary Services (by appointment)': 50,
};

export const DEFAULT_SETTINGS: Settings = {
  business: {
    name: 'M&S Professional Notary Services',
    tagline: 'Trust | Accuracy | Convenience',
    phone: '943-255-4501',
    email: 'mwrightsr.ganotary@gmail.com',
  },
  rates: {
    notarialFee: 2,
    convenienceFee: 23,
    perPage: 0.5,
    perMile: 0.7,
    freeMiles: 0,
    tripFee: 0,
    packageFreeMiles: 40,
  },
  minimums: { ...DEFAULT_MINIMUMS },
  packageFees: Object.fromEntries(PACKAGES.map((p) => [p.id, p.fee])),
};

export function mergeSettings(saved: Partial<Settings> | null | undefined): Settings {
  return {
    business: { ...DEFAULT_SETTINGS.business, ...saved?.business },
    rates: { ...DEFAULT_SETTINGS.rates, ...saved?.rates },
    minimums: { ...DEFAULT_SETTINGS.minimums, ...saved?.minimums },
    packageFees: { ...DEFAULT_SETTINGS.packageFees, ...saved?.packageFees },
  };
}

export interface LineItem {
  id: string;
  service: NotaryService;
  /** Number of documents / signed documents of this type. */
  documents: number;
  /** Set when a loan-signing package replaces per-document pricing. */
  packageId: PackageId | null;
  /** Overrides the default package fee for this job. */
  packageFee?: number;
}

export interface Travel {
  enabled: boolean;
  /** Miles from the notary to the signing location (one way). */
  miles: number;
  roundTrip: boolean;
}

export interface Printing {
  enabled: boolean;
  pages: number;
}

export interface JobInput {
  items: LineItem[];
  travel: Travel;
  printing: Printing;
}

export interface QuoteLine {
  label: string;
  detail: string;
  amount: number;
}

export interface Quote {
  lines: QuoteLine[];
  notaryTotal: number;
  travelTotal: number;
  printTotal: number;
  total: number;
  totalDocuments: number;
  /** Notarial act fees (per-document lines only). */
  actFees: number;
  /** Convenience / service fees (everything in notary fees that isn't a notarial act fee). */
  convenienceFees: number;
  hasPackage: boolean;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** Total charged per document: notarial act fee + convenience fee. */
export const perDocument = (r: Rates) => round2(r.notarialFee + r.convenienceFee);

export function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function packageFor(id: PackageId | null) {
  return PACKAGES.find((p) => p.id === id) ?? null;
}

export function calculateQuote(job: JobInput, settings: Settings): Quote {
  const { rates, minimums, packageFees } = settings;
  const lines: QuoteLine[] = [];

  let notaryTotal = 0;
  let totalDocuments = 0;
  let hasPackage = false;
  let actFees = 0;
  const perDoc = perDocument(rates);

  for (const item of job.items) {
    const pkg = PACKAGE_SERVICES.includes(item.service) ? packageFor(item.packageId) : null;

    if (pkg) {
      const fee = round2(clean(item.packageFee ?? packageFees[pkg.id] ?? pkg.fee));
      hasPackage = true;
      totalDocuments += 1;
      notaryTotal += fee;
      lines.push({
        label: `${item.service} — ${pkg.label}`,
        detail: 'Flat signing service fee. Includes dual printing, travel, scan-backs and the notarial act fees.',
        amount: fee,
      });
      continue;
    }

    const docs = Math.floor(clean(item.documents));
    if (docs === 0) continue;
    const base = round2(docs * perDoc);
    const min = clean(minimums[item.service] ?? 0);
    const amount = Math.max(base, min);
    notaryTotal += amount;
    totalDocuments += docs;
    actFees += round2(docs * rates.notarialFee);
    const each = `${money(rates.notarialFee)} notarial act + ${money(rates.convenienceFee)} convenience fee`;
    lines.push({
      label: item.service,
      detail:
        amount > base
          ? `${docs} × (${each}) = ${money(base)} — ${money(min)} minimum applies`
          : `${docs} × (${each})`,
      amount,
    });
  }

  // Packages already cover a drive of packageFreeMiles and the flat trip fee.
  let travelTotal = 0;
  const oneWay = clean(job.travel.miles);
  const freeMiles = hasPackage ? Math.max(rates.freeMiles, rates.packageFreeMiles) : rates.freeMiles;
  const tripFee = hasPackage ? 0 : rates.tripFee;
  if (job.travel.enabled && (oneWay > 0 || tripFee > 0)) {
    const driven = oneWay * (job.travel.roundTrip ? 2 : 1);
    const billable = Math.max(0, driven - clean(freeMiles));
    const mileage = round2(billable * rates.perMile);
    if (billable > 0) {
      lines.push({
        label: 'Travel / mileage',
        detail: `${trim(driven)} mi${job.travel.roundTrip ? ' round trip' : ' one way'}${
          freeMiles > 0 ? `, first ${trim(freeMiles)} mi included` : ''
        } × ${money(rates.perMile)}/mi`,
        amount: mileage,
      });
    }
    travelTotal += mileage;
    if (tripFee > 0) {
      lines.push({ label: 'Trip fee', detail: 'Flat fee per travel job', amount: round2(tripFee) });
      travelTotal += tripFee;
    }
    travelTotal = round2(travelTotal);
  }

  let printTotal = 0;
  const pages = Math.floor(clean(job.printing.pages));
  if (job.printing.enabled && pages > 0) {
    printTotal = round2(pages * rates.perPage);
    lines.push({
      label: hasPackage ? 'Additional printing' : 'Printing',
      detail: `${pages} page${pages === 1 ? '' : 's'} × ${money(rates.perPage)} per page`,
      amount: printTotal,
    });
  }

  return {
    lines,
    notaryTotal: round2(notaryTotal),
    travelTotal,
    printTotal,
    total: round2(notaryTotal + travelTotal + printTotal),
    totalDocuments,
    actFees: round2(actFees),
    convenienceFees: round2(notaryTotal - actFees),
    hasPackage,
  };
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
