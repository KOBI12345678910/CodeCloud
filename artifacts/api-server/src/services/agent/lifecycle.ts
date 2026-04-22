/**
 * Explicit task lifecycle state machine.
 *
 * Spec'd named states:
 *   Queued  -> Planning -> Working -> Review -> Done
 *                                            \-> Failed
 *   (any state -> Cancelled is also valid)
 *
 * The agent_tasks.state column uses the existing 6-value Postgres enum
 * (queued, active, awaiting_approval, completed, failed, cancelled), so this
 * module gives each spec'd named state a 1:1 mapping to that enum and
 * validates transitions explicitly. The runner uses transition() to advance
 * the lifecycle so an illegal jump (e.g. Done -> Working) throws.
 */

export type LifecycleState =
  | "Queued"
  | "Planning"
  | "Working"
  | "Review"
  | "Done"
  | "Failed"
  | "Cancelled";

export type DbTaskState =
  | "queued"
  | "active"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

const STATE_TO_DB: Record<LifecycleState, DbTaskState> = {
  Queued: "queued",
  Planning: "active",
  Working: "active",
  Review: "awaiting_approval",
  Done: "completed",
  Failed: "failed",
  Cancelled: "cancelled",
};

const TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  Queued: ["Planning", "Cancelled", "Failed"],
  Planning: ["Working", "Cancelled", "Failed"],
  Working: ["Review", "Done", "Cancelled", "Failed"],
  Review: ["Working", "Done", "Cancelled", "Failed"],
  Done: [],
  Failed: [],
  Cancelled: [],
};

export function toDbState(state: LifecycleState): DbTaskState {
  return STATE_TO_DB[state];
}

export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function transition(from: LifecycleState, to: LifecycleState): LifecycleState {
  if (from === to) return to;
  if (!canTransition(from, to)) {
    throw new Error(`Illegal task lifecycle transition: ${from} -> ${to}`);
  }
  return to;
}
