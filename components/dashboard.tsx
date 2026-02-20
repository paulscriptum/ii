"use client"

import { useState, useCallback, useRef } from "react"
import { StatusBar } from "./status-bar"
import { Chat } from "./chat"
import { EventLog, type LogEntry } from "./event-log"
import type { ChatMessage, ConnectionState } from "@/lib/types"

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function Dashboard() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")
  const [connectionError, setConnectionError] = useState<string>()
  const [checking, setChecking] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const addLog = useCallback(
    (direction: LogEntry["direction"], data: string) => {
      setLogEntries((prev) => [
        ...prev,
        { id: genId(), timestamp: Date.now(), direction, data },
      ])
    },
    []
  )

  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: genId(),
        role: "system",
        content,
        timestamp: Date.now(),
      },
    ])
  }, [])

  const checkConnection = useCallback(async () => {
    setChecking(true)
    setConnectionState("connecting")
    setConnectionError(undefined)
    addLog("info", "Checking gateway connection...")

    try {
      const res = await fetch("/api/gateway/status")
      const data = await res.json()

      if (data.reachable && data.authenticated) {
        setConnectionState("connected")
        addLog("received", "Gateway connected and authenticated")
        addSystemMessage("Connected to OpenClaw Gateway")
      } else if (data.reachable) {
        setConnectionState("error")
        setConnectionError("Auth failed: " + (data.error || "Unknown"))
        addLog("error", `Auth error: ${data.error}`)
        addSystemMessage(`Authentication failed: ${data.error}`)
      } else {
        setConnectionState("error")
        setConnectionError(data.error || "Gateway unreachable")
        addLog("error", `Connection error: ${data.error}`)
        addSystemMessage(`Cannot reach gateway: ${data.error}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error"
      setConnectionState("error")
      setConnectionError(msg)
      addLog("error", `Fetch error: ${msg}`)
      addSystemMessage(`Network error: ${msg}`)
    } finally {
      setChecking(false)
    }
  }, [addLog, addSystemMessage])

  const sendMessage = useCallback(
    async (content: string) => {
      // Add user message
      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMsg])
      addLog("sent", `chat.send: ${content.slice(0, 80)}${content.length > 80 ? "..." : ""}`)
      setIsLoading(true)

      // Cancel any previous request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch("/api/gateway/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "chat.send",
            params: { message: content },
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || `HTTP ${res.status}`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error("No response stream")

        const decoder = new TextDecoder()
        let assistantContent = ""
        const assistantMsgId = genId()

        // Add empty assistant message that we'll update
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: "assistant",
            content: "",
            timestamp: Date.now(),
          },
        ])

        let buffer = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const payload = line.slice(6).trim()
            if (payload === "[DONE]") continue

            try {
              const msg = JSON.parse(payload)
              addLog("received", JSON.stringify(msg).slice(0, 120))

              // Handle different event types
              if (msg.type === "event") {
                const eventName = msg.event || ""
                if (
                  eventName.includes("chat.token") ||
                  eventName.includes("chat.chunk")
                ) {
                  const token =
                    msg.payload?.token ||
                    msg.payload?.content ||
                    msg.payload?.text ||
                    ""
                  assistantContent += token
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: assistantContent }
                        : m
                    )
                  )
                } else if (eventName.includes("chat.message")) {
                  // Full message received at once
                  const fullContent =
                    msg.payload?.content ||
                    msg.payload?.message ||
                    msg.payload?.text ||
                    ""
                  if (fullContent) {
                    assistantContent = fullContent
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, content: assistantContent }
                          : m
                      )
                    )
                  }
                }
              } else if (msg.type === "res") {
                // Final response
                if (msg.result?.content || msg.result?.message || msg.result?.text) {
                  const finalContent =
                    msg.result.content || msg.result.message || msg.result.text
                  if (!assistantContent) {
                    assistantContent = finalContent
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, content: assistantContent }
                          : m
                      )
                    )
                  }
                }
                if (msg.error) {
                  addLog("error", `Error: ${msg.error.message}`)
                  if (!assistantContent) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMsgId
                          ? {
                              ...m,
                              content: `Error: ${msg.error.message}`,
                              role: "system" as const,
                            }
                          : m
                      )
                    )
                  }
                }
              } else if (msg.type === "error") {
                addLog("error", msg.error || "Unknown stream error")
              }
            } catch {
              // Skip malformed SSE data
            }
          }
        }

        // If we never got content, update message
        if (!assistantContent) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: "No response received from gateway",
                    role: "system" as const,
                  }
                : m
            )
          )
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        const msg = err instanceof Error ? err.message : "Send failed"
        addLog("error", msg)
        addSystemMessage(`Error: ${msg}`)
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [addLog, addSystemMessage]
  )

  return (
    <main className="flex h-dvh flex-col bg-background">
      <StatusBar
        state={connectionState}
        error={connectionError}
        onReconnect={checkConnection}
        checking={checking}
      />
      <Chat
        messages={messages}
        onSendMessage={sendMessage}
        isLoading={isLoading}
        isConnected={connectionState === "connected"}
      />
      <EventLog entries={logEntries} />
    </main>
  )
}
