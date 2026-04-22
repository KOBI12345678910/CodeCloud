export interface Team { id: string; name: string; slug: string; ownerId: string; members: TeamMember[]; plan: "free" | "pro" | "team"; createdAt: Date; }
export interface TeamMember { userId: string; userName: string; role: "owner" | "admin" | "member" | "viewer"; joinedAt: Date; }
class TeamManagementService {
  private teams: Map<string, Team> = new Map();
  create(data: { name: string; slug: string; ownerId: string; ownerName: string }): Team {
    const id = `team-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const team: Team = { id, name: data.name, slug: data.slug, ownerId: data.ownerId, members: [{ userId: data.ownerId, userName: data.ownerName, role: "owner", joinedAt: new Date() }], plan: "team", createdAt: new Date() };
    this.teams.set(id, team); return team;
  }
  addMember(teamId: string, userId: string, userName: string, role: TeamMember["role"] = "member"): Team | null { const t = this.teams.get(teamId); if (!t) return null; if (t.members.find(m => m.userId === userId)) return t; t.members.push({ userId, userName, role, joinedAt: new Date() }); return t; }
  removeMember(teamId: string, userId: string): boolean { const t = this.teams.get(teamId); if (!t) return false; t.members = t.members.filter(m => m.userId !== userId); return true; }
  updateRole(teamId: string, userId: string, role: TeamMember["role"]): boolean { const t = this.teams.get(teamId); if (!t) return false; const m = t.members.find(m => m.userId === userId); if (!m) return false; m.role = role; return true; }
  get(id: string): Team | null { return this.teams.get(id) || null; }
  getBySlug(slug: string): Team | null { return Array.from(this.teams.values()).find(t => t.slug === slug) || null; }
  list(userId?: string): Team[] { const all = Array.from(this.teams.values()); return userId ? all.filter(t => t.members.some(m => m.userId === userId)) : all; }
  delete(id: string): boolean { return this.teams.delete(id); }
}
export const teamManagementService = new TeamManagementService();
