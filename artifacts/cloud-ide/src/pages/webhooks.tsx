import React, { useState } from "react";
import { useTheme } from "@/contexts/theme-context";

export default function WebhooksPage(): React.ReactElement {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [webhooks] = useState([
    { id: "1", url: "https://hooks.slack.com/services/xxx", events: ["deploy", "error"], active: true },
    { id: "2", url: "https://discord.com/api/webhooks/xxx", events: ["deploy"], active: false },
  ]);

  return (
    <div style={{ padding: 32, background: isDark ? "#0d1117" : "#fff", minHeight: "100vh", color: isDark ? "#c9d1d9" : "#1a1a2e" }}>
      <h1 style={{ fontSize: 28, marginBottom: 24, color: isDark ? "#58a6ff" : "#0366d6" }}>Webhooks</h1>
      {webhooks.map(w => (
        <div key={w.id} style={{ padding: 16, marginBottom: 12, borderRadius: 8, border: `1px solid ${isDark ? "#30363d" : "#e1e4e8"}`, background: isDark ? "#161b22" : "#f6f8fa" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <code style={{ fontSize: 13 }}>{w.url}</code>
            <span style={{ padding: "3px 10px", borderRadius: 10, fontSize: 11, background: w.active ? "#238636" : "#6e7681", color: "#fff" }}>{w.active ? "Active" : "Inactive"}</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
            {w.events.map(e => <span key={e} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, background: isDark ? "#21262d" : "#e1e4e8" }}>{e}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}
