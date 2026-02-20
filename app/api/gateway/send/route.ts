import { NextRequest, NextResponse } from "next/server"
import { sendToGateway } from "@/lib/openclaw-client"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { gatewayUrl, authToken, method, params } = await request.json()

    if (!gatewayUrl || !authToken) {
      return NextResponse.json({ error: "Missing gatewayUrl or authToken" }, { status: 400 })
    }
    if (!method) {
      return NextResponse.json({ error: "Missing 'method' in request body" }, { status: 400 })
    }

    const response = await sendToGateway(gatewayUrl, authToken, method, params)
    return NextResponse.json(response)
  } catch (err) {
    return NextResponse.json(
      {
        type: "res",
        id: "error",
        error: {
          code: -1,
          message: err instanceof Error ? err.message : "Unknown error",
        },
      },
      { status: 500 }
    )
  }
}
