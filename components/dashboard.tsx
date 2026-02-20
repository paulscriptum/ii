"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { StatusBar } from "./status-bar"
import { Chat } from "./chat"
import { ModelSelector } from "./model-selector"
import type { ChatMessage, ConnectionState } from "@/lib/types"

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const SETTINGS_KEY = "openclaw-user-settings"

function loadUserSettings(): { model: string; apiKey: string } {
  if (typeof window === "undefined") return { model: "", apiKey: "" }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { model: "", apiKey: "" }
}

function saveUserSettings(model: string, apiKey: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ model, apiKey }))
  } catch { /* ignore */ }
}

export function Dashboard() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting")
  const [connectionError, setConnectionError] = useState<string>()
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([])
  const [selectedModel, setSelectedModel] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Load saved settings and check gateway on mount
  useEffect(() => {
    const saved = loadUserSettings()
    if (saved.model) setSelectedModel(saved.model)
    if (saved.apiKey) setApiKey(saved.apiKey)

    checkGateway()
  }, [])

  // Save settings when they change
  useEffect(() => {
    if (selectedModel || apiKey) {
      saveUserSettings(selectedModel, apiKey)
    }
  }, [selectedModel, apiKey])

  const checkGateway = useCallback(async () => {
    setConnectionState("connecting")
    setConnectionError(undefined)
    try {
      const res = await fetch("/api/gateway/status")
      const data = await res.json()
      if (data.reachable) {
        setConnectionState("connected")
        if (data.models?.length > 0) {
          setAvailableModels(data.models)
          if (!selectedModel) {
            setSelectedModel(data.models[0].id)
          }
        }
      } else {
        setConnectionState("error")
        setConnectionError(data.error || "Gateway not reachable")
      }
    } catch (err) {
      setConnectionState("error")
      setConnectionError(err instanceof Error ? err.message : "Network error")
    }
  }, [selectedModel])

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const assistantMsgId = genId()
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: "assistant", content: "", timestamp: Date.now() },
      ])

      try {
        // Build message history for the API
        const apiMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const res = await fetch("/api/gateway/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            model: selectedModel,
            apiKey: apiKey || undefined,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          throw new Error(errData.error || `Request failed: ${res.status}`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error("No response stream")

        const decoder = new TextDecoder()
        let fullContent = ""
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith("data: ")) continue
            const payload = trimmed.slice(6)
            if (payload === "[DONE]") continue

            try {
              const chunk = JSON.parse(payload)
              // OpenAI-compatible SSE format
              const delta = chunk.choices?.[0]?.delta?.content
              if (delta) {
                fullContent += delta
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: fullContent } : m
                  )
                )
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }

        if (!fullContent) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: "No response from model. Check your API key and model selection.", role: "system" as const }
                : m
            )
          )
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        const errMsg = err instanceof Error ? err.message : "Unknown error"
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: `Error: ${errMsg}`, role: "system" as const }
              : m
          )
        )
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [messages, selectedModel, apiKey]
  )

  const clearChat = useCallback(() => {
    setMessages([])
  }, [])

  return (
    <main className="flex h-dvh flex-col bg-background">
      <StatusBar
        state={connectionState}
        error={connectionError}
        onReconnect={checkGateway}
        checking={connectionState === "connecting"}
      />

      <ModelSelector
        models={availableModels}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
      />

      <Chat
        messages={messages}
        onSendMessage={sendMessage}
        isLoading={isLoading}
        isConnected={connectionState === "connected"}
        onClear={clearChat}
      />
    </main>
  )
}
