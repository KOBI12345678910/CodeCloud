import { create } from "zustand";
import { callRPC } from "@/lib/supabase";
import type { AISession, AIMessage } from "@shared/types";

interface AIState {
  sessions: AISession[];
  currentSession: AISession | null;
  messages: AIMessage[];
  isLoading: boolean;
  isStreaming: boolean;

  createSession: (tenantId: string, userId: string, title: string, model?: string) => Promise<AISession>;
  loadSessions: (tenantId: string, userId: string) => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, content: string, model?: string) => Promise<void>;
  setCurrentSession: (session: AISession | null) => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  isLoading: false,
  isStreaming: false,

  createSession: async (tenantId, userId, title, model = "gpt-4") => {
    const data = await callRPC<AISession>("create_ai_session", {
      p_tenant_id: tenantId,
      p_user_id: userId,
      p_title: title,
      p_model: model,
    });
    set((s) => ({ sessions: [data, ...s.sessions], currentSession: data }));
    return data;
  },

  loadSessions: async (tenantId, userId) => {
    const data = await callRPC<AISession[]>("get_ai_sessions", {
      p_tenant_id: tenantId,
      p_user_id: userId,
    });
    set({ sessions: Array.isArray(data) ? data : [] });
  },

  loadMessages: async (sessionId) => {
    const data = await callRPC<AIMessage[]>("get_ai_history", {
      p_session_id: sessionId,
    });
    set({ messages: Array.isArray(data) ? data : [] });
  },

  sendMessage: async (sessionId, content, model) => {
    set({ isStreaming: true });
    try {
      await callRPC("save_ai_message", {
        p_session_id: sessionId,
        p_role: "user",
        p_content: content,
      });
      set((s) => ({
        messages: [...s.messages, {
          id: crypto.randomUUID(),
          session_id: sessionId,
          role: "user" as const,
          content,
          created_at: new Date().toISOString(),
        }],
      }));
      // TODO: Connect to AI backend for actual streaming response
      const assistantMsg = "ð¤ AI response will be connected to your preferred AI provider. Configure in Settings â AI Models.";
      await callRPC("save_ai_message", {
        p_session_id: sessionId,
        p_role: "assistant",
        p_content: assistantMsg,
      });
      set((s) => ({
        messages: [...s.messages, {
          id: crypto.randomUUID(),
          session_id: sessionId,
          role: "assistant" as const,
          content: assistantMsg,
          created_at: new Date().toISOString(),
        }],
      }));
    } finally {
      set({ isStreaming: false });
    }
  },

  setCurrentSession: (session) => set({ currentSession: session }),
}));
