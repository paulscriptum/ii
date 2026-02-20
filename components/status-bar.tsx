"use client"

import { RefreshCw, Wifi, WifiOff, AlertCircle } from "lucide-react"
import type { ConnectionState } from "@/lib/types"

interface StatusBarProps {
  state: ConnectionState
  error?: string
  onReconnect: () => void
  checking: boolean
}

const stateConfig: Record<ConnectionState, { label: string; color: string; dotColor: string }> = {
  disconnected: { label: "Disconnected", color: "text-muted-foreground", dotColor: "bg-muted-foreground" },
  connecting: { label: "Connecting...", color: "text-warning", dotColor: "bg-warning" },
  authenticating: { label: "Authenticating...", color: "text-warning", dotColor: "bg-warning" },
  connected: { label: "Connected", color: "text-accent", dotColor: "bg-accent" },
  error: { label: "Error", color: "text-destructive", dotColor: "bg-destructive" },
}

export function StatusBar({ state, error, onReconnect, checking }: StatusBarProps) {
  const config = stateConfig[state]
  const isOnline = state === "connected"

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5 sm:px-6">
      <div className="flex items-center gap-3">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-accent" />
        ) : (
          <WifiOff className="h-4 w-4 text-muted-foreground" />
        )}
        <h1 className="text-sm font-semibold tracking-tight">OpenClaw</h1>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${config.dotColor} ${
              state === "connecting" ? "animate-pulse-dot" : ""
            }`}
          />
          <span className={`text-xs ${config.color}`}>{config.label}</span>
        </div>
        {state === "error" && error && (
          <div className="hidden items-center gap-1 sm:flex">
            <AlertCircle className="h-3 w-3 text-destructive" />
            <span className="max-w-[250px] truncate text-xs text-destructive">{error}</span>
          </div>
        )}
      </div>

      <button
        onClick={onReconnect}
        disabled={checking}
        className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        <RefreshCw className={`h-3 w-3 ${checking ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">{checking ? "Checking..." : "Reconnect"}</span>
      </button>
    </header>
  )
}
