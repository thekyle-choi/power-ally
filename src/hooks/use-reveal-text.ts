"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const CHARS_PER_TICK = 5;
const TICK_MS = 10;

interface UseRevealTextOptions {
  enabled?: boolean;
}

interface UseRevealTextReturn {
  displayedText: string;
  isRevealing: boolean;
  progress: number;
}

export function useRevealText(
  fullText: string,
  { enabled = true }: UseRevealTextOptions = {}
): UseRevealTextReturn {
  const [charIndex, setCharIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTextRef = useRef(fullText);

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Reset when fullText changes (new message)
  useEffect(() => {
    if (fullText !== prevTextRef.current) {
      cleanup();
      if (enabled) {
        setCharIndex(0);
      } else {
        setCharIndex(fullText.length);
      }
      prevTextRef.current = fullText;
    }
  }, [fullText, enabled, cleanup]);

  // Run the reveal interval
  useEffect(() => {
    if (!enabled || !fullText) {
      setCharIndex(fullText.length);
      return;
    }

    if (charIndex >= fullText.length) {
      cleanup();
      return;
    }

    if (timerRef.current === null) {
      timerRef.current = setInterval(() => {
        setCharIndex((prev) => {
          const next = prev + CHARS_PER_TICK;
          if (next >= fullText.length) {
            return fullText.length;
          }
          return next;
        });
      }, TICK_MS);
    }

    return cleanup;
  }, [fullText, charIndex, enabled, cleanup]);

  const totalLen = fullText.length;
  const isRevealing = enabled && charIndex < totalLen;
  const progress = totalLen > 0 ? Math.min(charIndex / totalLen, 1) : 1;
  const displayedText = enabled ? fullText.slice(0, charIndex) : fullText;

  return { displayedText, isRevealing, progress };
}
