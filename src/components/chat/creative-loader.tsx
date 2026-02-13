"use client";

import { cn } from "@/lib/utils";

interface CreativeLoaderProps {
  className?: string;
}

export function CreativeLoader({ className }: CreativeLoaderProps) {
  return (
    <div className={cn("flex items-center gap-[3px] py-4", className)}>
      <span className="unfold-bar" style={{ animationDelay: "0ms" }} />
      <span className="unfold-bar" style={{ animationDelay: "150ms" }} />
      <span className="unfold-bar" style={{ animationDelay: "300ms" }} />
    </div>
  );
}
