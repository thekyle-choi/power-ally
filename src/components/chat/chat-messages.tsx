"use client";

import { MessageError } from "./message-primitives";
import { CreativeLoader } from "./creative-loader";
import { MessageItem } from "./message-item";
import type { UIMessage, ChatStatus } from "@/types";

// =============================================================================
// Types
// =============================================================================

interface ChatMessagesProps {
  messages: UIMessage[];
  isStreaming?: boolean;
  status?: ChatStatus;
  error?: Error | null;
  onRetry?: () => void;
  onQuestionSubmit?: (answers: Record<string, string>) => void;
}

// =============================================================================
// ChatMessages Component
// =============================================================================

export function ChatMessages({
  messages,
  isStreaming,
  status,
  error,
  onRetry,
  onQuestionSubmit,
}: ChatMessagesProps) {
  if (messages.length === 0) {
    return null;
  }

  const lastMessage = messages[messages.length - 1];
  const isLastUserMessage = lastMessage?.role === "user";
  const shouldShowLoader = isLastUserMessage && status === "submitted";

  return (
    <>
      {messages.map((message, messageIndex) => (
        <div key={message.id} id={`msg-${message.id}`}>
          <MessageItem
            message={message}
            isLastMessage={messageIndex === messages.length - 1}
            isStreaming={isStreaming}
            onQuestionSubmit={onQuestionSubmit}
          />
        </div>
      ))}

      {/* Loading indicator when waiting for assistant response */}
      {shouldShowLoader && <CreativeLoader />}

      {/* Error message */}
      {error && onRetry && (
        <MessageError error={error} onRetry={onRetry} />
      )}
    </>
  );
}
