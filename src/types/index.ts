// =============================================================================
// Question types (from MISO API responses)
// =============================================================================

export interface QuestionOption {
  label: string;
  description?: string;
}

export interface Question {
  id?: string;
  type: "select" | "multiselect";
  header: string;
  question: string;
  options: QuestionOption[];
  required?: boolean;
  preselected?: boolean;
}

// =============================================================================
// Problem Definition
// =============================================================================

export interface ProblemDefinition {
  purpose?: string;
  target_users?: string;
  core_problem?: string;
  pain_points?: string;
}

// =============================================================================
// Parsed response from MISO XML-like format
// =============================================================================

export interface AllyParsedResponse {
  agentId: string | null;
  message: string;
  questions: Question[];
  isIncomplete: boolean;
  rawFormJson?: string;
  loadingType?: string | null;
  problemDefinition?: ProblemDefinition | null;
}

// =============================================================================
// Chat message types (compatible with AI SDK UIMessage structure)
// =============================================================================

export interface TextUIPart {
  type: "text";
  text: string;
}

export type MessagePart = TextUIPart;

export interface UIMessage {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  createdAt?: Date;
  metadata?: Record<string, unknown>;
}

export type ChatStatus = "ready" | "submitted" | "streaming" | "error";

// =============================================================================
// Chat session (localStorage persistence)
// =============================================================================

export interface ChatSession {
  id: string;
  title: string;
  messages: UIMessage[];
  conversationId: string | null;
  createdAt: number;
  updatedAt: number;
}
