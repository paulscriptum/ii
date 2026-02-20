import WebSocket from "ws"
import type { OpenClawMessage, OpenClawRequest, OpenClawResponse, OpenClawEvent } from "./types"

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "ws://217.25.94.44:18789"
const AUTH_TOKEN = process.env.OPENCLAW_AUTH_TOKEN || ""

let requestCounter = 0

function generateId(): string {
  return `web-${Date.now()}-${++requestCounter}`
}

/**
 * Creates a one-shot WebSocket connection to the OpenClaw gateway,
 * performs the connect handshake, sends one message, and returns the response.
 * This is designed for serverless (Vercel) where we can't hold long-lived connections.
 */
export async function sendToGateway(
  method: string,
  params?: Record<string, unknown>,
  timeoutMs = 30000
): Promise<OpenClawResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error("Gateway request timed out"))
    }, timeoutMs)

    const ws = new WebSocket(GATEWAY_URL)
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

    ws.on("open", () => {
      // Wait for the challenge event from gateway
    })

    ws.on("message", (data) => {
      let msg: OpenClawMessage
      try {
        msg = JSON.parse(data.toString())
      } catch {
        return
      }

      // Step 1: Receive challenge, send connect request
      if (msg.type === "event" && (msg as OpenClawEvent).event === "connect.challenge") {
        const connectReq: OpenClawRequest = {
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
            auth: { token: AUTH_TOKEN },
            locale: "en-US",
            userAgent: "openclaw-web-dashboard/1.0.0",
          },
        }
        ws.send(JSON.stringify(connectReq))
        return
      }

      // Step 2: Receive hello-ok (successful auth)
      if (msg.type === "res" && !authenticated) {
        const res = msg as OpenClawResponse
        if (res.error) {
          clearTimeout(timeout)
          ws.close()
          reject(new Error(`Auth failed: ${res.error.message}`))
          return
        }
        authenticated = true

        // If the method is just "connect" (status check), return immediately
        if (method === "connect") {
          clearTimeout(timeout)
          ws.close()
          resolve(res)
          return
        }

        // Step 3: Send the actual request
        const userReq: OpenClawRequest = {
          type: "req",
          id: requestId,
          method,
          params,
        }
        ws.send(JSON.stringify(userReq))
        return
      }

      // Step 4: Receive the response to our request
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
 * Stream a chat response from the gateway via SSE.
 * Opens a WebSocket, authenticates, sends the chat request,
 * and yields events as they come in.
 */
export async function* streamFromGateway(
  method: string,
  params?: Record<string, unknown>
): AsyncGenerator<OpenClawMessage> {
  const ws = new WebSocket(GATEWAY_URL)
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
      const connectReq: OpenClawRequest = {
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
          auth: { token: AUTH_TOKEN },
          locale: "en-US",
          userAgent: "openclaw-web-dashboard/1.0.0",
        },
      }
      ws.send(JSON.stringify(connectReq))
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

      // Check if this is a final response
      if (msg.type === "res" && (msg as OpenClawResponse).id === requestId) {
        done = true
        ws.close()
        resolveWait?.()
      }
    }
  })

  // Yield messages as they arrive
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
 * Quick health check: try to connect and authenticate with the gateway.
 */
export async function checkGatewayHealth(): Promise<{
  reachable: boolean
  authenticated: boolean
  error?: string
  info?: Record<string, unknown>
}> {
  try {
    const res = await sendToGateway("connect", undefined, 10000)
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
