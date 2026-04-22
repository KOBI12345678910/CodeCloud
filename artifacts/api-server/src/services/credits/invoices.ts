import { db, billingInvoicesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { createHash } from "node:crypto";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitMicroUsd: number;
  amountMicroUsd: number;
}

export async function createInvoice(opts: {
  userId: string;
  description: string;
  lineItems: InvoiceLineItem[];
  taxMicroUsd?: number;
  stripeInvoiceId?: string | null;
  stripeEventId?: string | null;
  hostedUrl?: string | null;
  status?: typeof billingInvoicesTable.$inferInsert.status;
}): Promise<typeof billingInvoicesTable.$inferSelect> {
  // Idempotency: prefer stripeEventId (always unique per webhook), fall back
  // to stripeInvoiceId. If a matching invoice already exists, return it.
  if (opts.stripeEventId) {
    const [existing] = await db.select().from(billingInvoicesTable)
      .where(and(eq(billingInvoicesTable.userId, opts.userId), eq(billingInvoicesTable.stripeEventId, opts.stripeEventId)))
      .limit(1);
    if (existing) return existing;
  }
  if (opts.stripeInvoiceId) {
    const [existing] = await db.select().from(billingInvoicesTable)
      .where(and(eq(billingInvoicesTable.userId, opts.userId), eq(billingInvoicesTable.stripeInvoiceId, opts.stripeInvoiceId)))
      .limit(1);
    if (existing) return existing;
  }
  const subtotal = opts.lineItems.reduce((s, li) => s + li.amountMicroUsd, 0);
  const tax = opts.taxMicroUsd ?? 0;
  const total = subtotal + tax;
  const number = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const [row] = await db.insert(billingInvoicesTable).values({
    userId: opts.userId, number,
    stripeInvoiceId: opts.stripeInvoiceId ?? null,
    stripeEventId: opts.stripeEventId ?? null,
    status: opts.status ?? "paid", amountMicroUsd: subtotal, taxMicroUsd: tax, totalMicroUsd: total,
    description: opts.description, lineItems: opts.lineItems as unknown as object,
    hostedUrl: opts.hostedUrl ?? null, paidAt: opts.status === "paid" ? new Date() : null,
  }).returning();
  return row;
}

export async function listInvoices(userId: string): Promise<typeof billingInvoicesTable.$inferSelect[]> {
  return db.select().from(billingInvoicesTable).where(eq(billingInvoicesTable.userId, userId)).orderBy(desc(billingInvoicesTable.issuedAt));
}

export async function getInvoice(userId: string, id: string): Promise<typeof billingInvoicesTable.$inferSelect | null> {
  const [row] = await db.select().from(billingInvoicesTable).where(and(eq(billingInvoicesTable.id, id), eq(billingInvoicesTable.userId, userId)));
  return row ?? null;
}

function fmtUsd(microUsd: number): string {
  const usd = microUsd / 1_000_000;
  return `$${usd.toFixed(usd < 1 ? 4 : 2)}`;
}

export function renderInvoicePdf(inv: typeof billingInvoicesTable.$inferSelect): { pdf: Buffer; hash: string } {
  const lineItems = inv.lineItems as unknown as InvoiceLineItem[];
  const lines: string[] = [];
  lines.push(`Invoice ${inv.number}`);
  lines.push(`Issued: ${inv.issuedAt.toISOString().slice(0, 10)}`);
  lines.push(`Status: ${inv.status.toUpperCase()}`);
  lines.push("");
  lines.push(inv.description ?? "Service");
  lines.push("");
  lines.push("Line items:");
  for (const li of lineItems) {
    lines.push(`  - ${li.description}  x${li.quantity}  @${fmtUsd(li.unitMicroUsd)}  =  ${fmtUsd(li.amountMicroUsd)}`);
  }
  lines.push("");
  lines.push(`Subtotal: ${fmtUsd(Number(inv.amountMicroUsd))}`);
  lines.push(`Tax:      ${fmtUsd(Number(inv.taxMicroUsd))}`);
  lines.push(`Total:    ${fmtUsd(Number(inv.totalMicroUsd))}`);

  const text = lines.join("\n");
  const encodedText = text.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = `BT /F1 11 Tf 50 780 Td 14 TL\n` +
    text.split("\n").map((l, i) => (i === 0 ? `(${l.replace(/[()\\]/g, (m) => "\\" + m)}) Tj` : `T* (${l.replace(/[()\\]/g, (m) => "\\" + m)}) Tj`)).join("\n") +
    `\nET`;
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
  objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${o.toString().padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const buf = Buffer.from(pdf, "binary");
  const hash = createHash("sha256").update(buf).update(encodedText).digest("hex");
  return { pdf: buf, hash };
}

export async function ensureInvoicePdfHash(inv: typeof billingInvoicesTable.$inferSelect): Promise<string> {
  if (inv.pdfHash) return inv.pdfHash;
  const { hash } = renderInvoicePdf(inv);
  await db.update(billingInvoicesTable).set({ pdfHash: hash }).where(eq(billingInvoicesTable.id, inv.id));
  return hash;
}
