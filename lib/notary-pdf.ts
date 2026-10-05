import { money, type Business, type Quote } from '@/lib/notary-data';

export interface PdfClient {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface PdfOptions {
  kind: 'Invoice' | 'Estimate';
  number: string;
  date: string; // already formatted
  client: PdfClient;
  jobNotes: string;
  business: Business;
  quote: Quote;
}

const GOLD: [number, number, number] = [184, 150, 12];
const INK: [number, number, number] = [17, 17, 17];
const MUTED: [number, number, number] = [110, 110, 110];

async function loadLogo(): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const blob = await (await fetch('/ms-notary-logo.png')).blob();
    const data = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
    const dim = await new Promise<{ w: number; h: number }>((res, rej) => {
      const img = new Image();
      img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = rej;
      img.src = data;
    });
    return { data, ...dim };
  } catch {
    return null; // fall back to a text header
  }
}

/** Builds the client-facing PDF and returns it as a Blob plus a suggested filename. */
export async function buildNotaryPdf(o: PdfOptions): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;

  // ── Header: logo on white, gold rule ──
  const logo = await loadLogo();
  const logoH = 80;
  if (logo) doc.addImage(logo.data, 'PNG', M, 26, (logoH * logo.w) / logo.h, logoH);
  const textX = M + (logo ? (logoH * logo.w) / logo.h : 0) + 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  if (!logo) {
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...INK);
    doc.text(o.business.name, M, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
  }
  const hx = logo ? textX : M;
  doc.text(o.business.tagline.toUpperCase().replace(/\|/g, '  •  '), hx, logo ? 62 : 78);
  doc.text(o.business.phone, hx, logo ? 78 : 92);
  doc.text(o.business.email, hx, logo ? 92 : 106);

  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...INK);
  doc.text(o.kind.toUpperCase(), W - M, 62, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`No. ${o.number}`, W - M, 80, { align: 'right' });
  doc.text(o.date, W - M, 94, { align: 'right' });
  doc.setFillColor(...GOLD);
  doc.rect(M, 120, W - M * 2, 2.5, 'F');

  // ── Bill to ──
  let y = 156;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...GOLD);
  doc.text(o.kind === 'Invoice' ? 'BILLED TO' : 'PREPARED FOR', M, y);
  y += 16;
  doc.setTextColor(...INK);
  doc.setFontSize(12);
  doc.text(o.client.name || 'Client', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const clientLines = [o.client.email, o.client.phone, ...doc.splitTextToSize(o.client.address, 260)].filter(
    Boolean,
  );
  for (const line of clientLines) {
    y += 14;
    doc.text(String(line), M, y);
  }

  // ── Table ──
  y = Math.max(y + 34, 238);
  const colAmount = W - M;
  const colDetail = M + 215;

  const header = () => {
    doc.setFillColor(...INK);
    doc.rect(M, y, W - M * 2, 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(212, 175, 55);
    doc.text('SERVICE', M + 10, y + 16);
    doc.text('DETAILS', colDetail, y + 16);
    doc.text('AMOUNT', colAmount - 10, y + 16, { align: 'right' });
    y += 24;
  };
  header();

  o.quote.lines.forEach((l, i) => {
    const labelLines = doc.splitTextToSize(l.label, 195) as string[];
    const detailLines = doc.splitTextToSize(l.detail, colAmount - colDetail - 80) as string[];
    const rows = Math.max(labelLines.length, detailLines.length);
    const rowH = 12 * rows + 14;

    if (y + rowH > H - 190) {
      doc.addPage();
      y = M;
      header();
    }
    if (i % 2 === 0) {
      doc.setFillColor(247, 244, 234);
      doc.rect(M, y, W - M * 2, rowH, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(labelLines, M + 10, y + 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(detailLines, colDetail, y + 17);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(money(l.amount), colAmount - 10, y + 17, { align: 'right' });
    y += rowH;
  });

  if (o.quote.lines.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text('No services selected.', M + 10, y + 20);
    y += 34;
  }

  // ── Totals ──
  if (y + 150 > H - 90) {
    doc.addPage();
    y = M;
  }
  y += 18;
  const tx = W - M - 200;
  const subtotal = (label: string, value: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(label, tx, y);
    doc.setTextColor(...INK);
    doc.text(money(value), colAmount - 10, y, { align: 'right' });
    y += 17;
  };
  if (o.quote.actFees > 0) subtotal('Notarial act fees', o.quote.actFees);
  subtotal('Convenience & service fees', o.quote.convenienceFees);
  if (o.quote.travelTotal > 0) subtotal('Travel', o.quote.travelTotal);
  if (o.quote.printTotal > 0) subtotal('Printing', o.quote.printTotal);

  y += 2;
  doc.setFillColor(...INK);
  doc.rect(tx - 12, y - 4, 212 + 0, 32, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(212, 175, 55);
  doc.text(o.kind === 'Invoice' ? 'TOTAL DUE' : 'ESTIMATED TOTAL', tx, y + 16);
  doc.setFontSize(14);
  doc.text(money(o.quote.total), colAmount - 10, y + 17, { align: 'right' });
  y += 56;

  // ── Notes ──
  if (o.jobNotes.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...GOLD);
    doc.text('NOTES', M, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const notes = doc.splitTextToSize(o.jobNotes.trim(), W - M * 2) as string[];
    doc.text(notes, M, y);
  }

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFillColor(...GOLD);
    doc.rect(M, H - 62, W - M * 2, 1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('Thank you for choosing ' + o.business.name + '.', W / 2, H - 46, { align: 'center' });
    doc.text(
      'Professional. Reliable. Convenient. — Serving individuals, families & businesses.',
      W / 2,
      H - 33,
      { align: 'center' },
    );
    if (pages > 1) doc.text(`Page ${p} of ${pages}`, W - M, H - 20, { align: 'right' });
  }

  const safe = (o.client.name || 'client').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return { blob: doc.output('blob'), filename: `${o.kind.toLowerCase()}-${o.number}-${safe || 'client'}.pdf` };
}
