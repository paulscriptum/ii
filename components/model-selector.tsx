"use client"

import { useState } from "react"
import { ChevronDown, Key, Eye, EyeOff } from "lucide-react"

const DEFAULT_MODELS = [
  { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "meta-llama/llama-3.1-70b", name: "Llama 3.1 70B" },
]

interface ModelSelectorProps {
  models: { id: string; name: string }[]
  selectedModel: string
  onSelectModel: (model: string) => void
  apiKey: string
  onApiKeyChange: (key: string) => void
}

export function ModelSelector({
  models,
  selectedModel,
  onSelectModel,
  apiKey,
  onApiKeyChange,
}: ModelSelectorProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [customModel, setCustomModel] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)

  const allModels = models.length > 0 ? models : DEFAULT_MODELS
  const displayName =
    allModels.find((m) => m.id === selectedModel)?.name || selectedModel || "Select a model"

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-card/50 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
      {/* Model selector */}
      <div className="flex items-center gap-2">
        <label className="shrink-0 text-xs font-medium text-muted-foreground">Model:</label>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent/40"
          >
            <span className="max-w-[200px] truncate">{displayName}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-border bg-card shadow-lg">
                <div className="max-h-64 overflow-y-auto p-1">
                  {allModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onSelectModel(model.id)
                        setShowDropdown(false)
                      }}
                      className={`flex w-full flex-col rounded-md px-3 py-2 text-left transition-colors hover:bg-muted ${
                        selectedModel === model.id ? "bg-accent/10 text-accent" : "text-foreground"
                      }`}
                    >
                      <span className="text-sm font-medium">{model.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {model.id}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Custom model input */}
                <div className="border-t border-border p-2">
                  <div className="flex gap-1.5">
                    <input
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder="provider/model-name"
                      className="flex-1 rounded-md border border-border bg-input px-2 py-1.5 font-mono text-xs text-foreground placeholder-muted-foreground/50 outline-none focus:border-accent/40"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customModel.trim()) {
                          onSelectModel(customModel.trim())
                          setCustomModel("")
                          setShowDropdown(false)
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (customModel.trim()) {
                          onSelectModel(customModel.trim())
                          setCustomModel("")
                          setShowDropdown(false)
                        }
                      }}
                      disabled={!customModel.trim()}
                      className="rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-40"
                    >
                      Use
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* API Key input */}
      <div className="flex flex-1 items-center gap-2">
        <label className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
          <Key className="h-3 w-3" />
          <span className="hidden sm:inline">API Key:</span>
        </label>
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="sk-... (optional if free model)"
            className="w-full rounded-lg border border-border bg-input px-3 py-1.5 pr-9 font-mono text-xs text-foreground placeholder-muted-foreground/50 outline-none transition-colors focus:border-accent/40"
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showApiKey ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
