"use client"

import { useState } from "react"
import { Settings, Eye, EyeOff, Save, Server, Key } from "lucide-react"

interface SettingsPanelProps {
  gatewayUrl: string
  authToken: string
  onSave: (gatewayUrl: string, authToken: string) => void
  isConnected: boolean
}

export function SettingsPanel({
  gatewayUrl: initialUrl,
  authToken: initialToken,
  onSave,
  isConnected,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(!initialUrl || !initialToken)
  const [url, setUrl] = useState(initialUrl)
  const [token, setToken] = useState(initialToken)
  const [showToken, setShowToken] = useState(false)

  const handleSave = () => {
    onSave(url.trim(), token.trim())
    if (url.trim() && token.trim()) {
      setOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
      >
        <Settings className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Settings</span>
      </button>
    )
  }

  return (
    <div className="border-b border-border bg-card/80 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-2 pb-3">
        <Settings className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold text-foreground">Gateway Settings</h2>
        {isConnected && (
          <button
            onClick={() => setOpen(false)}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {/* Gateway URL */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gateway-url" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Server className="h-3 w-3" />
            Gateway URL
          </label>
          <input
            id="gateway-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ws://217.25.94.44:18789"
            className="rounded-lg border border-border bg-input px-3 py-2 font-mono text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-colors focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
          />
          <p className="text-[11px] text-muted-foreground/60">
            WebSocket address of your OpenClaw gateway (e.g. ws://YOUR_SERVER_IP:18789)
          </p>
        </div>

        {/* Auth Token */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="auth-token" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Key className="h-3 w-3" />
            Auth Token
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="auth-token"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Your gateway auth token"
                className="w-full rounded-lg border border-border bg-input px-3 py-2 pr-10 font-mono text-sm text-foreground placeholder-muted-foreground/50 outline-none transition-colors focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            Token from your OpenClaw config.yml (gateway.auth.token)
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!url.trim() || !token.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-40 sm:w-auto sm:px-6 sm:self-start"
        >
          <Save className="h-4 w-4" />
          Save and Connect
        </button>
      </div>
    </div>
  )
}
