import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { detectPorts, forwardPort, unforwardPort, closePort, getPortInfo } from "../services/port-manager";

const router = Router();

router.get("/ports", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const ports = detectPorts();
  res.json({ ports });
});

router.get("/ports/:port", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const port = parseInt(req.params["port"] as string, 10);
  const info = getPortInfo(port);
  if (!info) {
    res.status(404).json({ error: "Port not found" });
    return;
  }
  res.json(info);
});

router.post("/ports/:port/forward", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const port = parseInt(req.params["port"] as string, 10);
  try {
    const publicUrl = forwardPort(port);
    res.json({ port, publicUrl });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/ports/:port/unforward", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const port = parseInt(req.params["port"] as string, 10);
  unforwardPort(port);
  res.json({ port, forwarded: false });
});

router.post("/ports/:port/close", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const port = parseInt(req.params["port"] as string, 10);
  const closed = closePort(port);
  if (!closed) {
    res.status(404).json({ error: "Port not found or already closed" });
    return;
  }
  res.json({ port, closed: true });
});

export default router;
