"use client"

import { ScrollText, ChevronDown, ChevronUp } from "lucide-react"
import { useState, useRef, useEffect } from "react"

export interface LogEntry {
  id: string
  timestamp: number
  direction: "sent" | "received" | "info" | "error"
  data: string
}

interface EventLogProps {
  entries: LogEntry[]
}

const directionColors: Record<string, string> = {
  sent: "text-info",
  received: "text-accent",
  info: "text-warning",
  error: "text-destructive",
}

const directionLabels: Record<string, string> = {
  sent: ">>>",
  received: "<<<",
  info: "---",
  error: "!!!",
}

export function EventLog({ entries }: EventLogProps) {
  const [expanded, setExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries, expanded])

  return (
    <div className="border-t border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <div className="flex items-center gap-2">
          <ScrollText className="h-3.5 w-3.5" />
          <span className="font-medium">Event Log</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
            {entries.length}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5" />
        )}
      </button>

      {expanded && (
        <div
          ref={scrollRef}
          className="max-h-48 overflow-y-auto border-t border-border bg-background px-4 py-2"
        >
          {entries.length === 0 ? (
            <p className="py-4 text-center font-mono text-xs text-muted-foreground">
              No events yet
            </p>
          ) : (
            <div className="space-y-0.5">
              {entries.map((entry) => {
                const time = new Date(entry.timestamp).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  }
                )
                return (
                  <div key={entry.id} className="flex gap-2 font-mono text-[11px]">
                    <span className="shrink-0 text-muted-foreground/50">
                      {time}
                    </span>
                    <span
                      className={`shrink-0 ${directionColors[entry.direction]}`}
                    >
                      {directionLabels[entry.direction]}
                    </span>
                    <span className="min-w-0 truncate text-muted-foreground">
                      {entry.data}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
