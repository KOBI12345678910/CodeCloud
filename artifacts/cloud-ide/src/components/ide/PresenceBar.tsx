import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "@/contexts/theme-context";

interface PresenceUser {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  color: string;
  activeFile: string | null;
  cursor: { line: number; column: number } | null;
}

interface PresenceBarProps {
  users: PresenceUser[];
  followingUser: string | null;
  onFollow: (userId: string) => void;
  onStopFollow: () => void;
  connected: boolean;
}

export function PresenceBar({ users, followingUser, onFollow, onStopFollow, connected }: PresenceBarProps): React.ReactElement {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (userId: string, e: React.MouseEvent) => {
    setHoveredUser(userId);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: rect.left, y: rect.bottom + 4 });
  };

  const handleClick = (userId: string) => {
    if (followingUser === userId) {
      onStopFollow();
    } else {
      onFollow(userId);
    }
  };

  return (
    <div ref={containerRef} style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 8px", height: 32 }}>
      <div style={{
        width: 8, height: 8, borderRadius: 4,
        background: connected ? "#22c55e" : "#ef4444",
        marginRight: 4,
      }} title={connected ? "Connected" : "Disconnected"} />
      
      {users.length > 0 && (
        <span style={{ fontSize: 11, opacity: 0.5, marginRight: 4 }}>
          {users.length} online
        </span>
      )}

      {users.map(user => (
        <div
          key={user.userId}
          onClick={() => handleClick(user.userId)}
          onMouseEnter={(e) => handleMouseEnter(user.userId, e)}
          onMouseLeave={() => setHoveredUser(null)}
          style={{
            width: 26, height: 26, borderRadius: 13,
            background: user.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 600, color: "#fff",
            cursor: "pointer",
            border: followingUser === user.userId ? "2px solid #fff" : "2px solid transparent",
            boxShadow: followingUser === user.userId ? `0 0 0 2px ${user.color}` : "none",
            transition: "all 0.15s ease",
            position: "relative",
          }}
          title={user.userName}
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" style={{ width: 22, height: 22, borderRadius: 11 }} />
          ) : (
            user.userName.charAt(0).toUpperCase()
          )}
          {user.activeFile && (
            <div style={{
              position: "absolute", bottom: -2, right: -2,
              width: 8, height: 8, borderRadius: 4,
              background: "#22c55e",
              border: `1.5px solid ${isDark ? "#0d1117" : "#fff"}`,
            }} />
          )}
        </div>
      ))}

      {hoveredUser && (() => {
        const user = users.find(u => u.userId === hoveredUser);
        if (!user) return null;
        return (
          <div style={{
            position: "fixed",
            left: tooltipPos.x, top: tooltipPos.y,
            background: isDark ? "#1c2128" : "#fff",
            border: `1px solid ${isDark ? "#30363d" : "#e1e4e8"}`,
            borderRadius: 8, padding: "8px 12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            zIndex: 1000, minWidth: 160,
            color: isDark ? "#c9d1d9" : "#1a1a2e",
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: user.color, display: "inline-block" }} />
              {user.userName}
            </div>
            {user.activeFile && (
              <div style={{ fontSize: 11, opacity: 0.7 }}>
                Editing: {user.activeFile.split("/").pop()}
              </div>
            )}
            {user.cursor && (
              <div style={{ fontSize: 11, opacity: 0.5 }}>
                Line {user.cursor.line}, Col {user.cursor.column}
              </div>
            )}
            <div style={{ fontSize: 10, opacity: 0.4, marginTop: 4 }}>
              {followingUser === user.userId ? "Click to stop following" : "Click to follow"}
            </div>
          </div>
        );
      })()}

      {followingUser && (
        <button
          onClick={onStopFollow}
          style={{
            marginLeft: 4, padding: "2px 8px", fontSize: 11,
            background: isDark ? "#21262d" : "#e1e4e8",
            border: "none", borderRadius: 4, cursor: "pointer",
            color: isDark ? "#c9d1d9" : "#1a1a2e",
          }}
        >
          Stop following
        </button>
      )}
    </div>
  );
}
