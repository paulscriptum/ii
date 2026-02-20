import WebSocket from "ws"

const GATEWAY_HTTP = "http://217.25.94.44:18800"
const GATEWAY_WS = "ws://217.25.94.44:18800"
const AUTH_TOKEN = "9b0dd3b6cff44e7c0fbcb637f6179b9643979eaedefb10da"

/**
 * Check if gateway is reachable via HTTP
 */
export async function checkHealth(): Promise<{
  reachable: boolean
  error?: string
}> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(GATEWAY_HTTP, { signal: controller.signal })
    clearTimeout(timeout)
    return { reachable: res.ok }
  } catch (err) {
    return {
      reachable: false,
      error: err instanceof Error ? err.message : "Cannot reach gateway",
    }
  }
}

/**
 * Send a request to the OpenClaw gateway via WebSocket.
 * The WS endpoint is ws://host/ws?token=TOKEN
 */
export async function sendWsRequest(
  method: string,
  params?: Record<string, unknown>,
  timeoutMs = 30000
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const wsUrl = `${GATEWAY_WS}/ws?token=${AUTH_TOKEN}`
    const ws = new WebSocket(wsUrl)
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error("Request timed out"))
    }, timeoutMs)

    const reqId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    ws.on("open", () => {
      const payload: Record<string, unknown> = {
        type: "req",
        id: reqId,
        method,
      }
      if (params) payload.params = params
      ws.send(JSON.stringify(payload))
    })

    ws.on("error", (err) => {
      clearTimeout(timer)
      reject(new Error(`WebSocket error: ${err.message}`))
    })

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.id === reqId || msg.type === "res") {
          clearTimeout(timer)
          ws.close()
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)))
          } else {
            resolve(msg.result || msg)
          }
        }
      } catch {
        // skip
      }
    })

    ws.on("close", (code, reason) => {
      clearTimeout(timer)
      // only reject if promise hasn't resolved yet
    })
  })
}

/**
 * Stream messages from the OpenClaw gateway via WS.
 * Yields each message as it arrives until the response for our request ID comes back.
 */
export async function* streamWsMessages(
  method: string,
  params?: Record<string, unknown>
): AsyncGenerator<Record<string, unknown>> {
  const wsUrl = `${GATEWAY_WS}/ws?token=${AUTH_TOKEN}`
  const ws = new WebSocket(wsUrl)
  const reqId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const queue: Record<string, unknown>[] = []
  let resolveWait: (() => void) | null = null
  let done = false
  let wsError: Error | null = null

  const waitForMessage = (): Promise<void> =>
    new Promise((resolve) => {
      if (queue.length > 0 || done) resolve()
      else resolveWait = resolve
    })

  ws.on("open", () => {
    const payload: Record<string, unknown> = { type: "req", id: reqId, method }
    if (params) payload.params = params
    ws.send(JSON.stringify(payload))
  })

  ws.on("error", (err) => {
    wsError = new Error(`WebSocket error: ${err.message}`)
    done = true
    resolveWait?.()
  })

  ws.on("close", () => {
    done = true
    resolveWait?.()
  })

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString())
      queue.push(msg)
      resolveWait?.()

      // If it's the response to our request, mark as done
      if (msg.type === "res" && msg.id === reqId) {
        done = true
        ws.close()
        resolveWait?.()
      }
    } catch {
      // skip
    }
  })

  while (!done || queue.length > 0) {
    if (queue.length === 0) {
      await waitForMessage()
    }
    while (queue.length > 0) {
      yield queue.shift()!
    }
  }

  if (wsError) throw wsError
}

/**
 * Make an HTTP request to the OpenClaw API (for endpoints like /v1/chat/completions)
 */
export async function httpRequest(
  path: string,
  body: Record<string, unknown>
): Promise<Response> {
  const url = `${GATEWAY_HTTP}${path}`
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify(body),
  })
}

/**
 * Get available models from the gateway
 */
export async function getModels(): Promise<{ id: string; name: string }[]> {
  try {
    const url = `${GATEWAY_HTTP}/v1/models`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((m: { id: string }) => ({ id: m.id, name: m.id }))
    }
    return []
  } catch {
    return []
  }
}
