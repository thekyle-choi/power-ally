/**
 * MISO Response Parser (simplified for Power-Ally)
 *
 * Parses MISO API responses in XML-like format:
 * <agent>ally</agent>
 * 일반 메시지 텍스트...
 * <form>[questions JSON array]</form>
 * <problem_definition>{...}</problem_definition>
 */

import type { Question, ProblemDefinition, AllyParsedResponse } from "@/types";

// =============================================================================
// Parser Functions
// =============================================================================

/**
 * Extract content from XML-like tag.
 * Handles both correct format: <tag>content</tag>
 * And incorrect format: <tag>content<tag> (MISO sometimes uses this)
 */
function extractTagContent(
  text: string,
  tagName: string
): { content: string | null; isComplete: boolean; remainingText: string } {
  // Try correct closing tag first
  const correctRegex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "g");
  const correctMatch = correctRegex.exec(text);

  if (correctMatch) {
    const content = correctMatch[1].trim();
    const remainingText = text.replace(correctMatch[0], "").trim();
    return { content, isComplete: true, remainingText };
  }

  // Try incorrect closing tag: <tagName>content<tagName>
  const incorrectRegex = new RegExp(`<${tagName}>([\\s\\S]*?)<${tagName}>`, "g");
  const incorrectMatch = incorrectRegex.exec(text);

  if (incorrectMatch) {
    const content = incorrectMatch[1].trim();
    const remainingText = text.replace(incorrectMatch[0], "").trim();
    return { content, isComplete: true, remainingText };
  }

  // Try incomplete tag (streaming): <tagName>content (no closing tag)
  const incompleteRegex = new RegExp(`<${tagName}>([\\s\\S]*)$`);
  const incompleteMatch = incompleteRegex.exec(text);

  if (incompleteMatch) {
    const content = incompleteMatch[1].trim();
    const remainingText = text.replace(incompleteMatch[0], "").trim();
    return { content, isComplete: false, remainingText };
  }

  return { content: null, isComplete: true, remainingText: text };
}

function isValidQuestion(q: unknown): q is Question {
  if (!q || typeof q !== "object") return false;

  const question = q as Record<string, unknown>;

  if (typeof question.type !== "string") return false;
  if (!["select", "multiselect"].includes(question.type)) return false;
  if (typeof question.question !== "string" || !question.question) return false;
  if (typeof question.header !== "string" || !question.header) return false;
  if (!Array.isArray(question.options) || question.options.length === 0) return false;

  const allOptionsValid = question.options.every(
    (opt: unknown) =>
      opt &&
      typeof opt === "object" &&
      typeof (opt as { label?: unknown }).label === "string" &&
      (opt as { label: string }).label.length > 0
  );

  return allOptionsValid;
}

function parseQuestionsJson(jsonStr: string): Question[] {
  if (!jsonStr) return [];

  try {
    let parsed: unknown;
    parsed = safeJsonParse(jsonStr);
    if (parsed == null) return [];

    if (Array.isArray(parsed)) {
      return parsed.filter(isValidQuestion) as Question[];
    }

    if (parsed && typeof parsed === "object" && "questions" in parsed) {
      const questions = (parsed as { questions: unknown[] }).questions;
      if (Array.isArray(questions)) {
        return questions.filter(isValidQuestion) as Question[];
      }
    }

    return [];
  } catch {
    return [];
  }
}

function extractQuestionsFromTrailingJson(text: string): {
  message: string;
  questions: Question[];
  rawFormJson?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { message: text, questions: [] };
  }

  const trailingJsonMatch = trimmed.match(/(\[[\s\S]*\]|\{[\s\S]*\})\s*$/);
  if (!trailingJsonMatch) {
    return { message: text, questions: [] };
  }

  const jsonStr = trailingJsonMatch[1].trim();
  const questions = parseQuestionsJson(jsonStr);
  if (questions.length === 0) {
    return { message: text, questions: [] };
  }

  const message = trimmed
    .slice(0, trimmed.length - trailingJsonMatch[0].length)
    .trim();

  return { message, questions, rawFormJson: jsonStr };
}

