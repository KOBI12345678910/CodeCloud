import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

interface ScimAuthRequest extends Request {
  scimOrgId?: string;
}

function requireScimAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  const scimToken = process.env.SCIM_BEARER_TOKEN;
  if (!scimToken || !auth || auth !== `Bearer ${scimToken}`) {
    res.status(401).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "Unauthorized",
      status: "401",
    });
    return;
  }

  const orgId = req.headers["x-scim-org-id"] as string;
  if (!orgId) {
    res.status(400).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "X-SCIM-Org-Id header is required for tenant-scoped SCIM operations",
      status: "400",
    });
    return;
  }
  (req as ScimAuthRequest).scimOrgId = orgId;
  next();
}

function toScimUser(user: any) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: user.id,
    userName: user.email,
    name: {
      formatted: user.displayName || user.username,
      givenName: user.displayName?.split(" ")[0] || user.username,
      familyName: user.displayName?.split(" ").slice(1).join(" ") || "",
    },
    emails: [{ value: user.email, primary: true, type: "work" }],
    displayName: user.displayName || user.username,
    active: !(user as any).deprovisioned,
    meta: {
      resourceType: "User",
      created: user.createdAt,
      lastModified: user.updatedAt,
      location: `/api/scim/v2/Users/${user.id}`,
    },
  };
}

router.get("/scim/v2/ServiceProviderConfig", requireScimAuth, (_req, res) => {
  res.json({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
    documentationUri: "https://codecloud.dev/docs/scim",
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 200 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      { type: "oauthbearertoken", name: "OAuth Bearer Token", description: "Authentication using a bearer token" },
    ],
  });
});

router.get("/scim/v2/ResourceTypes", requireScimAuth, (_req, res) => {
  res.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: 1,
    Resources: [{
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
      id: "User",
      name: "User",
      endpoint: "/scim/v2/Users",
      schema: "urn:ietf:params:scim:schemas:core:2.0:User",
    }],
  });
});

router.get("/scim/v2/Schemas", requireScimAuth, (_req, res) => {
  res.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: 1,
    Resources: [{
      id: "urn:ietf:params:scim:schemas:core:2.0:User",
      name: "User",
      attributes: [
        { name: "userName", type: "string", multiValued: false, required: true, mutability: "readWrite" },
        { name: "displayName", type: "string", multiValued: false, required: false, mutability: "readWrite" },
        { name: "emails", type: "complex", multiValued: true, required: true, mutability: "readWrite" },
        { name: "active", type: "boolean", multiValued: false, required: false, mutability: "readWrite" },
      ],
    }],
  });
});

router.get("/scim/v2/Users", requireScimAuth, async (req, res): Promise<void> => {
  const startIndex = parseInt(req.query.startIndex as string) || 1;
  const count = Math.min(parseInt(req.query.count as string) || 100, 200);
  const filter = req.query.filter as string;

  let users;
  if (filter) {
    const match = filter.match(/userName\s+eq\s+"([^"]+)"/i);
    if (match) {
      users = await db.select().from(usersTable).where(eq(usersTable.email, match[1]));
    } else {
      users = await db.select().from(usersTable).limit(count).offset(startIndex - 1);
    }
  } else {
    users = await db.select().from(usersTable).limit(count).offset(startIndex - 1);
  }

  res.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: users.length,
    startIndex,
    itemsPerPage: count,
    Resources: users.map(toScimUser),
  });
});

router.get("/scim/v2/Users/:id", requireScimAuth, async (req, res): Promise<void> => {
  const id = req.params.id as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User not found",
      status: "404",
    });
    return;
  }
  res.json(toScimUser(user));
});

router.post("/scim/v2/Users", requireScimAuth, async (req, res): Promise<void> => {
  const { userName, displayName, name, emails } = req.body;
  const email = userName || emails?.[0]?.value;

  if (!email) {
    res.status(400).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "userName (email) is required",
      status: "400",
    });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User already exists",
      status: "409",
    });
    return;
  }

  const username = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20) + crypto.randomBytes(2).toString("hex");
  const display = displayName || name?.formatted || username;

  const [user] = await db
    .insert(usersTable)
    .values({
      email,
      username,
      displayName: display,
      authProvider: "local",
      emailVerified: false,
    })
    .returning();

  res.status(201).json(toScimUser(user));
});

router.put("/scim/v2/Users/:id", requireScimAuth, async (req, res): Promise<void> => {
  const id = req.params.id as string;
  const { displayName, name } = req.body;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "User not found", status: "404" });
    return;
  }

  const update: Record<string, unknown> = {};
  if (displayName) update.displayName = displayName;
  if (name?.formatted) update.displayName = name.formatted;

  if (Object.keys(update).length > 0) {
    await db.update(usersTable).set(update).where(eq(usersTable.id, id));
  }

  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  res.json(toScimUser(updated));
});

router.patch("/scim/v2/Users/:id", requireScimAuth, async (req, res): Promise<void> => {
  const id = req.params.id as string;
  const { Operations } = req.body;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "User not found", status: "404" });
    return;
  }

  const update: Record<string, unknown> = {};

  if (Array.isArray(Operations)) {
    for (const op of Operations) {
      if (op.op === "replace") {
        if (op.path === "displayName" || op.value?.displayName) {
          update.displayName = op.value?.displayName || op.value;
        }
        if (op.path === "active" && op.value === false) {
          update.displayName = `[deprovisioned] ${user.displayName || user.username}`;
        }
      }
    }
  }

  if (Object.keys(update).length > 0) {
    await db.update(usersTable).set(update).where(eq(usersTable.id, id));
  }

  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  res.json(toScimUser(updated));
});

router.delete("/scim/v2/Users/:id", requireScimAuth, async (req, res): Promise<void> => {
  const id = req.params.id as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "User not found", status: "404" });
    return;
  }

  await db.update(usersTable).set({
    displayName: `[deprovisioned] ${user.displayName || user.username}`,
  }).where(eq(usersTable.id, id));

  res.status(204).send();
});

export default router;
