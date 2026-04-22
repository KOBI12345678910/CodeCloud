import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types";
import {
  createNetwork, listNetworks, getNetwork, updateNetwork, deleteNetwork,
  addMember, removeMember, listMembers, getProjectNetworks,
  exposePort, unexposePort, listExposedPorts, discoverServices,
  addNetworkPolicy, removeNetworkPolicy, listNetworkPolicies,
} from "../services/container-network";

const router: IRouter = Router();

async function requireNetworkOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  const networkId = Array.isArray(req.params.networkId) ? req.params.networkId[0] : req.params.networkId;
  if (!networkId) { res.status(400).json({ error: "networkId is required" }); return; }
  try {
    const network = await getNetwork(networkId);
    if (!network) { res.status(404).json({ error: "Network not found" }); return; }
    if (network.ownerId !== userId) { res.status(403).json({ error: "Not network owner" }); return; }
    (req as any).network = network;
    next();
  } catch (err: any) { res.status(500).json({ error: err.message }); }
}

router.post("/networks", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { name, description, policy } = req.body;
  if (!name || typeof name !== "string" || name.length > 100) {
    res.status(400).json({ error: "name is required (max 100 chars)" }); return;
  }
  try {
    const network = await createNetwork(userId, name.trim(), description, policy);
    res.status(201).json(network);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/networks", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const networks = await listNetworks(userId);
    res.json(networks);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/networks/:networkId", requireAuth, requireNetworkOwner, async (req, res): Promise<void> => {
  res.json((req as any).network);
});

router.patch("/networks/:networkId", requireAuth, requireNetworkOwner, async (req, res): Promise<void> => {
  const networkId = Array.isArray(req.params.networkId) ? req.params.networkId[0] : req.params.networkId;
  try {
    const updated = await updateNetwork(networkId, req.body);
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/networks/:networkId", requireAuth, requireNetworkOwner, async (req, res): Promise<void> => {
  const networkId = Array.isArray(req.params.networkId) ? req.params.networkId[0] : req.params.networkId;
  try {
    await deleteNetwork(networkId);
    res.sendStatus(204);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/networks/:networkId/members", requireAuth, requireNetworkOwner, async (req, res): Promise<void> => {
  const networkId = Array.isArray(req.params.networkId) ? req.params.networkId[0] : req.params.networkId;
  try {
    const members = await listMembers(networkId);
    res.json(members);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/networks/:networkId/members", requireAuth, requireNetworkOwner, async (req, res): Promise<void> => {
  const networkId = Array.isArray(req.params.networkId) ? req.params.networkId[0] : req.params.networkId;
  const { projectId, hostname } = req.body;
  if (!projectId || !hostname) { res.status(400).json({ error: "projectId and hostname are required" }); return; }
  if (!/^[a-z0-9-]+$/.test(hostname) || hostname.length > 63) { res.status(400).json({ error: "hostname must be lowercase alphanumeric/dashes, max 63 chars" }); return; }
  try {
    const member = await addMember(networkId, projectId, hostname);
    res.status(201).json(member);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/networks/:networkId/members/:memberId", requireAuth, requireNetworkOwner, async (req, res): Promise<void> => {
  const networkId = Array.isArray(req.params.networkId) ? req.params.networkId[0] : req.params.networkId;
  const memberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;
  try {
    await removeMember(networkId, memberId);
    res.sendStatus(204);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/networks/:networkId/ports", requireAuth, requireNetworkOwner, async (req, res): Promise<void> => {
  const networkId = Array.isArray(req.params.networkId) ? req.params.networkId[0] : req.params.networkId;
  try {
    const ports = await listExposedPorts(networkId);
    res.json(ports);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/networks/:networkId/ports", requireAuth, requireNetworkOwner, async (req, res): Promise<void> => {
  const networkId = Array.isArray(req.params.networkId) ? req.params.networkId[0] : req.params.networkId;
  const { projectId, port, protocol, serviceName, description, isPublic } = req.body;
  if (!projectId || !port || typeof port !== "number" || port < 1 || port > 65535) {
    res.status(400).json({ error: "projectId and valid port (1-65535) are required" }); return;
  }
  try {
    const exposed = await exposePort(networkId, projectId, port, protocol, serviceName, description, isPublic);
    res.status(201).json(exposed);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/networks/:networkId/ports/:portId", requireAuth, requireNetworkOwner, async (req, res): Promise<void> => {
  const networkId = Array.isArray(req.params.networkId) ? req.params.networkId[0] : req.params.networkId;
  const portId = Array.isArray(req.params.portId) ? req.params.portId[0] : req.params.portId;
  try {
    await unexposePort(portId, networkId);
    res.sendStatus(204);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/networks/:networkId/discover", requireAuth, requireNetworkOwner, async (req, res): Promise<void> => {
  const networkId = Array.isArray(req.params.networkId) ? req.params.networkId[0] : req.params.networkId;
  try {
    const services = await discoverServices(networkId);
    res.json(services);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/networks/:networkId/policies", requireAuth, requireNetworkOwner, async (req, res): Promise<void> => {
  const networkId = Array.isArray(req.params.networkId) ? req.params.networkId[0] : req.params.networkId;
  try {
    const policies = await listNetworkPolicies(networkId);
    res.json(policies);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/networks/:networkId/policies", requireAuth, requireNetworkOwner, async (req, res): Promise<void> => {
  const networkId = Array.isArray(req.params.networkId) ? req.params.networkId[0] : req.params.networkId;
  const { sourceProjectId, targetProjectId, action, ports, priority, description } = req.body;
  if (!action || !["allow", "deny"].includes(action)) {
    res.status(400).json({ error: "action must be 'allow' or 'deny'" }); return;
  }
  try {
    const policy = await addNetworkPolicy(networkId, sourceProjectId || null, targetProjectId || null, action, ports, priority, description);
    res.status(201).json(policy);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/networks/:networkId/policies/:policyId", requireAuth, requireNetworkOwner, async (req, res): Promise<void> => {
  const networkId = Array.isArray(req.params.networkId) ? req.params.networkId[0] : req.params.networkId;
  const policyId = Array.isArray(req.params.policyId) ? req.params.policyId[0] : req.params.policyId;
  try {
    await removeNetworkPolicy(policyId, networkId);
    res.sendStatus(204);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/projects/:id/networks", requireAuth, async (req, res): Promise<void> => {
  const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const networks = await getProjectNetworks(projectId);
    const userId = (req as AuthenticatedRequest).userId;
    const ownedNetworks = networks.filter(n => n.ownerId === userId);
    res.json(ownedNetworks);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
