"use client"

import { useState } from "react"
import { BookOpen, ChevronDown, ChevronRight, Copy, Check, Terminal } from "lucide-react"

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background">
      {label && (
        <div className="border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground">
          {label}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <code className="min-w-0 overflow-x-auto whitespace-pre font-mono text-xs text-foreground">
          {code}
        </code>
        <CopyButton text={code} />
      </div>
    </div>
  )
}

export function SetupGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border bg-muted/30">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span>Setup Guide -- How to configure your server</span>
        {open ? <ChevronDown className="ml-auto h-3.5 w-3.5" /> : <ChevronRight className="ml-auto h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-4 sm:px-6">
          {/* Step 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                1
              </span>
              <h3 className="text-xs font-semibold text-foreground">Connect to your server via SSH</h3>
            </div>
            <p className="pl-7 text-[11px] text-muted-foreground">
              Open Terminal on your Mac and run:
            </p>
            <div className="pl-7">
              <CodeBlock code="ssh root@217.25.94.44" />
            </div>
            <p className="pl-7 text-[11px] text-muted-foreground">
              Password: <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">eQR^o3^3WkG4Ki</code>
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                2
              </span>
              <h3 className="text-xs font-semibold text-foreground">Find the OpenClaw config file</h3>
            </div>
            <p className="pl-7 text-[11px] text-muted-foreground">
              Run these commands to find and view the config:
            </p>
            <div className="space-y-2 pl-7">
              <CodeBlock code="find / -name 'config.yml' -path '*openclaw*' 2>/dev/null" label="Find config" />
              <CodeBlock code="docker ps" label="Check running containers" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                3
              </span>
              <h3 className="text-xs font-semibold text-foreground">Open the gateway port to the internet</h3>
            </div>
            <p className="pl-7 text-[11px] text-muted-foreground">
              In the config.yml, change the gateway listen address from <code className="rounded bg-muted px-1 py-0.5 font-mono">127.0.0.1</code> to <code className="rounded bg-muted px-1 py-0.5 font-mono">0.0.0.0</code>. Also in docker-compose.yml, map the port to the host:
            </p>
            <div className="space-y-2 pl-7">
              <CodeBlock
                code={`# In docker-compose.yml, add/change ports:\nports:\n  - "18789:18789"`}
                label="docker-compose.yml"
              />
              <CodeBlock code="docker compose restart" label="Restart after changes" />
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                4
              </span>
              <h3 className="text-xs font-semibold text-foreground">Copy the auth token</h3>
            </div>
            <p className="pl-7 text-[11px] text-muted-foreground">
              In the config.yml, find <code className="rounded bg-muted px-1 py-0.5 font-mono">gateway.auth.token</code> and paste it in the settings above. The gateway URL should be:
            </p>
            <div className="pl-7">
              <CodeBlock code="ws://217.25.94.44:18789" />
            </div>
          </div>

          {/* Quick all-in-one */}
          <div className="space-y-2 rounded-lg border border-accent/20 bg-accent/5 p-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-accent" />
              <h3 className="text-xs font-semibold text-accent">Quick: All-in-one command</h3>
            </div>
            <p className="text-[11px] text-muted-foreground">
              If you just want to check what's running and get the token:
            </p>
            <CodeBlock code={`ssh root@217.25.94.44 "docker ps && find / -name 'config.yml' -path '*openclaw*' -exec cat {} \\;"`} />
          </div>
        </div>
      )}
    </div>
  )
}
