export interface Hackathon { id: string; title: string; description: string; startDate: Date; endDate: Date; prizes: { place: number; prize: string }[]; participants: { userId: string; projectId: string | null }[]; status: "upcoming" | "active" | "judging" | "completed"; }
class HackathonsService {
  private hackathons: Map<string, Hackathon> = new Map();
  create(data: { title: string; description: string; startDate: string; endDate: string; prizes: Hackathon["prizes"] }): Hackathon {
    const id = `hack-${Date.now()}`; const h: Hackathon = { id, ...data, startDate: new Date(data.startDate), endDate: new Date(data.endDate), participants: [], status: "upcoming" };
    this.hackathons.set(id, h); return h;
  }
  join(id: string, userId: string): Hackathon | null { const h = this.hackathons.get(id); if (!h) return null; if (!h.participants.find(p => p.userId === userId)) h.participants.push({ userId, projectId: null }); return h; }
  submitProject(id: string, userId: string, projectId: string): Hackathon | null { const h = this.hackathons.get(id); if (!h) return null; const p = h.participants.find(p => p.userId === userId); if (p) p.projectId = projectId; return h; }
  list(): Hackathon[] { return Array.from(this.hackathons.values()); }
  get(id: string): Hackathon | null { return this.hackathons.get(id) || null; }
}
export const hackathonsService = new HackathonsService();
