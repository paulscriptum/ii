"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Loader2, Trash2 } from "lucide-react"
import { Message } from "./message"
import type { ChatMessage } from "@/lib/types"

interface ChatProps {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  isLoading: boolean
  isConnected: boolean
  onClear: () => void
}

export function Chat({ messages, onSendMessage, isLoading, isConnected, onClear }: ChatProps) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || isLoading || !isConnected) return
    onSendMessage(trimmed)
    setInput("")
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
    }
  }, [input, isLoading, isConnected, onSendMessage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
              <svg
                className="h-8 w-8 text-accent"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">OpenClaw Chat</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground text-balance">
                {isConnected
                  ? "Select a model above, enter your API key if needed, and start chatting."
                  : "Connecting to OpenClaw Gateway..."}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-3 bg-card/50 px-4 py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                </div>
                <span className="text-xs text-muted-foreground">
                  Generating response...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card p-3 sm:p-4">
        <div className="flex items-end gap-2">
          {messages.length > 0 && (
            <button
              onClick={onClear}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected
                ? "Type your message... (Enter to send, Shift+Enter for new line)"
                : "Waiting for gateway connection..."
            }
            disabled={!isConnected || isLoading}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-accent/50 focus:ring-1 focus:ring-accent/30 disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading || !isConnected}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-30"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
