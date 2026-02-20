import { NextRequest } from "next/server"
import { httpRequest } from "@/lib/openclaw-client"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { messages, model, apiKey } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const body: Record<string, unknown> = {
      model: model || "anthropic/claude-sonnet-4-20250514",
      messages,
      stream: true,
    }

    // If the user provided an API key for the model provider, pass it through
    if (apiKey) {
      body.api_key = apiKey
    }

    const upstreamRes = await httpRequest("/v1/chat/completions", body)

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text()
      return new Response(
        JSON.stringify({ error: `Gateway error (${upstreamRes.status}): ${errText}` }),
        { status: upstreamRes.status, headers: { "Content-Type": "application/json" } }
      )
    }

    // Pipe the SSE stream from OpenClaw directly to the client
    return new Response(upstreamRes.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
