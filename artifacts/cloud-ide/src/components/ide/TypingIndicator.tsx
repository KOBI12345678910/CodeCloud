import { useState, useEffect, useRef } from "react";

interface TypingUser {
  id: string;
  name: string;
  color: string;
}

interface Props {
  users?: TypingUser[];
}

export function TypingIndicator({ users = [] }: Props) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([
    { id: "1", name: "Alice", color: "#3b82f6" },
  ]);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (typingUsers.length === 0) return;
    const interval = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(interval);
  }, [typingUsers.length]);

  useEffect(() => {
    if (typingUsers.length === 0) return;
    const timeout = setTimeout(() => setTypingUsers([]), 3000);
    return () => clearTimeout(timeout);
  }, [typingUsers]);

  if (typingUsers.length === 0) return null;

  const names = typingUsers.map(u => u.name);
  const text = names.length === 1 ? `${names[0]} is typing` : names.length === 2 ? `${names[0]} and ${names[1]} are typing` : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-muted-foreground animate-in fade-in" data-testid="typing-indicator">
      <div className="flex items-center gap-0.5">
        {typingUsers.slice(0, 3).map(u => (
          <div key={u.id} className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] text-white font-bold" style={{ backgroundColor: u.color }}>{u.name[0]}</div>
        ))}
      </div>
      <span>{text}{".".repeat(dots)}</span>
    </div>
  );
}
