"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { ArrowUp, Plus, X, Clock } from "lucide-react";
import { useAllyChat } from "@/hooks/use-ally-chat";
import { useChatStore } from "@/stores/chat-store";
import { ChatMessages } from "./chat-messages";

// =============================================================================
// Suggestions
// =============================================================================

const SUGGESTIONS = [
  "반복되는 보고서 작성을 줄이고 싶어요",
  "부서 간 정보 공유가 잘 안 돼요",
  "교대 근무 인수인계를 효율적으로 하고 싶어요",
];

// =============================================================================
// ChatLayout Component
// =============================================================================

export function ChatLayout() {
  const [isMounted, setIsMounted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [landingValue, setLandingValue] = useState("");
  const landingTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Zustand store
  const sessions = useChatStore((s) => s.sessions);
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const userId = useChatStore((s) => s.userId);
  const createSession = useChatStore((s) => s.createSession);
  const openSession = useChatStore((s) => s.openSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const updateSessionMessages = useChatStore((s) => s.updateSessionMessages);
  const updateSessionConversationId = useChatStore(
    (s) => s.updateSessionConversationId
  );
  const getCurrentSession = useChatStore((s) => s.getCurrentSession);

  const currentSession = getCurrentSession();

  // Scroll refs
  const scrollRef = useRef<HTMLElement>(null);
  const scrolledToMessageRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string>("ready");

  // Chat hook
  const {
    messages,
    conversationId,
    sendMessage,
    status,
    error,
    clearError,
  } = useAllyChat({
    id: currentSessionId || "default",
    initialMessages: currentSession?.messages || [],
    initialConversationId: currentSession?.conversationId || undefined,
    userId,
    onFinish: ({ messages, conversationId }) => {
      if (currentSessionId) {
        updateSessionMessages(currentSessionId, messages);
        if (conversationId) {
          updateSessionConversationId(currentSessionId, conversationId);
        }
      }
    },
  });

  // Sync messages to store when they change during streaming
  const prevMessagesLenRef = useRef(0);
  useEffect(() => {
    if (currentSessionId && messages.length > prevMessagesLenRef.current) {
      updateSessionMessages(currentSessionId, messages);
    }
    prevMessagesLenRef.current = messages.length;
  }, [messages.length, currentSessionId, updateSessionMessages]);

  // Sync conversationId
  useEffect(() => {
    if (currentSessionId && conversationId) {
      updateSessionConversationId(currentSessionId, conversationId);
    }
  }, [conversationId, currentSessionId, updateSessionConversationId]);

  // Mount check for hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Create initial session if none exists
  useEffect(() => {
    if (isMounted && sessions.length === 0) {
      createSession();
    }
  }, [isMounted, sessions.length, createSession]);

  // Scroll helper: scroll an assistant message element to the top of the container
  const scrollToMessage = useCallback((messageId: string) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el && scrollRef.current) {
        const containerRect = scrollRef.current.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const offset = elRect.top - containerRect.top + scrollRef.current.scrollTop;
        scrollRef.current.scrollTo({
          top: offset - 24,
          behavior: "smooth",
        });
      }
    });
  }, []);

  // Scroll to assistant response start when it first appears
  useEffect(() => {
    if (status !== "submitted" && status !== "streaming") return;

    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === "assistant" &&
      lastMessage.id !== scrolledToMessageRef.current
    ) {
      scrolledToMessageRef.current = lastMessage.id;
      scrollToMessage(lastMessage.id);
    }
  }, [messages, status, scrollToMessage]);

  // Re-scroll when streaming finishes so reveal effect starts at the right position
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === "streaming" || prevStatusRef.current === "submitted";
    const isNowReady = status === "ready";
    prevStatusRef.current = status;

    if (wasStreaming && isNowReady && scrolledToMessageRef.current) {
      scrollToMessage(scrolledToMessageRef.current);
    }
  }, [status, scrollToMessage]);

  // Close history on outside click
  useEffect(() => {
    if (!showHistory) return;
    const handler = () => setShowHistory(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showHistory]);

  // Auto-resize landing textarea
  useEffect(() => {
    const textarea = landingTextareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [landingValue]);

  // Go to landing (new session)
  const handleGoHome = useCallback(() => {
    const current = getCurrentSession();
    if (current && current.messages.length === 0) {
      setLandingValue("");
      return;
    }
    createSession();
    setLandingValue("");
    setShowHistory(false);
  }, [getCurrentSession, createSession]);

  // Send message
  const handleSendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (!currentSessionId) {
        createSession();
      }
      sendMessage({ text: trimmed });
      setLandingValue("");
    },
    [currentSessionId, createSession, sendMessage]
  );

  // Form answer submission
  const handleQuestionSubmit = useCallback(
    (answers: Record<string, string>) => {
      const formatted = Object.entries(answers)
        .map(([header, value]) => `- ${header}: ${value}`)
        .join("\n");
      handleSendMessage(formatted);
    },
    [handleSendMessage]
  );

  // Landing textarea key handler
  const handleLandingKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !(e.nativeEvent as unknown as { isComposing: boolean }).isComposing
      ) {
        e.preventDefault();
        if (landingValue.trim()) {
          handleSendMessage(landingValue);
        }
      }
    },
    [landingValue, handleSendMessage]
  );

  const isStreaming = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0;

  // Sessions with messages (for history list)
  const sessionsWithMessages = sessions.filter(
    (s) => s.messages.length > 0 && s.id !== currentSessionId
  );

  // Don't render until mounted
  if (!isMounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white" />
    );
  }

  // ===========================================================================
  // LANDING VIEW
  // ===========================================================================
  if (!hasMessages) {
    return (
      <div className="min-h-screen flex flex-col landing-bg">
        <div className="landing-orb" />
        {/* History link */}
        {sessionsWithMessages.length > 0 && (
          <div className="fixed top-6 right-6 z-10 animate-fade-in">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHistory(!showHistory);
                }}
                className="font-ui text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
              >
                <Clock className="size-3.5" />
                이전 대화
              </button>

              {showHistory && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white/90 backdrop-blur-xl border border-divider/60 rounded-2xl shadow-xl z-50 font-ui overflow-hidden">
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">이전 대화</p>
                  </div>
                  <div className="max-h-72 hover-scrollbar px-2 pb-2">
                    {sessionsWithMessages.slice(0, 20).map((session) => (
                      <div
                        key={session.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          openSession(session.id);
                          setShowHistory(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            openSession(session.id);
                            setShowHistory(false);
                          }
                        }}
                        className="group/item flex items-center justify-between px-3 py-2.5 rounded-lg text-sm hover:bg-highlight transition-colors cursor-pointer"
                      >
                        <span className="truncate text-left text-text-primary">
                          {session.title}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          className="text-text-tertiary hover:text-text-primary ml-2 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Centered content */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-[540px]">
            {/* Logo */}
            <div className="text-center mb-12 animate-fade-in">
              <h1 className="text-[42px] font-bold tracking-[-0.02em] text-text-primary mb-3">
                Unfold
              </h1>
              <p className="text-lg text-text-secondary">
                어떤 문제를 해결하고 싶으신가요?
              </p>
            </div>

            {/* Input */}
            <div className="animate-fade-in-delay">
              <div className="relative border border-divider rounded-2xl bg-white/80 backdrop-blur-xl hover:border-text-secondary/40 focus-within:border-text-primary/30 transition-colors shadow-sm">
                <textarea
                  ref={landingTextareaRef}
                  value={landingValue}
                  onChange={(e) => setLandingValue(e.target.value)}
                  onKeyDown={handleLandingKeyDown}
                  placeholder="풀고 싶은 문제를 자유롭게 적어주세요..."
                  className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-text-primary placeholder:text-text-tertiary text-lg resize-none px-5 pt-5 pb-14 min-h-[56px] leading-relaxed"
                  rows={2}
                  autoFocus
                />
                <div className="absolute right-4 bottom-4">
                  <button
                    onClick={() => handleSendMessage(landingValue)}
                    disabled={!landingValue.trim()}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-text-primary text-white hover:bg-text-primary/80 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="size-[18px]" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="mt-5 flex flex-wrap justify-center gap-2 animate-fade-in-delay-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSendMessage(suggestion)}
                  className="font-ui text-[13px] text-text-secondary px-4 py-2 rounded-full border border-divider hover:border-text-secondary hover:text-text-primary transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute left-5 right-5 bottom-5 z-10 flex items-center justify-between">
          <a
            href="https://gsholdings.notion.site/306f800bd1c180899a38f4c5379c1cba?pvs=105"
            target="_blank"
            rel="noopener noreferrer"
            className="font-ui text-xs text-text-secondary px-4 py-2 rounded-full border border-divider hover:border-text-secondary hover:text-text-primary bg-white/60 backdrop-blur-sm transition-colors"
          >
            의견 접수하기
          </a>
          <div className="flex items-center gap-1.5">
            <Image
              src="/character.png"
              alt="Unfold character"
              width={18}
              height={18}
              className="object-contain opacity-50"
            />
            <span className="font-ui text-xs text-text-tertiary/60">
              52g Studio
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // ACTIVE CONVERSATION VIEW
  // ===========================================================================
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="w-full px-6 py-4 flex justify-between items-center z-20 bg-white/80 backdrop-blur-sm border-b border-divider/50">
        <button
          onClick={handleGoHome}
          className="text-xl font-bold tracking-[-0.02em] text-text-primary hover:opacity-60 transition-opacity"
        >
          Unfold
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={handleGoHome}
            className="font-ui text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-highlight"
          >
            <Plus className="size-3.5" />
            새 질문
          </button>

          {sessionsWithMessages.length > 0 && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHistory(!showHistory);
                }}
                className="font-ui text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-highlight"
              >
                <Clock className="size-3.5" />
              </button>

              {showHistory && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white/90 backdrop-blur-xl border border-divider/60 rounded-2xl shadow-xl z-50 font-ui overflow-hidden">
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">이전 대화</p>
                  </div>
                  <div className="max-h-72 hover-scrollbar px-2 pb-2">
                    {sessionsWithMessages.slice(0, 20).map((session) => (
                      <div
                        key={session.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          openSession(session.id);
                          setShowHistory(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            openSession(session.id);
                            setShowHistory(false);
                          }
                        }}
                        className="group/item flex items-center justify-between px-3 py-2.5 rounded-lg text-sm hover:bg-highlight transition-colors cursor-pointer"
                      >
                        <span className="truncate text-left text-text-primary">
                          {session.title}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          className="text-text-tertiary hover:text-text-primary ml-2 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-[780px] mx-auto px-6 pt-10 pb-16">
          <ChatMessages
            messages={messages}
            isStreaming={isStreaming}
            status={status}
            error={error}
            onRetry={clearError}
            onQuestionSubmit={handleQuestionSubmit}
          />
        </div>
      </main>
    </div>
  );
}
