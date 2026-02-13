"use client";

import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { memo } from "react";
import type { ComponentProps, HTMLAttributes } from "react";
import { Streamdown } from "streamdown";

// =============================================================================
// Message Container
// =============================================================================

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: "user" | "assistant";
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn("group flex w-full flex-col", className)}
    {...props}
  />
);

// =============================================================================
// Message Content
// =============================================================================

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn("flex flex-col w-full", className)}
    {...props}
  >
    {children}
  </div>
);

// =============================================================================
// Message Response (Markdown via Streamdown)
// =============================================================================

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn("prose-unfold", className)}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

MessageResponse.displayName = "MessageResponse";

// =============================================================================
// Message Error
// =============================================================================

export type MessageErrorProps = {
  error: { message?: string };
  onRetry: () => void;
  className?: string;
};

export const MessageError = ({
  error,
  onRetry,
  className,
}: MessageErrorProps) => (
  <div className={cn("py-6 my-4", className)}>
    <div className="flex items-start gap-3 p-5 rounded-2xl bg-highlight">
      <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="font-ui text-sm font-medium text-text-primary">
          오류가 발생했습니다
        </p>
        <p className="font-ui text-sm text-text-secondary">
          {error.message || "알 수 없는 오류가 발생했습니다. 다시 시도해주세요."}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="font-ui text-sm px-4 py-1.5 bg-text-primary text-white rounded-full hover:bg-text-primary/90 transition-colors shrink-0"
      >
        재시도
      </button>
    </div>
  </div>
);
