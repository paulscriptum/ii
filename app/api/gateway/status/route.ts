import { NextRequest, NextResponse } from "next/server"
import { checkGatewayHealth } from "@/lib/openclaw-client"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { gatewayUrl, authToken } = await request.json()

    if (!gatewayUrl || !authToken) {
      return NextResponse.json(
        { reachable: false, authenticated: false, error: "Missing gatewayUrl or authToken" },
        { status: 400 }
      )
    }

    const health = await checkGatewayHealth(gatewayUrl, authToken)
    return NextResponse.json(health)
  } catch (err) {
    return NextResponse.json(
      {
        reachable: false,
        authenticated: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
