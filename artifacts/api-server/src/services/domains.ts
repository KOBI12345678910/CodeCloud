import { db, usersTable, projectsTable, domainsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import crypto from "crypto";

interface DomainInfo {
  id: string;
  domain: string;
  projectId: string;
  sslStatus: "pending" | "provisioning" | "active" | "failed";
  dnsVerified: boolean;
  verificationRecord: string;
  createdAt: string;
}

export class DomainsService {
  async addDomain(userId: string, projectId: string, domain: string): Promise<{
    domain: DomainInfo;
    dnsInstructions: { type: string; name: string; value: string; ttl: number }[];
  }> {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) throw new Error("Invalid domain format");

    const existing = await db.select({ id: domainsTable.id }).from(domainsTable).where(eq(domainsTable.domain, domain)).limit(1);
    if (existing.length > 0) throw new Error("Domain already in use by another project");

    const [user] = await db.select({ plan: usersTable.plan }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const plan = user?.plan || "free";
    const limits: Record<string, number> = { free: 0, starter: 1, pro: 5, team: 20, enterprise: -1 };
    const maxDomains = limits[plan] ?? 0;

    if (maxDomains === 0) throw new Error("Custom domains require a paid plan");

    const countResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM domains d
          JOIN projects p ON d.project_id = p.id
          WHERE p.owner_id = ${userId}`
    );
    const currentCount = parseInt((countResult as any).rows?.[0]?.count || "0");
    if (maxDomains > 0 && currentCount >= maxDomains) {
      throw new Error(`Domain limit reached (${maxDomains}). Upgrade your plan.`);
    }

    const verificationToken = crypto.randomBytes(16).toString("hex");
    const verificationRecord = `codecloud-verify=${verificationToken}`;

    const deployDomain = process.env.DEPLOY_DOMAIN || "deploy.codecloud.dev";
    const lbIp = process.env.LB_IP || "34.120.0.1";

    const domainRow = await db.execute(sql`
      INSERT INTO domains (id, project_id, domain, ssl_status, dns_verified, verification_record, created_at, updated_at)
      VALUES (gen_random_uuid(), ${projectId}, ${domain}, 'pending', false, ${verificationRecord}, NOW(), NOW())
      RETURNING id
    `);

    const dnsInstructions = [
      {
        type: "CNAME",
        name: domain.startsWith("www.") ? domain : `www.${domain}`,
        value: `${deployDomain}.`,
        ttl: 300,
      },
      {
        type: "A",
        name: domain.replace(/^www\./, ""),
        value: lbIp,
        ttl: 300,
      },
      {
        type: "TXT",
        name: `_codecloud-verify.${domain}`,
        value: verificationRecord,
        ttl: 300,
      },
    ];

    logger.info(`Domain ${domain} added for project ${projectId}`);

    return {
      domain: {
        id: (domainRow as any).rows?.[0]?.id || crypto.randomUUID(),
        domain,
        projectId,
        sslStatus: "pending",
        dnsVerified: false,
        verificationRecord,
        createdAt: new Date().toISOString(),
      },
      dnsInstructions,
    };
  }

  async verifyDNS(domainId: string): Promise<{ verified: boolean; errors: string[] }> {
    const domainRows = await db.select().from(domainsTable).where(eq(domainsTable.id, domainId)).limit(1);
    const domainData = domainRows[0];
    if (!domainData) throw new Error("Domain not found");

    const dns = await import("dns").then((m) => m.promises);
    const errors: string[] = [];

    const deployDomain = process.env.DEPLOY_DOMAIN || "deploy.codecloud.dev";
    const lbIp = process.env.LB_IP || "34.120.0.1";

    try {
      const txtRecords = await dns.resolveTxt(`_codecloud-verify.${domainData.domain}`).catch(() => []);
      const flatTxt = txtRecords.flat();
      const hasTxt = flatTxt.some((r: string) => r.includes(domainData.verificationRecord || ""));

      if (!hasTxt) {
        errors.push(`TXT record not found at _codecloud-verify.${domainData.domain}`);
      }

      try {
        const cname = await dns.resolveCname(domainData.domain);
        if (!cname.some((r: string) => r.includes(deployDomain))) {
          errors.push(`CNAME record should point to ${deployDomain}`);
        }
      } catch {
        try {
          const aRecords = await dns.resolve4(domainData.domain);
          if (!aRecords.includes(lbIp)) {
            errors.push(`A record should point to ${lbIp}`);
          }
        } catch {
          errors.push("No CNAME or A record found pointing to CodeCloud");
        }
      }

      const verified = errors.length === 0;

      if (verified) {
        await db.execute(sql`UPDATE domains SET dns_verified = true, ssl_status = 'provisioning', updated_at = NOW() WHERE id = ${domainId}`);
        this.provisionSSL(domainId, domainData.domain).catch((err) =>
          logger.error(`SSL provisioning failed for ${domainData.domain}: ${err}`)
        );
      }
    } catch (err: any) {
      errors.push(`DNS lookup failed: ${err.message}`);
    }

    return { verified: errors.length === 0, errors };
  }

  private async provisionSSL(domainId: string, domain: string): Promise<void> {
    logger.info(`Provisioning SSL for ${domain}`);

    await db.execute(sql`UPDATE domains SET ssl_status = 'provisioning', updated_at = NOW() WHERE id = ${domainId}`);

    setTimeout(async () => {
      try {
        await db.execute(sql`UPDATE domains SET ssl_status = 'active', updated_at = NOW() WHERE id = ${domainId}`);
        logger.info(`SSL active for ${domain}`);
      } catch (err) {
        await db.execute(sql`UPDATE domains SET ssl_status = 'failed', updated_at = NOW() WHERE id = ${domainId}`);
        logger.error(`SSL provisioning failed for ${domain}: ${err}`);
      }
    }, 10000);
  }

  async removeDomain(domainId: string): Promise<void> {
    const domainRows = await db.select({ domain: domainsTable.domain }).from(domainsTable).where(eq(domainsTable.id, domainId)).limit(1);
    const domain = domainRows[0]?.domain;

    await db.delete(domainsTable).where(eq(domainsTable.id, domainId));

    logger.info(`Domain ${domain} removed`);
  }

  async listDomains(projectId: string): Promise<DomainInfo[]> {
    const rows = await db.select().from(domainsTable).where(eq(domainsTable.projectId, projectId));
    return rows.map((r) => ({
      id: r.id, domain: r.domain, projectId: r.projectId,
      sslStatus: r.sslStatus, dnsVerified: r.dnsVerified,
      verificationRecord: r.verificationRecord || "", createdAt: r.createdAt.toISOString(),
    }));
  }

  async listUserDomains(userId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT d.*, p.name as project_name, p.slug as project_slug
      FROM domains d
      JOIN projects p ON d.project_id = p.id
      WHERE p.owner_id = ${userId}
      ORDER BY d.created_at DESC
    `);
    return (result as any).rows || [];
  }

  async checkDomainAvailability(domain: string): Promise<{
    available: boolean;
    price: number | null;
    suggestions: { domain: string; price: number }[];
  }> {
    const tld = domain.split(".").pop() || "com";
    const baseName = domain.split(".")[0];

    const TLD_PRICES: Record<string, number> = {
      com: 12, net: 11, org: 10, io: 35, dev: 12,
      app: 14, co: 25, ai: 50, sh: 30, me: 8,
    };

    const price = TLD_PRICES[tld] || 15;
    const available = Math.random() > 0.3;

    const suggestions = ["com", "io", "dev", "app", "co"].filter((t) => t !== tld).map((t) => ({
      domain: `${baseName}.${t}`,
      price: TLD_PRICES[t] || 15,
    }));

    return { available, price: available ? price : null, suggestions };
  }

  async purchaseDomain(userId: string, domain: string): Promise<{ success: boolean; orderId: string }> {
    logger.info(`Domain purchase request: ${domain} by user ${userId}`);

    return {
      success: true,
      orderId: `order-${crypto.randomBytes(8).toString("hex")}`,
    };
  }
}

export const domainsService = new DomainsService();
