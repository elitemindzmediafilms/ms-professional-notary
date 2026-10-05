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

/** Flat-fee loan document signing support. `fee` is the starting price. */
export const PACKAGES = [
  { id: 'heloc', label: 'HELOC', fee: 125, to: null as number | null },
  { id: 'seller', label: 'Seller Package', fee: 125, to: null as number | null },
  { id: 'refinance', label: 'Refinance', fee: 175, to: 200 as number | null },
  { id: 'purchase', label: 'Purchase Package', fee: 200, to: null as number | null },
] as const;

export type PackageId = (typeof PACKAGES)[number]['id'];

export const PACKAGE_INCLUDES = [
  'Dual document printing (lender stack + borrower copy)',
  'Travel within 15 miles (see travel tiers)',
  'Scan-backs of the executed pages straight after signing',
];

export const LOAN_SUPERVISION_NOTE =
  'Loan-document services are subject to Georgia attorney-supervision requirements where applicable.';

export const FEE_DISCLOSURE =
  'Georgia law limits the fee for a notarial act to $2. Mobile service, travel, printing, document handling, scheduling and other non-notarial service charges are separate from the statutory notarial fee and are disclosed before the appointment. M&S Professional Notary Services does not provide legal advice or prepare legal documents.';

export interface Business {
  name: string;
  tagline: string;
  phone: string;
  email: string;
}

export interface Rates {
  /** Statutory notarial act fee per act (Georgia: $2). */
  notarialFee: number;
  /** Mobile / convenience service fee per document. */
  convenienceFee: number;
  /** Price per printed page. */
  perPage: number;
}

export interface TravelTiers {
  /** Miles (one way) included with a qualifying mobile service. */
  includedMiles: number;
  /** Upper bound of tier 2 and its surcharge. */
  tier2Max: number;
  tier2Fee: number;
  /** Upper bound of tier 3 and its surcharge. Beyond this is a custom quote. */
  tier3Max: number;
  tier3Fee: number;
}

export interface Settings {
  business: Business;
  rates: Rates;
  /** Least a standard (walk-in / non-travel) appointment will cost. */
  standardMinimum: number;
  /** Least a mobile appointment will cost, by service. */
  mobileMinimums: Record<string, number>;
  travel: TravelTiers;
  /** Starting fee per loan-signing package. */
  packageFees: Record<string, number>;
}

export const DEFAULT_MOBILE_MINIMUMS: Record<NotaryService, number> = {
  Acknowledgments: 50,
  'Jurat (Oaths & Affirmations)': 50,
  'Power of Attorney Documents': 50,
  'Real Estate Documents': 50,
  'Loan & Mortgage Documents': 50,
  Affidavits: 50,
  'Wills & Estate Planning Documents': 75,
  'Vehicle/Title Documents': 50,
  'Business Documents': 50,
  'Medical & Healthcare Forms': 50,
  'School & Consent Forms': 50,
  'Travel Consent Letters': 50,
  'Copy Certification (if allowed)': 50,
  'General Notary Work': 50,
  'Mobile Notary Services (by appointment)': 50,
};

export const DEFAULT_SETTINGS: Settings = {
  business: {
    name: 'M&S Professional Notary Services',
    tagline: 'Trust | Accuracy | Convenience',
    phone: '943-255-4501',
    email: 'mwrightsr.ganotary@gmail.com',
  },
  rates: { notarialFee: 2, convenienceFee: 23, perPage: 0.5 },
  standardMinimum: 25,
  mobileMinimums: { ...DEFAULT_MOBILE_MINIMUMS },
  travel: { includedMiles: 15, tier2Max: 25, tier2Fee: 15, tier3Max: 40, tier3Fee: 30 },
  packageFees: Object.fromEntries(PACKAGES.map((p) => [p.id, p.fee])),
};

