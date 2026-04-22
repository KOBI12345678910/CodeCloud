import { Router, Request, Response } from "express";
import { containerIPCService } from "../services/container-ipc";

const router = Router();

router.get("/ipc/channels", (req: Request, res: Response): void => {
  res.json({ channels: containerIPCService.getChannels(req.query.containerId as string) });
});

router.post("/ipc/channels", (req: Request, res: Response): void => {
  const { containerId, type, name } = req.body;
  if (!containerId || !type || !name) { res.status(400).json({ error: "containerId, type, name required" }); return; }
  res.status(201).json(containerIPCService.createChannel(containerId, type, name));
});

router.post("/ipc/channels/:id/send", (req: Request, res: Response): void => {
  const { sender, receiver, payload } = req.body;
  const msg = containerIPCService.send(req.params.id as string, sender, receiver, payload);
  if (!msg) { res.status(400).json({ error: "Channel not found or closed" }); return; }
  res.json(msg);
});

router.get("/ipc/channels/:id/messages", (req: Request, res: Response): void => {
  res.json({ messages: containerIPCService.getMessages(req.params.id as string) });
});

router.post("/ipc/channels/:id/close", (req: Request, res: Response): void => {
  if (!containerIPCService.closeChannel(req.params.id as string)) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

export default router;
