import { Router, type IRouter } from "express";
import { db, domainsTable, projectsTable, collaboratorsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireProjectAccess } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import { domainsService } from "../services/domains";

const router: IRouter = Router();

async function checkDomainAccess(
  domainId: string,
  userId: string,
  required: "viewer" | "editor" | "admin",
): Promise<{ ok: true; projectId: string } | { ok: false; status: number; error: string }> {
  const [domain] = await db.select().from(domainsTable).where(eq(domainsTable.id, domainId));
  if (!domain) return { ok: false, status: 404, error: "Domain not found" };
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, domain.projectId));
  if (!project) return { ok: false, status: 404, error: "Project not found" };
  if (project.ownerId === userId) return { ok: true, projectId: domain.projectId };
  const [collab] = await db.select().from(collaboratorsTable).where(
    and(eq(collaboratorsTable.projectId, domain.projectId), eq(collaboratorsTable.userId, userId)),
  );
  if (!collab) return { ok: false, status: 403, error: "Forbidden" };
  const rank = { viewer: 0, editor: 1, admin: 2 } as const;
  if (rank[collab.role as keyof typeof rank] < rank[required]) {
    return { ok: false, status: 403, error: "Insufficient permissions" };
  }
  return { ok: true, projectId: domain.projectId };
}


router.post("/projects/:id/domains", requireAuth, requireProjectAccess("admin"), async (req, res): Promise<void> => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const result = await domainsService.addDomain(userId, req.params.id as string, req.body.domain);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/projects/:id/domains", requireAuth, requireProjectAccess("viewer"), async (req, res): Promise<void> => {
  try {
    const domains = await domainsService.listDomains(req.params.id as string);
    res.json({ domains });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/domains/:id/verify", requireAuth, async (req, res): Promise<void> => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const access = await checkDomainAccess(req.params.id as string, userId, "editor");
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }
    const result = await domainsService.verifyDNS(req.params.id as string);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/domains/:id/verify", requireAuth, async (req, res): Promise<void> => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const access = await checkDomainAccess(req.params.id as string, userId, "viewer");
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }
    const [domain] = await db.select().from(domainsTable).where(eq(domainsTable.id, req.params.id as string));
    if (!domain) {
      res.status(404).json({ error: "Domain not found" });
      return;
    }
    res.json({
      domain: domain.domain,
      dnsVerified: domain.dnsVerified,
      sslStatus: domain.sslStatus,
      verificationToken: domain.verificationRecord,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/domains", requireAuth, async (req, res): Promise<void> => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { projectId, domain } = (req.body || {}) as { projectId?: string; domain?: string };
    if (!projectId || !domain) {
      res.status(400).json({ error: "projectId and domain are required" });
      return;
    }
    const result = await domainsService.addDomain(userId, projectId, domain);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/domains", requireAuth, async (req, res): Promise<void> => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const domains = await domainsService.listUserDomains(userId);
    res.json({ domains });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.delete("/domains/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const access = await checkDomainAccess(req.params.id as string, userId, "admin");
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }
    await domainsService.removeDomain(req.params.id as string);
    res.json({ message: "Domain removed" });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/domains/my", requireAuth, async (req, res): Promise<void> => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const domains = await domainsService.listUserDomains(userId);
    res.json({ domains });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/domains/check", requireAuth, async (req, res): Promise<void> => {
  try {
    const result = await domainsService.checkDomainAvailability(req.body.domain);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/domains/purchase", requireAuth, async (req, res): Promise<void> => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const result = await domainsService.purchaseDomain(userId, req.body.domain);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/domains/:id/ssl", requireAuth, async (req, res): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { userId } = req as AuthenticatedRequest;
    const [domain] = await db.select().from(domainsTable).where(eq(domainsTable.id, id));
    if (!domain) {
      res.status(404).json({ error: "Domain not found" });
      return;
    }
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, domain.projectId));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (project.ownerId !== userId) {
      const [collab] = await db.select().from(collaboratorsTable).where(
        and(eq(collaboratorsTable.projectId, domain.projectId), eq(collaboratorsTable.userId, userId)),
      );
      if (!collab || (collab.role !== "editor" && collab.role !== "admin")) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }
    if (!domain.dnsVerified) {
      res.status(400).json({ error: "DNS must be verified before SSL provisioning" });
      return;
    }
    await db.update(domainsTable).set({ sslStatus: "provisioning" }).where(eq(domainsTable.id, id));
    setTimeout(async () => {
      try {
        await db.update(domainsTable).set({ sslStatus: "active" }).where(eq(domainsTable.id, id));
      } catch {}
    }, 1500);
    res.json({ status: "provisioning", message: "SSL provisioning started" });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
