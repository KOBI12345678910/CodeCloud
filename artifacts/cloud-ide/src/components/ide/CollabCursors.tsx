import { useState, useEffect, useCallback, useRef } from "react";

export interface CollabCursor {
  userId: string;
  displayName: string;
  color: string;
  line: number;
  column: number;
  lastActiveAt: number;
}

const CURSOR_COLORS = [
  "#F97316",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#EAB308",
  "#3B82F6",
  "#10B981",
  "#EF4444",
];

const FADE_DELAY_MS = 3000;
const LABEL_HEIGHT = 20;
const LABEL_PADDING_X = 8;

interface CollabCursorsProps {
  cursors: CollabCursor[];
  editorLineHeight: number;
  editorCharWidth: number;
  scrollTop: number;
  scrollLeft: number;
  onFollowCursor?: (userId: string) => void;
}

interface CursorLabelState {
  opacity: number;
  visible: boolean;
}

export default function CollabCursors({
  cursors,
  editorLineHeight,
  editorCharWidth,
  scrollTop,
  scrollLeft,
  onFollowCursor,
}: CollabCursorsProps) {
  const [labelStates, setLabelStates] = useState<Record<string, CursorLabelState>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const resetFadeTimer = useCallback((userId: string) => {
    if (timersRef.current[userId]) {
      clearTimeout(timersRef.current[userId]);
    }

    setLabelStates((prev) => ({
      ...prev,
      [userId]: { opacity: 1, visible: true },
    }));

    timersRef.current[userId] = setTimeout(() => {
      setLabelStates((prev) => ({
        ...prev,
        [userId]: { opacity: 0.3, visible: true },
      }));
    }, FADE_DELAY_MS);
  }, []);

  useEffect(() => {
    cursors.forEach((cursor) => {
      resetFadeTimer(cursor.userId);
    });
  }, [cursors, resetFadeTimer]);

  useEffect(() => {
    const currentTimers = timersRef.current;
    return () => {
      Object.values(currentTimers).forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-10" data-testid="collab-cursors">
      {cursors.map((cursor) => {
        const top = (cursor.line - 1) * editorLineHeight - scrollTop;
        const left = (cursor.column - 1) * editorCharWidth - scrollLeft;
        const state = labelStates[cursor.userId] || { opacity: 1, visible: true };

        if (top < -LABEL_HEIGHT || left < 0) return null;

        return (
          <div
            key={cursor.userId}
            className="absolute transition-all duration-200 ease-out"
            style={{
              top: `${top}px`,
              left: `${left}px`,
              opacity: state.opacity,
            }}
          >
            <div
              className="w-0.5 absolute"
              style={{
                height: `${editorLineHeight}px`,
                backgroundColor: cursor.color,
              }}
            />
            <div
              className="absolute pointer-events-auto cursor-pointer select-none whitespace-nowrap flex items-center rounded-t-sm rounded-tr-sm rounded-br-sm"
              style={{
                top: `-${LABEL_HEIGHT}px`,
                left: 0,
                height: `${LABEL_HEIGHT}px`,
                paddingLeft: `${LABEL_PADDING_X}px`,
                paddingRight: `${LABEL_PADDING_X}px`,
                backgroundColor: cursor.color,
                color: "#fff",
                fontSize: "11px",
                fontWeight: 500,
                lineHeight: `${LABEL_HEIGHT}px`,
              }}
              onClick={() => onFollowCursor?.(cursor.userId)}
              title={`Click to follow ${cursor.displayName}`}
              data-testid={`cursor-label-${cursor.userId}`}
            >
              {cursor.displayName}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function useCollabCursors() {
  const [cursors, setCursors] = useState<CollabCursor[]>([]);

  const updateCursor = useCallback((cursor: CollabCursor) => {
    setCursors((prev) => {
      const idx = prev.findIndex((c) => c.userId === cursor.userId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...cursor, lastActiveAt: Date.now() };
        return next;
      }
      return [...prev, { ...cursor, lastActiveAt: Date.now() }];
    });
  }, []);

  const removeCursor = useCallback((userId: string) => {
    setCursors((prev) => prev.filter((c) => c.userId !== userId));
  }, []);

  const getColorForUser = useCallback((userId: string): string => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
    }
    return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
  }, []);

  return { cursors, updateCursor, removeCursor, getColorForUser };
}
