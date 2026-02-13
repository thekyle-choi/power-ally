"use client";

import { memo, useMemo, useRef, useEffect, useState } from "react";
import {
  parseMisoResponse,
  parseMisoResponsePartial,
} from "@/lib/miso-response-parser";
import { useRevealText } from "@/hooks/use-reveal-text";
import { MessageResponse } from "./message-primitives";
import { StreamingQuestions } from "./streaming-questions";
import { ProblemDefinitionCard } from "./problem-definition-card";
import { StatusIndicator, getLoadingConfig } from "./status-indicator";

// =============================================================================
// AllyMessage Component
// =============================================================================

export interface AllyMessageProps {
  text: string;
  isStreaming?: boolean;
  isActive?: boolean;
  onQuestionSubmit?: (answers: Record<string, string>) => void;
}

export const AllyMessage = memo(
  ({
    text,
    isStreaming = false,
    isActive = true,
    onQuestionSubmit,
  }: AllyMessageProps) => {
    // Track "just finished streaming" to enable reveal effect
    const wasStreamingRef = useRef(false);
    const [shouldReveal, setShouldReveal] = useState(false);

    useEffect(() => {
      if (isStreaming) {
        wasStreamingRef.current = true;
      } else if (wasStreamingRef.current) {
        // Streaming just finished → enable reveal
        wasStreamingRef.current = false;
        setShouldReveal(true);
      }
    }, [isStreaming]);

    const parsed = useMemo(() => {
      if (!text) return null;
      return isStreaming
        ? parseMisoResponsePartial(text)
        : parseMisoResponse(text);
    }, [text, isStreaming]);

    const message = parsed?.message ?? "";

    const { displayedText, progress } = useRevealText(message, {
      enabled: shouldReveal && isActive && !isStreaming,
    });

    // Turn off reveal once it completes
    useEffect(() => {
      if (shouldReveal && progress >= 1) {
        setShouldReveal(false);
      }
    }, [shouldReveal, progress]);

    if (!parsed) return null;

    const {
      questions,
      loadingType,
      problemDefinition,
    } = parsed;

    const loadingConfig = getLoadingConfig(loadingType ?? null);
    const showLoadingIndicator = isStreaming && loadingConfig;

    // Persist questions if message content is replaced without <form>
    const cachedQuestionsRef = useRef<typeof questions>([]);

    useEffect(() => {
      if (questions.length > 0) {
        cachedQuestionsRef.current = questions;
      }
    }, [questions]);

    const resolvedQuestions =
      questions.length > 0 ? questions : cachedQuestionsRef.current;

    const showQuestions = !isStreaming && resolvedQuestions.length > 0;
    const revealInProgress = shouldReveal && progress < 1;

    // Show form/card when reveal progress > 0.5 (or no reveal)
    const showFormByProgress = !revealInProgress || progress > 0.5;

    return (
      <>
        {/* Loading indicator */}
        {showLoadingIndicator && loadingConfig && (
          <StatusIndicator
            label={loadingConfig.label}
            description={loadingConfig.message}
            isLoading
          />
        )}

        {/* Message text */}
        {message && (
          <MessageResponse>
            {revealInProgress ? displayedText : message}
          </MessageResponse>
        )}

        {/* Problem Definition Card */}
        {problemDefinition && showFormByProgress && (
          <ProblemDefinitionCard data={problemDefinition} animateEntrance={shouldReveal} />
        )}

        {/* Questions form */}
        {showQuestions && showFormByProgress && (
          <StreamingQuestions
            questions={resolvedQuestions}
            isStreaming={false}
            isActive={isActive}
            animateEntrance={shouldReveal}
            onSubmit={(answers) => {
              onQuestionSubmit?.(answers);
            }}
          />
        )}
      </>
    );
  }
);

AllyMessage.displayName = "AllyMessage";
