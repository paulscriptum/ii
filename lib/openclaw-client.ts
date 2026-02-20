import WebSocket from "ws"
import type { OpenClawMessage, OpenClawResponse, OpenClawEvent, OpenClawRequest } from "./types"

let requestCounter = 0

function generateId(): string {
  return `web-${Date.now()}-${++requestCounter}`
}

function buildConnectRequest(authToken: string): OpenClawRequest {
  return {
    type: "req",
    id: generateId(),
    method: "connect",
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: "openclaw-web-dashboard",
        version: "1.0.0",
        platform: "web",
        mode: "operator",
      },
      role: "operator",
      scopes: ["operator.read", "operator.write"],
      auth: { token: authToken },
      locale: "en-US",
      userAgent: "openclaw-web-dashboard/1.0.0",
    },
  }
}

/**
 * One-shot WebSocket connection: connect, authenticate, send a request, get the response.
 */
export async function sendToGateway(
  gatewayUrl: string,
  authToken: string,
  method: string,
  params?: Record<string, unknown>,
  timeoutMs = 30000
): Promise<OpenClawResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error("Gateway request timed out"))
    }, timeoutMs)

    const ws = new WebSocket(gatewayUrl)
    let authenticated = false
    const requestId = generateId()

    ws.on("error", (err) => {
      clearTimeout(timeout)
      reject(new Error(`WebSocket error: ${err.message}`))
    })

    ws.on("close", (code, reason) => {
      clearTimeout(timeout)
      if (!authenticated) {
        reject(new Error(`Connection closed before auth: code=${code} reason=${reason}`))
      }
    })

    ws.on("message", (data) => {
      let msg: OpenClawMessage
      try {
        msg = JSON.parse(data.toString())
      } catch {
        return
      }

      // Step 1: Receive challenge, send connect
      if (msg.type === "event" && (msg as OpenClawEvent).event === "connect.challenge") {
        ws.send(JSON.stringify(buildConnectRequest(authToken)))
        return
      }

      // Step 2: Auth response
      if (msg.type === "res" && !authenticated) {
        const res = msg as OpenClawResponse
        if (res.error) {
          clearTimeout(timeout)
          ws.close()
          reject(new Error(`Auth failed: ${res.error.message}`))
          return
        }
        authenticated = true

        if (method === "connect") {
          clearTimeout(timeout)
          ws.close()
          resolve(res)
          return
        }

        // Step 3: Send user request
        const userReq: OpenClawRequest = {
          type: "req",
          id: requestId,
          method,
          params,
        }
        ws.send(JSON.stringify(userReq))
        return
      }

      // Step 4: User response
      if (msg.type === "res" && authenticated) {
        const res = msg as OpenClawResponse
        if (res.id === requestId) {
          clearTimeout(timeout)
          ws.close()
          resolve(res)
        }
      }
    })
  })
}

/**
 * Streaming WebSocket: connect, authenticate, send request, yield all messages.
 */
export async function* streamFromGateway(
  gatewayUrl: string,
  authToken: string,
  method: string,
  params?: Record<string, unknown>
): AsyncGenerator<OpenClawMessage> {
  const ws = new WebSocket(gatewayUrl)
  let authenticated = false
  const requestId = generateId()
  const messageQueue: OpenClawMessage[] = []
  let resolveWait: (() => void) | null = null
  let done = false
  let error: Error | null = null

  const waitForMessage = () =>
    new Promise<void>((resolve) => {
      if (messageQueue.length > 0 || done) {
        resolve()
      } else {
        resolveWait = resolve
      }
    })

  ws.on("error", (err) => {
    error = new Error(`WebSocket error: ${err.message}`)
    done = true
    resolveWait?.()
  })

  ws.on("close", () => {
    done = true
    resolveWait?.()
  })

  ws.on("message", (data) => {
    let msg: OpenClawMessage
    try {
      msg = JSON.parse(data.toString())
    } catch {
      return
    }

    if (msg.type === "event" && (msg as OpenClawEvent).event === "connect.challenge") {
      ws.send(JSON.stringify(buildConnectRequest(authToken)))
      return
    }

    if (msg.type === "res" && !authenticated) {
      const res = msg as OpenClawResponse
      if (res.error) {
        error = new Error(`Auth failed: ${res.error.message}`)
        done = true
        ws.close()
        resolveWait?.()
        return
      }
      authenticated = true

      const userReq: OpenClawRequest = {
        type: "req",
        id: requestId,
        method,
        params,
      }
      ws.send(JSON.stringify(userReq))
      return
    }

    if (authenticated) {
      messageQueue.push(msg)
      resolveWait?.()

      if (msg.type === "res" && (msg as OpenClawResponse).id === requestId) {
        done = true
        ws.close()
        resolveWait?.()
      }
    }
  })

  while (!done || messageQueue.length > 0) {
    if (messageQueue.length === 0) {
      await waitForMessage()
    }
    while (messageQueue.length > 0) {
      yield messageQueue.shift()!
    }
  }

  if (error) {
    throw error
  }
}

/**
 * Quick health check
 */
export async function checkGatewayHealth(
  gatewayUrl: string,
  authToken: string
): Promise<{
  reachable: boolean
  authenticated: boolean
  error?: string
  info?: Record<string, unknown>
}> {
  try {
    const res = await sendToGateway(gatewayUrl, authToken, "connect", undefined, 10000)
    return {
      reachable: true,
      authenticated: true,
      info: res.result,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      reachable: !message.includes("ECONNREFUSED") && !message.includes("timed out"),
      authenticated: false,
      error: message,
    }
  }
}
