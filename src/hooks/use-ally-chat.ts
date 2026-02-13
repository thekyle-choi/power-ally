"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { streamChat } from "@/lib/sse-client";
import type { UIMessage, TextUIPart, ChatStatus } from "@/types";

// =============================================================================
// Types
// =============================================================================

export interface UseAllyChatOptions {
  id: string;
  initialMessages?: UIMessage[];
  initialConversationId?: string;
  userId: string;
  onFinish?: (params: {
    messages: UIMessage[];
    isAbort: boolean;
    conversationId?: string | null;
  }) => void;
  onError?: (error: Error) => void;
}

export interface UseAllyChatReturn {
  messages: UIMessage[];
  conversationId: string | null;
  sendMessage: (params: { text: string }) => Promise<void>;
  status: ChatStatus;
  error: Error | null;
  clearError: () => void;
  stop: () => void;
}

// =============================================================================
// Utility
// =============================================================================

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useAllyChat(options: UseAllyChatOptions): UseAllyChatReturn {
  const {
    id: sessionId,
    initialMessages = [],
    initialConversationId,
    userId,
    onFinish,
    onError,
  } = options;

  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<Error | null>(null);

  const messagesRef = useRef<UIMessage[]>(initialMessages);
  const conversationIdRef = useRef<string | null>(initialConversationId ?? null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSessionIdRef = useRef<string>(sessionId);
  const isAbortRef = useRef(false);

  // Keep ref in sync with state
  conversationIdRef.current = conversationId;

  const updateMessages = useCallback(
    (updater: (prev: UIMessage[]) => UIMessage[]) => {
      setMessages((prev) => {
        const next = updater(prev);
        messagesRef.current = next;
        return next;
      });
    },
    []
  );

  // Detect session change during render (synchronous reset)
  // This ensures conversationId is reset BEFORE sendMessage can be called
  if (lastSessionIdRef.current !== sessionId) {
    lastSessionIdRef.current = sessionId;
    setMessages(initialMessages);
    messagesRef.current = initialMessages;
    const newConvId = initialConversationId ?? null;
    conversationIdRef.current = newConvId;
    setConversationId(newConvId);
    setStatus("ready");
    setError(null);
  }

  // Sync initialMessages when they arrive (e.g. after zustand rehydration)
  useEffect(() => {
    if (initialMessages.length > 0 && messagesRef.current.length === 0) {
      updateMessages(() => initialMessages);
    }
  }, [initialMessages, updateMessages]);

  // Sync conversationId from store (e.g. after zustand rehydration for same session)
  useEffect(() => {
    if (initialConversationId && !conversationId) {
      setConversationId(initialConversationId);
    }
  }, [initialConversationId, conversationId]);

  const sendMessage = useCallback(
    async ({ text }: { text: string }) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;

      setError(null);
      setStatus("submitted");
      isAbortRef.current = false;

      const userMessage: UIMessage = {
        id: generateId(),
        role: "user",
        parts: [{ type: "text", text: trimmedText }],
        createdAt: new Date(),
      };

      updateMessages((prev) => [...prev, userMessage]);

      let assistantMessageId = generateId();
      let accumulatedText = "";
      let latestConversationId = conversationIdRef.current;
      let hasStreamStarted = false;

      // Add empty assistant message placeholder
      updateMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          parts: [{ type: "text", text: "" }],
          createdAt: new Date(),
        },
      ]);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      await streamChat(trimmedText, conversationIdRef.current, userId, {
        signal: abortController.signal,
        onData: (text, moreInfo) => {
          if (!hasStreamStarted) {
            setStatus("streaming");
            hasStreamStarted = true;
          }

          if (moreInfo?.conversationId) {
            conversationIdRef.current = moreInfo.conversationId;
            setConversationId(moreInfo.conversationId);
            latestConversationId = moreInfo.conversationId;
          }

          accumulatedText += text;

          const currentId = assistantMessageId;
          if (moreInfo?.messageId && moreInfo.messageId !== assistantMessageId) {
            const previousId = assistantMessageId;
            assistantMessageId = moreInfo.messageId;
            updateMessages((prev) =>
              prev.map((msg) =>
                msg.id === previousId
                  ? { ...msg, id: moreInfo.messageId!, parts: [{ type: "text" as const, text: accumulatedText }] }
                  : msg
              )
            );
          } else {
            updateMessages((prev) =>
              prev.map((msg) =>
                msg.id === currentId
                  ? { ...msg, parts: [{ type: "text" as const, text: accumulatedText }] }
                  : msg
              )
            );
          }
        },
        onMessageReplace: (data) => {
          if (data.conversation_id) {
            conversationIdRef.current = data.conversation_id;
            setConversationId(data.conversation_id);
            latestConversationId = data.conversation_id;
          }
          accumulatedText = data.answer || "";
          const previousId = assistantMessageId;
          if (data.id) assistantMessageId = data.id;
          updateMessages((prev) =>
            prev.map((msg) =>
              msg.id === previousId
                ? { ...msg, id: data.id || msg.id, parts: [{ type: "text" as const, text: accumulatedText }] }
                : msg
            )
          );
        },
        onMessageEnd: (messageEnd) => {
          if (messageEnd.id && messageEnd.id !== assistantMessageId) {
            const previousId = assistantMessageId;
            assistantMessageId = messageEnd.id;
            updateMessages((prev) =>
              prev.map((msg) =>
                msg.id === previousId
                  ? { ...msg, id: messageEnd.id! }
                  : msg
              )
            );
          }
        },
        onError: (err) => {
          if (isAbortRef.current) {
            setStatus("ready");
            onFinish?.({
              messages: messagesRef.current,
              isAbort: true,
              conversationId: latestConversationId,
            });
            return;
          }
          setError(err);
          setStatus("error");
          onError?.(err);
        },
        onComplete: () => {
          setStatus("ready");
          abortControllerRef.current = null;
          onFinish?.({
            messages: messagesRef.current,
            isAbort: isAbortRef.current,
            conversationId: latestConversationId,
          });
        },
      });
    },
    [userId, onFinish, onError, updateMessages]
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      isAbortRef.current = true;
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("ready");
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (status === "error") {
      setStatus("ready");
    }
  }, [status]);

  return {
    messages,
    conversationId,
    sendMessage,
    status,
    error,
    clearError,
    stop,
  };
}
