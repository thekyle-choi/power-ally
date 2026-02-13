/**
 * SSE Client for MISO API
 *
 * Streams chat responses from /api/chat (Next.js proxy)
 */

export interface StreamChatOptions {
  onData: (text: string, moreInfo?: { conversationId?: string; messageId?: string }) => void;
  onMessageEnd?: (messageEnd: { id?: string; metadata?: Record<string, unknown> }) => void;
  onMessageReplace?: (data: { answer?: string; conversation_id?: string; id?: string }) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  signal?: AbortSignal;
}

export async function streamChat(
  query: string,
  conversationId: string | null,
  userId: string,
  options: StreamChatOptions
): Promise<void> {
  const { onData, onMessageEnd, onMessageReplace, onError, onComplete, signal } = options;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        conversation_id: conversationId || "",
        user: userId,
      }),
      signal,
    });

    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
      } catch {
        errorMessage = `HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const jsonStr = line.slice(5).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;

        try {
          const data = JSON.parse(jsonStr);
          const event = data.event;

          if (event === "agent_message" || event === "message") {
            const text = data.answer || "";
            onData(text, {
              conversationId: data.conversation_id,
              messageId: data.message_id || data.id,
            });
          } else if (event === "message_end") {
            onMessageEnd?.({
              id: data.message_id || data.id,
              metadata: data.metadata,
            });
          } else if (event === "message_replace") {
            onMessageReplace?.({
              answer: data.answer,
              conversation_id: data.conversation_id,
              id: data.message_id || data.id,
            });
          }
          // Ignore other event types (agent_thought, etc.)
        } catch {
          // Skip unparseable lines
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const remaining = buffer.trim();
      if (remaining.startsWith("data:")) {
        const jsonStr = remaining.slice(5).trim();
        if (jsonStr && jsonStr !== "[DONE]") {
          try {
            const data = JSON.parse(jsonStr);
            if (data.event === "agent_message" || data.event === "message") {
              onData(data.answer || "", {
                conversationId: data.conversation_id,
                messageId: data.message_id || data.id,
              });
            }
          } catch {
            // Ignore
          }
        }
      }
    }

    onComplete?.();
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      onComplete?.();
      return;
    }
    const err = error instanceof Error ? error : new Error("Unknown error");
    onError?.(err);
  }
}
