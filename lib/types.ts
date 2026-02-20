// OpenClaw Gateway WebSocket Protocol Types

export interface OpenClawRequest {
  type: "req"
  id: string
  method: string
  params?: Record<string, unknown>
}

export interface OpenClawResponse {
  type: "res"
  id: string
  result?: Record<string, unknown>
  error?: {
    code: number
    message: string
  }
}

export interface OpenClawEvent {
  type: "event"
  event: string
  payload?: Record<string, unknown>
}

export type OpenClawMessage = OpenClawRequest | OpenClawResponse | OpenClawEvent

export interface ConnectParams {
  minProtocol: number
  maxProtocol: number
  client: {
    id: string
    version: string
    platform: string
    mode: string
  }
  role: string
  scopes: string[]
  auth: { token: string }
  locale: string
  userAgent: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
}

export interface GatewayStatus {
  connected: boolean
  authenticated: boolean
  error?: string
  gatewayInfo?: Record<string, unknown>
}

export type ConnectionState = "disconnected" | "connecting" | "authenticating" | "connected" | "error"
