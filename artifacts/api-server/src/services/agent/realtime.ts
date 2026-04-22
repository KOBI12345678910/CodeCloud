import { getIO } from "../../websocket/socketio";

export type AgentEventType =
  | "user_message"
  | "assistant_message"
  | "assistant_token"
  | "tool_call"
  | "tool_result"
  | "tool_error"
  | "state_change"
  | "checkpoint"
  | "rollback"
  | "cost_update"
  | "plan";

export interface AgentRealtimeEvent {
  taskId: string;
  projectId: string;
  seq: number;
  type: AgentEventType;
  payload: unknown;
  at: number;
}

export function emitAgentEvent(evt: AgentRealtimeEvent): void {
  const io = getIO();
  if (!io) return;
  io.to(`project:${evt.projectId}`).emit("agent:event", evt);
  io.to(`agent:${evt.taskId}`).emit("agent:event", evt);
}
