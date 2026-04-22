import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { listInvoices, getInvoice, renderInvoicePdf } from "../services/credits/invoices";

const router: IRouter = Router();

router.get("/billing/invoices", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const rows = await listInvoices(userId);
  res.json(rows.map((r) => ({
    id: r.id, number: r.number, status: r.status,
    amountUsd: Number(r.amountMicroUsd) / 1_000_000,
    taxUsd: Number(r.taxMicroUsd) / 1_000_000,
    totalUsd: Number(r.totalMicroUsd) / 1_000_000,
    description: r.description, issuedAt: r.issuedAt, paidAt: r.paidAt,
    pdfUrl: `/api/billing/invoices/${r.id}/pdf`, hostedUrl: r.hostedUrl,
  })));
});

router.get("/billing/invoices/:id/pdf", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthenticatedRequest;
  const inv = await getInvoice(userId, String(req.params.id));
  if (!inv) { res.status(404).json({ error: "Invoice not found" }); return; }
  const { pdf, hash } = renderInvoicePdf(inv);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${inv.number}.pdf"`);
  res.setHeader("X-Invoice-Hash", hash);
  res.end(pdf);
});

export default router;
