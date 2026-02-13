"use client";

import { memo } from "react";
import { Loader2Icon } from "lucide-react";

// =============================================================================
// Agent Configuration
// =============================================================================

interface AgentInfo {
  name: string;
  role: string;
}

const AGENTS: Record<string, AgentInfo> = {
  ally: { name: "Ally", role: "아이디어 코치" },
  kyle: { name: "Kyle", role: "기획자" },
  ian: { name: "Ian", role: "개발자" },
  heather: { name: "Heather", role: "디자이너" },
};

// =============================================================================
// Loading Configuration
// =============================================================================

interface LoadingConfig {
  label: string;
  message: string;
}

const LOADING_CONFIG: Record<string, LoadingConfig> = {
  form: {
    label: "질문 생성",
    message: "맞춤형 질문을 준비하고 있어요",
  },
  problem_definition: {
    label: "문제 정의",
    message: "문제를 정의하고 있어요",
  },
};

// =============================================================================
// StatusIndicator Component
// =============================================================================

interface StatusIndicatorProps {
  label: string;
  description: string;
  isLoading?: boolean;
}

export const StatusIndicator = memo(
  ({ label, description, isLoading = false }: StatusIndicatorProps) => (
    <div className="flex items-center gap-2 py-3 mb-2 font-ui">
      {isLoading && (
        <Loader2Icon className="size-3.5 animate-spin text-text-secondary" />
      )}
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <span className="text-xs text-text-tertiary">{description}</span>
    </div>
  )
);

StatusIndicator.displayName = "StatusIndicator";

// =============================================================================
// Helper exports
// =============================================================================

export function getAgentInfo(agentId: string | null): AgentInfo | null {
  if (!agentId) return null;
  return AGENTS[agentId] || null;
}

export function getLoadingConfig(loadingType: string | null): LoadingConfig | null {
  if (!loadingType) return null;
  return LOADING_CONFIG[loadingType] || null;
}
