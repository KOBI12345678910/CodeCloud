import React, { useState } from "react";
import { useTheme } from "@/contexts/theme-context";

export default function SupportPage(): React.ReactElement {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [tickets] = useState([
    { id: "1", subject: "Deploy failing", category: "bug", priority: "high", status: "open", created: "2024-01-15" },
    { id: "2", subject: "Upgrade plan", category: "billing", priority: "medium", status: "resolved", created: "2024-01-10" },
  ]);

  const statusColors: Record<string, string> = { open: "#d29922", in_progress: "#58a6ff", resolved: "#238636", closed: "#6e7681" };

  return (
    <div style={{ padding: 32, background: isDark ? "#0d1117" : "#fff", minHeight: "100vh", color: isDark ? "#c9d1d9" : "#1a1a2e" }}>
      <h1 style={{ fontSize: 28, marginBottom: 24, color: isDark ? "#58a6ff" : "#0366d6" }}>Support</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: `1px solid ${isDark ? "#30363d" : "#e1e4e8"}` }}>
            <th style={{ padding: 8 }}>Subject</th><th style={{ padding: 8 }}>Category</th><th style={{ padding: 8 }}>Priority</th><th style={{ padding: 8 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(t => (
            <tr key={t.id} style={{ borderBottom: `1px solid ${isDark ? "#21262d" : "#f0f0f0"}` }}>
              <td style={{ padding: 8 }}>{t.subject}</td>
              <td style={{ padding: 8 }}>{t.category}</td>
              <td style={{ padding: 8 }}>{t.priority}</td>
              <td style={{ padding: 8 }}><span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 12, background: statusColors[t.status] || "#6e7681", color: "#fff" }}>{t.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
