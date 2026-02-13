"use client";

import { memo, useState, useCallback } from "react";
import { motion } from "motion/react";
import { Copy, Check } from "lucide-react";
import type { ProblemDefinition } from "@/types";

const FIELDS: Array<{
  key: keyof ProblemDefinition;
  label: string;
}> = [
  { key: "purpose", label: "목적" },
  { key: "target_users", label: "대상 사용자" },
  { key: "core_problem", label: "핵심 문제" },
  { key: "pain_points", label: "페인 포인트" },
];

function toMarkdown(data: ProblemDefinition): string {
  const lines: string[] = ["# 문제 정의서", ""];
  for (const { key, label } of FIELDS) {
    const value = data[key];
    if (!value) continue;
    lines.push(`## ${label}`, "", value, "");
  }
  return lines.join("\n").trimEnd();
}

interface ProblemDefinitionCardProps {
  data: ProblemDefinition;
  animateEntrance?: boolean;
}

export const ProblemDefinitionCard = memo(({ data, animateEntrance = false }: ProblemDefinitionCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(toMarkdown(data)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data]);

  const containerAnimation = animateEntrance
    ? { initial: { opacity: 0, y: 16 } as const, animate: { opacity: 1, y: 0 } as const, transition: { duration: 0.4, ease: "easeOut" as const } }
    : { initial: false as const, animate: { opacity: 1, y: 0 } as const };

  return (
    <motion.div
      {...containerAnimation}
      className="my-10 bg-highlight rounded-2xl p-6 md:p-8"
    >
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-ui text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
            Problem Definition
          </p>
          <h2 className="text-2xl font-bold text-text-primary">
            문제 정의서
          </h2>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/80 transition-colors font-ui text-xs shrink-0"
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              복사 완료
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              복사
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {FIELDS.map(({ key, label }) => {
          const value = data[key];
          if (!value) return null;
          return (
            <div key={key} className="border-b border-divider/50 pb-6 last:border-0 last:pb-0">
              <dt className="font-ui text-xs font-semibold uppercase tracking-widest text-text-secondary mb-2">
                {label}
              </dt>
              <dd className="text-lg leading-[28px] text-text-primary whitespace-pre-line">
                {value}
              </dd>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
});

ProblemDefinitionCard.displayName = "ProblemDefinitionCard";
