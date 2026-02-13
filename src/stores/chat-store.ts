"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatSession, UIMessage } from "@/types";

// =============================================================================
// Types
// =============================================================================

interface ChatStore {
  sessions: ChatSession[];
  currentSessionId: string | null;
  userId: string;

  createSession: () => string;
  openSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, title: string) => void;
  updateSessionMessages: (sessionId: string, messages: UIMessage[]) => void;
  updateSessionConversationId: (sessionId: string, conversationId: string) => void;
  getCurrentSession: () => ChatSession | null;
}

// =============================================================================
// Helpers
// =============================================================================

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateUserId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function generateTitle(messages: UIMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (firstUserMessage) {
    const text = firstUserMessage.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join(" ");
    if (text.length > 40) {
      return text.slice(0, 40) + "…";
    }
    return text || "새 대화";
  }
  return "새 대화";
}

// =============================================================================
// Store
// =============================================================================

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      userId: generateUserId(),

      createSession: () => {
        const id = generateSessionId();
        const session: ChatSession = {
          id,
          title: "새 대화",
          messages: [],
          conversationId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSessionId: id,
        }));

        return id;
      },

      openSession: (sessionId: string) => {
        set({ currentSessionId: sessionId });
      },

      deleteSession: (sessionId: string) => {
        set((state) => {
          const filtered = state.sessions.filter((s) => s.id !== sessionId);
          const newCurrentId =
            state.currentSessionId === sessionId
              ? filtered[0]?.id || null
              : state.currentSessionId;

          return {
            sessions: filtered,
            currentSessionId: newCurrentId,
          };
        });
      },

      renameSession: (sessionId: string, title: string) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, title, updatedAt: Date.now() } : s
          ),
        }));
      },

      updateSessionMessages: (sessionId: string, messages: UIMessage[]) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const title =
              s.title === "새 대화" && messages.length > 0
                ? generateTitle(messages)
                : s.title;
            return { ...s, messages, title, updatedAt: Date.now() };
          }),
        }));
      },

      updateSessionConversationId: (sessionId: string, conversationId: string) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, conversationId, updatedAt: Date.now() }
              : s
          ),
        }));
      },

      getCurrentSession: () => {
        const { sessions, currentSessionId } = get();
        if (!currentSessionId) return null;
        return sessions.find((s) => s.id === currentSessionId) || null;
      },
    }),
    {
      name: "unfold-sessions",
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        userId: state.userId,
      }),
    }
  )
);
