import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, organizationsTable, orgMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function generateDpaDocument(org: { name: string; slug: string; plan: string; dataRegion: string }): string {
  const date = new Date().toISOString().split("T")[0];
  return `DATA PROCESSING AGREEMENT (DPA)

Effective Date: ${date}
Agreement ID: DPA-${org.slug}-${Date.now().toString(36).toUpperCase()}

BETWEEN:

Data Controller: ${org.name} ("Controller")
Data Processor: CodeCloud, Inc. ("Processor")

1. DEFINITIONS
   "Personal Data" means any information relating to an identified or identifiable natural person.
   "Processing" means any operation performed on Personal Data.
   "Sub-processor" means any third party engaged by the Processor to process Personal Data.

2. SCOPE AND PURPOSE
   This DPA governs the processing of Personal Data by the Processor on behalf of the Controller in connection with the CodeCloud platform services under the ${org.plan} plan.

3. DATA CATEGORIES PROCESSED
   - Account data (email, username, display name, profile picture)
   - Project data (source code, files, metadata)
   - Usage data (actions, timestamps, IP addresses)
   - AI interaction data (prompts, completions)
   - Billing data (plan details, invoice history — payment tokens handled by Stripe)

4. PROCESSING PURPOSES
   - Provision of cloud development platform services
   - AI-assisted code generation and analysis
   - Deployment and hosting services
   - Security monitoring and fraud prevention
   - Billing and account management

5. DATA RESIDENCY
   Primary data region: ${org.dataRegion.toUpperCase()}
   Data is stored and processed in the selected region unless technical requirements necessitate cross-region transfer with appropriate safeguards.

6. SUB-PROCESSORS
   The Processor engages the following sub-processors:
   - Clerk (authentication and session management)
   - Stripe (payment processing)
   - Anthropic, OpenAI, Google (AI model inference)
   - Cloud infrastructure providers (compute, storage, CDN)

   The Controller will be notified 30 days before any new sub-processor is engaged.

7. SECURITY MEASURES
   - Encryption in transit (TLS 1.2+)
   - Encryption at rest (AES-256)
   - Per-project secret encryption
   - Role-based access control
   - Audit logging of all state-changing operations
   - Regular security assessments

8. DATA SUBJECT RIGHTS
   The Processor supports the Controller in responding to data subject requests including:
   - Right of access (data export)
   - Right to rectification (profile editing)
   - Right to erasure (account deletion with 30-day grace period)
   - Right to data portability (structured data export)
   - Right to object (consent management)

9. DATA BREACH NOTIFICATION
   The Processor will notify the Controller of any Personal Data breach without undue delay, and in any event within 72 hours of becoming aware of the breach.

10. DATA RETENTION
    - Active account data: retained while account exists
    - Deleted account data: purged within 30 days
    - Backup data: rotated within 90 days
    - Financial records: retained for 7 years per legal requirements
    - Organization-specific retention policies may override defaults

11. AUDIT RIGHTS
    The Controller may audit the Processor's compliance with this DPA upon 30 days' written notice, no more than once per year.

12. TERMINATION
    Upon termination, the Processor will delete or return all Personal Data within 30 days, unless retention is required by law.

13. GOVERNING LAW
    This DPA is governed by the laws applicable to the main service agreement.

SIGNATURES:

For ${org.name} (Controller):
Name: _________________________
Title: _________________________
Date: _________________________

For CodeCloud, Inc. (Processor):
Name: _________________________
Title: Data Protection Officer
Date: ${date}
`;
}

router.get("/organizations/:orgId/dpa", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const orgId = req.params.orgId as string;

  const [membership] = await db.select()
    .from(orgMembersTable)
    .where(and(eq(orgMembersTable.orgId, orgId), eq(orgMembersTable.userId, user.id)));

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    res.status(403).json({ error: "Only org owners and admins can access the DPA" });
    return;
  }

  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  const dpa = generateDpaDocument({
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    dataRegion: org.dataRegion,
  });

  const format = req.query.format as string;
  if (format === "text") {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="DPA-${org.slug}.txt"`);
    res.send(dpa);
  } else {
    res.json({
      orgId: org.id,
      orgName: org.name,
      generatedAt: new Date().toISOString(),
      document: dpa,
    });
  }
});

export default router;
