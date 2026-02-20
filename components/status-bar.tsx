"use client"

import { RefreshCw, Wifi, WifiOff, ShieldCheck, ShieldAlert } from "lucide-react"
import type { ConnectionState } from "@/lib/types"

interface StatusBarProps {
  state: ConnectionState
  error?: string
  onReconnect: () => void
  checking: boolean
}

const stateConfig: Record<
  ConnectionState,
  { label: string; color: string; dotColor: string }
> = {
  disconnected: {
    label: "Disconnected",
    color: "text-muted-foreground",
    dotColor: "bg-muted-foreground",
  },
  connecting: {
    label: "Connecting...",
    color: "text-warning",
    dotColor: "bg-warning",
  },
  authenticating: {
    label: "Authenticating...",
    color: "text-warning",
    dotColor: "bg-warning",
  },
  connected: {
    label: "Connected",
    color: "text-accent",
    dotColor: "bg-accent",
  },
  error: {
    label: "Error",
    color: "text-destructive",
    dotColor: "bg-destructive",
  },
}

export function StatusBar({ state, error, onReconnect, checking }: StatusBarProps) {
  const config = stateConfig[state]
  const isOnline = state === "connected"

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-accent" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          <h1 className="text-sm font-semibold tracking-tight sm:text-base">
            OpenClaw Gateway
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${config.dotColor} ${
              state === "connecting" || state === "authenticating"
                ? "animate-pulse-dot"
                : ""
            }`}
          />
          <span className={`text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>

        {isOnline && (
          <div className="hidden items-center gap-1 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs text-accent">Authenticated</span>
          </div>
        )}

        {state === "error" && (
          <div className="hidden items-center gap-1 sm:flex">
            <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
            <span className="max-w-[200px] truncate text-xs text-destructive">
              {error}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={onReconnect}
        disabled={checking}
        className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-border disabled:opacity-50"
      >
        <RefreshCw
          className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`}
        />
        <span className="hidden sm:inline">
          {checking ? "Checking..." : "Check Connection"}
        </span>
      </button>
    </header>
  )
}
