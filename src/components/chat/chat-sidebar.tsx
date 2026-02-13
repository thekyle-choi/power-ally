"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Plus,
  MessageCircle,
  Trash2,
  PencilLine,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { ChatSession } from "@/types";

// =============================================================================
// Types
// =============================================================================

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onOpenSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onClose?: () => void;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function groupSessionsByDate(sessions: ChatSession[]) {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  const sevenDaysAgo = todayTs - 7 * 24 * 60 * 60 * 1000;

  const groups: { label: string; sessions: ChatSession[] }[] = [
    { label: "Today", sessions: [] },
    { label: "이전 7일", sessions: [] },
    { label: "이전", sessions: [] },
  ];

  // Sort sessions by updatedAt desc
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  for (const session of sorted) {
    if (session.updatedAt >= todayTs) {
      groups[0].sessions.push(session);
    } else if (session.updatedAt >= sevenDaysAgo) {
      groups[1].sessions.push(session);
    } else {
      groups[2].sessions.push(session);
    }
  }

  return groups.filter((g) => g.sessions.length > 0);
}

// =============================================================================
// SessionItem Component
// =============================================================================

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

function SessionItem({
  session,
  isActive,
  onOpen,
  onDelete,
  onRename,
}: SessionItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameSubmit = () => {
    if (renameValue.trim()) {
      onRename(renameValue.trim());
    }
    setIsRenaming(false);
  };

  if (isRenaming) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <Input
          ref={inputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRenameSubmit();
            if (e.key === "Escape") setIsRenaming(false);
          }}
          onBlur={handleRenameSubmit}
          className="h-7 text-sm"
        />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <div className="group relative">
        <button
          onClick={onOpen}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors",
            isActive
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <MessageCircle className="size-4 shrink-0 opacity-60" />
          <span className="truncate flex-1">{session.title}</span>
        </button>

        <DropdownMenuTrigger asChild>
          <button
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10 transition-opacity"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="text-muted-foreground"
            >
              <circle cx="4" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="12" cy="8" r="1.5" />
            </svg>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={() => {
              setRenameValue(session.title);
              setIsRenaming(true);
            }}
          >
            <PencilLine className="size-4 mr-2" />
            이름 변경
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4 mr-2" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}

// =============================================================================
// ChatSidebar Component
// =============================================================================

export function ChatSidebar({
  sessions,
  currentSessionId,
  onNewChat,
  onOpenSession,
  onDeleteSession,
  onRenameSession,
  onClose,
  className,
}: ChatSidebarProps) {
  const groups = useMemo(() => groupSessionsByDate(sessions), [sessions]);

  return (
    <aside
      className={cn(
        "w-[260px] bg-sidebar flex flex-col h-full border-r border-sidebar-border shrink-0",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <span className="text-xl font-bold tracking-tight text-foreground">
            ALLY
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <PanelLeftClose className="size-5" />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-2">
        <button
          onClick={onNewChat}
          className="flex items-center gap-3 w-full px-3 py-2.5 bg-background border border-border rounded-lg shadow-sm hover:shadow text-sm text-foreground hover:border-muted-foreground/30 transition-all text-left"
        >
          <Plus className="size-[18px] text-primary" />
          New chat
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <h3 className="px-3 text-xs font-medium text-muted-foreground mb-2">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentSessionId}
                  onOpen={() => onOpenSession(session.id)}
                  onDelete={() => onDeleteSession(session.id)}
                  onRename={(title) => onRenameSession(session.id, title)}
                />
              ))}
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              대화 이력이 없습니다
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
