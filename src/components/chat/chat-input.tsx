"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  className?: string;
}

export function ChatInput({
  onSubmit,
  onStop,
  disabled = false,
  isStreaming = false,
  className,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!value.trim()) return;
      onSubmit(value.trim());
      setValue("");
    },
    [value, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !(e.nativeEvent as unknown as { isComposing: boolean }).isComposing
      ) {
        e.preventDefault();
        if (value.trim()) handleSubmit();
      }
    },
    [value, handleSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <div className="relative border border-divider rounded-2xl bg-white hover:border-text-secondary/40 focus-within:border-text-primary/30 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="추가 질문이나 답변을 입력하세요..."
          className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-text-primary placeholder:text-text-tertiary text-base font-ui resize-none pl-5 pr-14 py-3.5 min-h-[48px] leading-relaxed"
          disabled={disabled}
          rows={1}
        />
        <div className="absolute right-3 bottom-3">
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-text-primary text-white hover:bg-text-primary/80 transition-colors"
            >
              <Square className="size-3 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!value.trim() || disabled}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-text-primary text-white hover:bg-text-primary/80 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ArrowUp className="size-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
