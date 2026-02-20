"use client"

import { Bot, User, Terminal } from "lucide-react"
import type { ChatMessage } from "@/lib/types"

interface MessageProps {
  message: ChatMessage
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user"
  const isSystem = message.role === "system"
  const time = new Date(message.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  if (isSystem) {
    return (
      <div className="flex items-start gap-3 px-4 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-muted-foreground">{message.content}</p>
          <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground/50">
            {time}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 ${
        isUser ? "" : "bg-card/50"
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
          isUser ? "bg-info/15 text-info" : "bg-accent/15 text-accent"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            {isUser ? "You" : "OpenClaw"}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {time}
          </span>
        </div>
        <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {message.content}
        </div>
      </div>
    </div>
  )
}
