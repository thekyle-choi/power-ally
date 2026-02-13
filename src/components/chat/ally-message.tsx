"use client";

import { memo, useMemo, useRef, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  parseMisoResponse,
  parseMisoResponsePartial,
} from "@/lib/miso-response-parser";
import { useRevealText } from "@/hooks/use-reveal-text";
import { MessageResponse } from "./message-primitives";
import { StreamingQuestions } from "./streaming-questions";
import { ProblemDefinitionCard } from "./problem-definition-card";
import { FormSkeleton, ProblemDefinitionSkeleton } from "./skeleton-form";

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

    // Detect upcoming content from raw streaming text
    const hasQuestionsHint = isStreaming && text.includes('"questions"');
    const hasProblemDefHint = isStreaming && text.includes('"problem_definition"');

    // Cache hints so they persist into reveal phase
    const expectsQuestionsRef = useRef(false);
    const expectsProblemDefRef = useRef(false);

    useEffect(() => {
      if (isStreaming) {
        wasStreamingRef.current = true;
        if (hasQuestionsHint) expectsQuestionsRef.current = true;
        if (hasProblemDefHint) expectsProblemDefRef.current = true;
      } else if (wasStreamingRef.current) {
        wasStreamingRef.current = false;
        setShouldReveal(true);
      }
    }, [isStreaming, hasQuestionsHint, hasProblemDefHint]);

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
        expectsQuestionsRef.current = false;
        expectsProblemDefRef.current = false;
      }
    }, [shouldReveal, progress]);

    if (!parsed) return null;

    const { questions, problemDefinition } = parsed;

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

    // Show form/card when reveal progress > 0.5 (or no reveal active)
    const showFormByProgress = !revealInProgress || progress > 0.5;

    // --- Skeleton conditions ---
    // During streaming: message appeared + raw text hints questions/pd are coming but not parsed yet
    const showStreamingFormSkeleton =
      isStreaming && message.length > 0 && hasQuestionsHint && questions.length === 0;
    const showStreamingPdSkeleton =
      isStreaming && message.length > 0 && hasProblemDefHint && !problemDefinition;

    // During reveal: we know content exists but haven't shown it yet (progress < 0.5)
    const showRevealFormSkeleton =
      revealInProgress && !showFormByProgress && resolvedQuestions.length > 0;
    const showRevealPdSkeleton =
      revealInProgress && !showFormByProgress && !!problemDefinition;

    const formSkeletonVisible = showStreamingFormSkeleton || showRevealFormSkeleton;
    const pdSkeletonVisible = showStreamingPdSkeleton || showRevealPdSkeleton;

    return (
      <>
        {/* Message text */}
        {message && (
          <MessageResponse>
            {revealInProgress ? displayedText : message}
          </MessageResponse>
        )}

        {/* Form: skeleton → real */}
        <AnimatePresence mode="wait">
          {formSkeletonVisible ? (
            <FormSkeleton key="form-skeleton" />
          ) : showQuestions && showFormByProgress ? (
            <StreamingQuestions
              key="form-real"
              questions={resolvedQuestions}
              isStreaming={false}
              isActive={isActive}
              animateEntrance={shouldReveal}
              onSubmit={(answers) => {
                onQuestionSubmit?.(answers);
              }}
            />
          ) : null}
        </AnimatePresence>

        {/* Problem definition: skeleton → real */}
        <AnimatePresence mode="wait">
          {pdSkeletonVisible ? (
            <ProblemDefinitionSkeleton key="pd-skeleton" />
          ) : problemDefinition && showFormByProgress ? (
            <ProblemDefinitionCard
              key="pd-real"
              data={problemDefinition}
              animateEntrance={shouldReveal}
            />
          ) : null}
        </AnimatePresence>
      </>
    );
  }
);

AllyMessage.displayName = "AllyMessage";