function extractLoadingType(text: string): string | null {
  const match = text.match(/<loading>([^<]*)<\/loading>/);
  return match ? match[1].trim() : null;
}

function removeLoadingTags(text: string): string {
  return text.replace(/<loading>[^<]*<\/loading>/g, "").trim();
}

function parseProblemDefinitionJson(jsonStr: string): ProblemDefinition | null {
  if (!jsonStr) return null;

  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === "object") {
      return parsed as ProblemDefinition;
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// Defensive JSON Helpers
// =============================================================================

/**
 * Clean raw text for JSON detection.
 * Handles: BOM, markdown code fences, leading/trailing whitespace.
 */
function cleanRawText(text: string): string {
  // Remove BOM
  let cleaned = text.replace(/^\uFEFF/, "");

  // Remove markdown code fences wrapping the entire response
  const fenceMatch = cleaned.match(
    /^\s*```(?:json)?\s*\n([\s\S]*?)\n\s*```\s*$/
  );
  if (fenceMatch) {
    cleaned = fenceMatch[1];
  }

  return cleaned.trim();
}

/**
 * Find a balanced JSON object `{...}` in text.
 * Correctly handles nested braces, strings, and escape sequences.
 */
function findBalancedJsonObject(
  text: string
): { json: string; startIndex: number } | null {
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return {
          json: text.slice(firstBrace, i + 1),
          startIndex: firstBrace,
        };
      }
    }
  }
  return null;
}

/**
 * Repair common LLM JSON mistakes.
 *
 * Known issue: LLMs (especially gpt-oss-120b) sometimes drop the opening
 * double-quote for string values while keeping the closing one, e.g.:
 *   "description": 하루 작업을 정리할 때"
 * This function detects and repairs such patterns.
 */
function repairJson(jsonStr: string): string {
  // Fix missing opening quotes for JSON string values.
  // Pattern: "key": <non-quote-value><closing-quote>
  // We insert the missing opening quote.
  //
  // The regex matches:
  //   1. A JSON key-colon pair: "someKey":<optional spaces>
  //   2. Followed by a character that is NOT ", {, [, digit, -, t, f, n
  //      (which would indicate a properly quoted string, object, array, number, or boolean/null)
  //   3. Then any content up to a closing "
  return jsonStr.replace(
    /("(?:[^"\\]|\\.)*"\s*:\s*)(?=[^"\s\d\[\]{}tfn\-])([^"\n]*")/g,
    '$1"$2'
  );
}

/**
 * Try JSON.parse, and if it fails, attempt repair and retry.
 */
