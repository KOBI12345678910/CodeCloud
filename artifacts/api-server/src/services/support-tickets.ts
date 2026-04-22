export interface SupportTicket { id: string; userId: string; subject: string; description: string; category: "bug" | "feature" | "billing" | "account" | "other"; priority: "low" | "medium" | "high" | "urgent"; status: "open" | "in_progress" | "waiting" | "resolved" | "closed"; assignedTo: string | null; messages: { from: "user" | "support"; message: string; timestamp: Date }[]; createdAt: Date; updatedAt: Date; }
class SupportTicketsService {
  private tickets: Map<string, SupportTicket> = new Map();
  create(data: { userId: string; subject: string; description: string; category: SupportTicket["category"]; priority?: SupportTicket["priority"] }): SupportTicket {
    const id = `ticket-${Date.now()}`; const t: SupportTicket = { id, ...data, priority: data.priority || "medium", status: "open", assignedTo: null, messages: [{ from: "user", message: data.description, timestamp: new Date() }], createdAt: new Date(), updatedAt: new Date() };
    this.tickets.set(id, t); return t;
  }
  reply(id: string, from: "user" | "support", message: string): SupportTicket | null { const t = this.tickets.get(id); if (!t) return null; t.messages.push({ from, message, timestamp: new Date() }); t.updatedAt = new Date(); if (from === "support") t.status = "waiting"; return t; }
  updateStatus(id: string, status: SupportTicket["status"]): SupportTicket | null { const t = this.tickets.get(id); if (!t) return null; t.status = status; t.updatedAt = new Date(); return t; }
  assign(id: string, assignedTo: string): SupportTicket | null { const t = this.tickets.get(id); if (!t) return null; t.assignedTo = assignedTo; t.status = "in_progress"; t.updatedAt = new Date(); return t; }
  get(id: string): SupportTicket | null { return this.tickets.get(id) || null; }
  listByUser(userId: string): SupportTicket[] { return Array.from(this.tickets.values()).filter(t => t.userId === userId); }
  list(status?: SupportTicket["status"]): SupportTicket[] { const all = Array.from(this.tickets.values()); return status ? all.filter(t => t.status === status) : all; }
}
export const supportTicketsService = new SupportTicketsService();
