export type PanelState = "loading" | "ready" | "error" | "disconnected" | "reconnecting";

export interface PanelTransition {
  from: PanelState;
  to: PanelState;
  action?: string;
}

export interface PanelStateMachine {
  state: PanelState;
  error?: string;
  retryCount: number;
  maxRetries: number;
  transition(to: PanelState, error?: string): void;
  retry(): Promise<void>;
  reset(): void;
}

const VALID_TRANSITIONS: Record<PanelState, PanelState[]> = {
  loading: ["ready", "error", "disconnected"],
  ready: ["loading", "error", "disconnected"],
  error: ["loading", "ready", "disconnected"],
  disconnected: ["reconnecting", "loading"],
  reconnecting: ["ready", "error", "disconnected"],
};

export function createPanelStateMachine(
  initialState: PanelState = "loading",
  onTransition?: (transition: PanelTransition) => void,
  retryFn?: () => Promise<void>,
  maxRetries: number = 3,
): PanelStateMachine {
  let state = initialState;
  let error: string | undefined;
  let retryCount = 0;

  const machine: PanelStateMachine = {
    get state() { return state; },
    get error() { return error; },
    get retryCount() { return retryCount; },
    maxRetries,

    transition(to: PanelState, err?: string) {
      const validTargets = VALID_TRANSITIONS[state];
      if (!validTargets?.includes(to)) { console.warn(`Invalid transition: ${state} -> ${to}`); return; }
      const prev = state;
      state = to;
      error = err;
      if (to === "ready") retryCount = 0;
      onTransition?.({ from: prev, to, action: err });
    },

    async retry() {
      if (retryCount >= maxRetries) { machine.transition("error", "Max retries exceeded"); return; }
      retryCount++;
      machine.transition(state === "disconnected" ? "reconnecting" : "loading");
      try {
        if (retryFn) await retryFn();
        machine.transition("ready");
      } catch (e: any) {
        machine.transition("error", e.message || "Retry failed");
      }
    },

    reset() {
      state = "loading";
      error = undefined;
      retryCount = 0;
    },
  };

  return machine;
}

export function getPanelStateLabel(state: PanelState): string {
  switch (state) {
    case "loading": return "Loading...";
    case "ready": return "Connected";
    case "error": return "Error";
    case "disconnected": return "Disconnected";
    case "reconnecting": return "Reconnecting...";
  }
}

export function getPanelStateColor(state: PanelState): string {
  switch (state) {
    case "loading": return "text-yellow-400";
    case "ready": return "text-green-400";
    case "error": return "text-red-400";
    case "disconnected": return "text-gray-400";
    case "reconnecting": return "text-orange-400";
  }
}