function safeJsonParse(jsonStr: string): unknown | null {
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try repairing common LLM JSON mistakes
    try {
      const repaired = repairJson(jsonStr);
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

/**
 * Build AllyParsedResponse from a parsed JSON object.
 */
function buildJsonResponse(
  parsed: Record<string, unknown>,
  leadingText?: string
): AllyParsedResponse | null {
  const hasMessage = typeof parsed.message === "string";
  const hasProblemDef =
    parsed.problem_definition &&
    typeof parsed.problem_definition === "object";
  const hasQuestions = Array.isArray(parsed.questions);

  if (!hasMessage && !hasProblemDef && !hasQuestions) return null;

  let questions: Question[] = [];
  if (hasQuestions) {
    questions = (parsed.questions as unknown[]).filter(isValidQuestion);
  }

  let message = hasMessage ? (parsed.message as string) : "";

  // If JSON has no message but there's leading text, use it
  if (!message && leadingText) {
    message = leadingText;
  }

  return {
    agentId:
      typeof parsed.agent === "string" ? parsed.agent.toLowerCase() : null,
    message,
    questions,
    isIncomplete: false,
    problemDefinition: hasProblemDef
      ? (parsed.problem_definition as ProblemDefinition)
      : null,
  };
}

// =============================================================================
// JSON Response Detection (defensive)
// =============================================================================

/**
 * Detect and parse a JSON response object from text.
 *
 * Handles all edge cases:
 *  - Pure JSON: { "message": "...", "questions": [...] }
 *  - BOM prefix: \uFEFF{...}
 *  - Markdown code fences: ```json\n{...}\n```
 *  - Leading text before JSON: "네, 이해했습니다!\n{...}"
 *  - XML tags before JSON: <agent>ally</agent>{...}
 *  - Trailing text after JSON: {...} some trailing text
 */
function tryParseJsonResponse(text: string): AllyParsedResponse | null {
  const cleaned = cleanRawText(text);

  // 1. Direct parse if starts with {
  if (cleaned.startsWith("{")) {
    const parsed = safeJsonParse(cleaned);
    if (parsed && typeof parsed === "object") {
      return buildJsonResponse(parsed as Record<string, unknown>);
    }
  }

  // 2. Look for a JSON object embedded in the text
  //    Only attempt if text looks like it contains a structured response
  if (
    cleaned.includes('"message"') ||
    cleaned.includes('"questions"') ||
    cleaned.includes('"problem_definition"')
  ) {
    const found = findBalancedJsonObject(cleaned);
    if (found) {
      const parsed = safeJsonParse(found.json);
      if (parsed && typeof parsed === "object") {
        // Extract any meaningful text before the JSON
        const leadingText = cleaned
          .slice(0, found.startIndex)
          .replace(/<\/?[a-z_]+>/gi, "")
          .trim();
        return buildJsonResponse(
          parsed as Record<string, unknown>,
          leadingText
        );
      }
    }
  }

  return null;
}

/**
 * Extract "message" value from partial (incomplete) JSON during streaming.
 * Handles code fences, BOM, and leading text before the JSON object.
 */
function tryParsePartialJsonResponse(text: string): AllyParsedResponse | null {
  const cleaned = cleanRawText(text);

  // First try complete JSON parse
  const complete = tryParseJsonResponse(text);
  if (complete) return complete;

  // Find the start of a JSON-like object
  const firstBrace = cleaned.indexOf("{");
  if (firstBrace === -1) return null;

  const jsonPart = cleaned.slice(firstBrace);

  // Must have at least a "message" field to be considered a JSON response
  const messageMatch = jsonPart.match(
    /"message"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/
  );
  if (!messageMatch) return null;

  const message = messageMatch[1]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");

  // Try to extract problem_definition even from partial JSON
  let problemDefinition: ProblemDefinition | null = null;
  const pdMatch = jsonPart.match(/"problem_definition"\s*:\s*(\{[\s\S]*)/);
  if (pdMatch) {
    const pdStr = pdMatch[1];
    let depth = 0;
    let endIdx = -1;
    for (let i = 0; i < pdStr.length; i++) {
      if (pdStr[i] === "{") depth++;
      else if (pdStr[i] === "}") {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    if (endIdx > 0) {
      try {
        problemDefinition = JSON.parse(pdStr.slice(0, endIdx + 1));
      } catch {
        // still streaming
      }
    }
  }

  return {
    agentId: null,
    message,
    questions: [],
    isIncomplete: true,
    problemDefinition,
  };
}

// =============================================================================
// Main Parser Functions
// =============================================================================

/**
 * Parse complete MISO response (after streaming is done)
 */
export function parseMisoResponse(text: string): AllyParsedResponse {
  // Try JSON format first (e.g. { "message": "...", "problem_definition": {...} })
  const jsonResult = tryParseJsonResponse(text);
  if (jsonResult) return jsonResult;

  let remainingText = removeLoadingTags(text);
  let isIncomplete = false;

  // 1. Extract agent ID
  const agentResult = extractTagContent(remainingText, "agent");
  const agentId = agentResult.content?.toLowerCase() || null;
  remainingText = agentResult.remainingText;
  if (!agentResult.isComplete) isIncomplete = true;

  // 2. Extract form questions
  const formResult = extractTagContent(remainingText, "form");
  let rawFormJson = formResult.content || undefined;
  let questions: Question[] = [];

  if (formResult.content && formResult.isComplete) {
    questions = parseQuestionsJson(formResult.content);
  }
  remainingText = formResult.remainingText;
  if (!formResult.isComplete) isIncomplete = true;

  // 3. Extract problem definition
  const problemDefResult = extractTagContent(remainingText, "problem_definition");
  let problemDefinition: ProblemDefinition | null = null;

  if (problemDefResult.content && problemDefResult.isComplete) {
    problemDefinition = parseProblemDefinitionJson(problemDefResult.content);
  }
  remainingText = problemDefResult.remainingText;
  if (!problemDefResult.isComplete) isIncomplete = true;

  // 4. Message is the remaining text
  let message = remainingText.trim();

  // Fallback: parse trailing JSON questions when <form> tag is missing
  if (questions.length === 0 && message) {
    const fallback = extractQuestionsFromTrailingJson(message);
    if (fallback.questions.length > 0) {
      questions = fallback.questions;
      message = fallback.message;
      if (!rawFormJson && fallback.rawFormJson) {
        rawFormJson = fallback.rawFormJson;
      }
    }
  }

  // Cleanup leaked <form> tags
  if (message.includes("<form>")) {
    if (message.includes("</form>")) {
      message = message.replace(/<form>[\s\S]*?<\/form>/g, "").trim();
    } else {
      const formStartIndex = message.indexOf("<form>");
      message = message.substring(0, formStartIndex).trim();
    }
  }

  return {
    agentId,
    message,
    questions,
    isIncomplete,
    rawFormJson,
    problemDefinition,
  };
}

/**
 * Parse partial response for streaming (extracts what's available)
 */
export function parseMisoResponsePartial(text: string): AllyParsedResponse {
  // Try JSON format first
  const jsonResult = tryParsePartialJsonResponse(text);
  if (jsonResult) return jsonResult;

  let loadingType = extractLoadingType(text);
  let remainingText = removeLoadingTags(text);
  let isIncomplete = false;

  // Handle incomplete loading tags during streaming
  if (remainingText.includes("<loading>") && !remainingText.includes("</loading>")) {
    const loadingStartIndex = remainingText.indexOf("<loading>");
    const partialLoadingMatch = remainingText.slice(loadingStartIndex).match(/<loading>([^<]*)/);
    if (partialLoadingMatch && partialLoadingMatch[1]) {
      loadingType = partialLoadingMatch[1].trim();
    }
    remainingText = remainingText.substring(0, loadingStartIndex).trim();
    isIncomplete = true;
  }

  // 1. Extract agent ID
  const agentResult = extractTagContent(remainingText, "agent");
  const agentId = agentResult.content?.toLowerCase() || null;
  remainingText = agentResult.remainingText;

  // 2. Extract form questions
  const formResult = extractTagContent(remainingText, "form");
  let questions: Question[] = [];
  const rawFormJson = formResult.content || undefined;
  const hasFormTag = text.includes("<form>");

  if (formResult.content && formResult.isComplete) {
    questions = parseQuestionsJson(formResult.content);
  } else if (formResult.content) {
    isIncomplete = true;
  }
  remainingText = formResult.remainingText;

  // 3. Extract problem definition
  const problemDefResult = extractTagContent(remainingText, "problem_definition");
  let problemDefinition: ProblemDefinition | null = null;

  if (problemDefResult.content && problemDefResult.isComplete) {
    problemDefinition = parseProblemDefinitionJson(problemDefResult.content);
  } else if (problemDefResult.content) {
    isIncomplete = true;
  }
  remainingText = problemDefResult.remainingText;

  // 4. Message
  let message = remainingText.trim();

  // Hide incomplete tags from message
  if (message.includes("<form>") && !message.includes("</form>")) {
    message = message.substring(0, message.indexOf("<form>")).trim();
    isIncomplete = true;
  }

  if (message.includes("<problem_definition>") && !message.includes("</problem_definition>")) {
    message = message.substring(0, message.indexOf("<problem_definition>")).trim();
    isIncomplete = true;
  }

  // Clear loading type when corresponding tag appears
  if (hasFormTag && loadingType === "form") {
    loadingType = null;
  }
  if (text.includes("<problem_definition>") && loadingType === "problem_definition") {
    loadingType = null;
  }

  return {
    agentId,
    message,
    questions,
    isIncomplete,
    rawFormJson,
    loadingType,
    problemDefinition,
  };
}
