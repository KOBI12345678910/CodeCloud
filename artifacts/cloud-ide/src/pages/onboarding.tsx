import React, { useState } from "react";
import { useTheme } from "@/contexts/theme-context";

const STEPS = [
  { key: "welcome", title: "Welcome to CodeCloud", description: "Let's get you set up!" },
  { key: "create-project", title: "Create Your First Project", description: "Start a new project or import from GitHub" },
  { key: "write-code", title: "Write Some Code", description: "Open the editor and start coding" },
  { key: "run-preview", title: "Run & Preview", description: "See your app running live" },
  { key: "deploy", title: "Deploy to Production", description: "Share your project with the world" },
];

export default function OnboardingPage(): React.ReactElement {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [completed, setCompleted] = useState<string[]>(["welcome"]);

  return (
    <div style={{ padding: 32, background: isDark ? "#0d1117" : "#fff", minHeight: "100vh", color: isDark ? "#c9d1d9" : "#1a1a2e", maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 24, color: isDark ? "#58a6ff" : "#0366d6" }}>Getting Started</h1>
      {STEPS.map((s, i) => {
        const done = completed.includes(s.key);
        return (
          <div key={s.key} style={{ padding: 16, marginBottom: 12, borderRadius: 8, border: `1px solid ${isDark ? "#30363d" : "#e1e4e8"}`, background: isDark ? "#161b22" : "#f6f8fa", opacity: done ? 0.6 : 1, cursor: "pointer" }}
            onClick={() => !done && setCompleted([...completed, s.key])}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, background: done ? "#238636" : (isDark ? "#21262d" : "#e1e4e8"), color: done ? "#fff" : "inherit" }}>
                {done ? "\u2713" : i + 1}
              </span>
              <div>
                <div style={{ fontWeight: 600 }}>{s.title}</div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>{s.description}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
