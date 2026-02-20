import { NextResponse } from "next/server"
import { checkGatewayHealth } from "@/lib/openclaw-client"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const health = await checkGatewayHealth()
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
