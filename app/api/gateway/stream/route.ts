import { NextRequest } from "next/server"
import { streamFromGateway } from "@/lib/openclaw-client"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { gatewayUrl, authToken, method, params } = await request.json()

    if (!gatewayUrl || !authToken) {
      return new Response(
        JSON.stringify({ error: "Missing gatewayUrl or authToken" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }
    if (!method) {
      return new Response(
        JSON.stringify({ error: "Missing 'method' in request body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const msg of streamFromGateway(gatewayUrl, authToken, method, params)) {
            const data = `data: ${JSON.stringify(msg)}\n\n`
            controller.enqueue(encoder.encode(data))
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (err) {
          const errorData = `data: ${JSON.stringify({
            type: "error",
            error: err instanceof Error ? err.message : "Stream error",
          })}\n\n`
          controller.enqueue(encoder.encode(errorData))
          controller.close()
        }
      },
    })

    return new Response(stream, {
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
