const GATEWAY_HTTP = "http://217.25.94.44:18800"
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
    return { reachable: res.ok || res.status === 401 }
  } catch (err) {
    return {
      reachable: false,
      error: err instanceof Error ? err.message : "Cannot reach gateway",
    }
  }
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