export function mergeSettings(saved: Partial<Settings> | null | undefined): Settings {
  return {
    business: { ...DEFAULT_SETTINGS.business, ...saved?.business },
    rates: { ...DEFAULT_SETTINGS.rates, ...saved?.rates },
    standardMinimum: saved?.standardMinimum ?? DEFAULT_SETTINGS.standardMinimum,
    mobileMinimums: { ...DEFAULT_SETTINGS.mobileMinimums, ...saved?.mobileMinimums },
    travel: { ...DEFAULT_SETTINGS.travel, ...saved?.travel },
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
  /** True for a mobile job (the notary travels to the client). */
  enabled: boolean;
  /** Miles from the notary to the signing location (one way). */
  miles: number;
  /** Amount quoted by hand when the distance is beyond the last tier. */
  customFee: number;
}

export interface Printing {
  enabled: boolean;
  pages: number;
}

export interface JobInput {
  items: LineItem[];
  /** Notarial acts beyond one per document. */
  extraActs: number;
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
  /** Statutory notarial act fees. */
  actFees: number;
  /** Convenience / service fees (everything in notary fees that isn't an act fee). */
  convenienceFees: number;
  hasPackage: boolean;
  /** Travel distance is beyond the last tier and needs a hand-entered quote. */
  needsCustomTravel: boolean;
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

/** Which travel tier a one-way distance falls in. */
export function travelTier(miles: number, t: TravelTiers): 'included' | 'tier2' | 'tier3' | 'custom' {
  const m = clean(miles);
  if (m <= t.includedMiles) return 'included';
  if (m <= t.tier2Max) return 'tier2';
  if (m <= t.tier3Max) return 'tier3';
  return 'custom';
}

export function calculateQuote(job: JobInput, settings: Settings): Quote {
  const { rates, packageFees, travel: tiers } = settings;
  const mobile = job.travel.enabled;
  const lines: QuoteLine[] = [];
  const perDoc = perDocument(rates);

  let notaryTotal = 0;
  let totalDocuments = 0;
  let hasPackage = false;
  let actFees = 0;
  let docSubtotal = 0; // per-document lines, subject to the appointment minimum
  let minimumRequired = 0;

  for (const item of job.items) {
    const pkg = PACKAGE_SERVICES.includes(item.service) ? packageFor(item.packageId) : null;

    if (pkg) {
      const fee = round2(clean(item.packageFee ?? packageFees[pkg.id] ?? pkg.fee));
      hasPackage = true;
      totalDocuments += 1;
      notaryTotal += fee;
      lines.push({
        label: `${item.service} — ${pkg.label}`,
        detail: `Flat signing support fee. Includes dual printing, scan-backs, notarial act fees and travel within ${tiers.includedMiles} mi. ${LOAN_SUPERVISION_NOTE}`,
        amount: fee,
      });
      continue;
    }

    const docs = Math.floor(clean(item.documents));
    if (docs === 0) continue;
    const amount = round2(docs * perDoc);
    notaryTotal += amount;
    docSubtotal += amount;
    totalDocuments += docs;
    actFees += round2(docs * rates.notarialFee);
    minimumRequired = Math.max(
      minimumRequired,
      mobile ? clean(settings.mobileMinimums[item.service] ?? 0) : clean(settings.standardMinimum),
    );
    lines.push({
      label: item.service,
      detail: `${docs} × (${money(rates.notarialFee)} notarial act + ${money(rates.convenienceFee)} mobile/convenience service)`,
      amount,
    });
  }

  const extra = Math.floor(clean(job.extraActs));
  if (extra > 0) {
    const amount = round2(extra * rates.notarialFee);
    notaryTotal += amount;
    docSubtotal += amount;
    actFees += amount;
    lines.push({
      label: 'Additional notarial acts',
      detail: `${extra} × ${money(rates.notarialFee)} statutory fee`,
      amount,
    });
  }

  if (minimumRequired > docSubtotal && docSubtotal > 0) {
    const adj = round2(minimumRequired - docSubtotal);
    notaryTotal += adj;
    lines.push({
      label: mobile ? 'Mobile appointment minimum' : 'Appointment minimum',
      detail: `${money(minimumRequired)} minimum applies (adds ${money(adj)})`,
      amount: adj,
    });
  }

  // Travel applies to mobile jobs only. Distance is one way.
  let travelTotal = 0;
  let needsCustomTravel = false;
  if (mobile && clean(job.travel.miles) > 0) {
    const miles = clean(job.travel.miles);
    const tier = travelTier(miles, tiers);
    const mi = Number.isInteger(miles) ? String(miles) : miles.toFixed(1);
    if (tier === 'tier2' || tier === 'tier3') {
      const fee = tier === 'tier2' ? tiers.tier2Fee : tiers.tier3Fee;
      const range =
        tier === 'tier2' ? `${tiers.includedMiles + 1}–${tiers.tier2Max}` : `${tiers.tier2Max + 1}–${tiers.tier3Max}`;
      travelTotal = round2(fee);
      lines.push({ label: 'Travel', detail: `${mi} mi from base (${range} mi tier)`, amount: travelTotal });
    } else if (tier === 'custom') {
      needsCustomTravel = true;
      travelTotal = round2(clean(job.travel.customFee));
      lines.push({
        label: 'Travel — custom quote',
        detail: `${mi} mi from base (over ${tiers.tier3Max} mi)`,
        amount: travelTotal,
      });
    }
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
    needsCustomTravel,
  };
}
