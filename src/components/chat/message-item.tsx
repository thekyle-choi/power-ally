"use client";

import { memo, useMemo } from "react";
import {
  Message,
  MessageContent,
} from "./message-primitives";
import { CreativeLoader } from "./creative-loader";
import { AllyMessage } from "./ally-message";
import type { UIMessage, TextUIPart } from "@/types";

function getTextFromParts(parts: UIMessage["parts"]): string {
  return parts
    .filter((p): p is TextUIPart => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

interface MessageItemProps {
  message: UIMessage;
  isLastMessage: boolean;
  isStreaming?: boolean;
  onQuestionSubmit?: (answers: Record<string, string>) => void;
}

export const MessageItem = memo(
  ({
    message,
    isLastMessage,
    isStreaming,
    onQuestionSubmit,
  }: MessageItemProps) => {
    const isAssistantStreaming =
      isStreaming && isLastMessage && message.role === "assistant";

    const textContent = useMemo(
      () => getTextFromParts(message.parts),
      [message.parts]
    );

    const shouldShowAssistantLoader = isAssistantStreaming && !textContent;

    return (
      <Message from={message.role}>
        {/* USER MESSAGE */}
        {message.role === "user" && (
          <div className="mb-8 pl-5 border-l-2 border-text-primary/15">
            <p className="text-[17px] leading-relaxed text-text-secondary whitespace-pre-wrap">
              {textContent}
            </p>
          </div>
        )}

        {/* ASSISTANT MESSAGE */}
        {message.role === "assistant" && (
          <div className="mb-10">
            <MessageContent>
              {shouldShowAssistantLoader && <CreativeLoader />}
              {textContent && (
                <AllyMessage
                  text={textContent}
                  isStreaming={isAssistantStreaming}
                  isActive={isLastMessage}
                  onQuestionSubmit={onQuestionSubmit}
                />
              )}
            </MessageContent>
          </div>
        )}
      </Message>
    );
  }
);

MessageItem.displayName = "MessageItem";
