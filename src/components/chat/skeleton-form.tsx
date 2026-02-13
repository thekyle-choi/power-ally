"use client";

import { motion } from "motion/react";

export function FormSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" as const }}
      className="my-6 skeleton-shimmer rounded-2xl h-[360px]"
    />
  );
}

export function ProblemDefinitionSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" as const }}
      className="my-10 skeleton-shimmer rounded-2xl h-[400px]"
    />
  );
}
