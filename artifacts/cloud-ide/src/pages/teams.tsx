import React, { useState } from "react";
import { useTheme } from "@/contexts/theme-context";

interface Team {
  id: string;
  name: string;
  slug: string;
  members: { userId: string; userName: string; role: string }[];
  plan: string;
}

export default function TeamsPage(): React.ReactElement {
  const { theme } = useTheme();
  const [teams] = useState<Team[]>([
    { id: "1", name: "Frontend Team", slug: "frontend", members: [{ userId: "1", userName: "Alice", role: "owner" }, { userId: "2", userName: "Bob", role: "admin" }], plan: "team" },
    { id: "2", name: "Backend Crew", slug: "backend", members: [{ userId: "1", userName: "Alice", role: "member" }], plan: "pro" },
  ]);
  const isDark = theme === "dark";

  return (
    <div style={{ padding: 32, background: isDark ? "#0d1117" : "#fff", minHeight: "100vh", color: isDark ? "#c9d1d9" : "#1a1a2e" }}>
      <h1 style={{ fontSize: 28, marginBottom: 24, color: isDark ? "#58a6ff" : "#0366d6" }}>Teams</h1>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {teams.map(t => (
          <div key={t.id} style={{ padding: 20, borderRadius: 12, border: `1px solid ${isDark ? "#30363d" : "#e1e4e8"}`, background: isDark ? "#161b22" : "#f6f8fa" }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>{t.name}</h3>
            <p style={{ margin: "8px 0", fontSize: 13, opacity: 0.7 }}>@{t.slug} · {t.plan} plan</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {t.members.map(m => (
                <span key={m.userId} style={{ padding: "4px 10px", borderRadius: 12, fontSize: 12, background: isDark ? "#21262d" : "#e1e4e8" }}>
                  {m.userName} ({m.role})
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
