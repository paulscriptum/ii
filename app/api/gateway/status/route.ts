import { NextResponse } from "next/server"
import { checkHealth, getModels } from "@/lib/openclaw-client"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const health = await checkHealth()
    let models: { id: string; name: string }[] = []

    if (health.reachable) {
      models = await getModels()
    }

    return NextResponse.json({ ...health, models })
  } catch (err) {
    return NextResponse.json(
      { reachable: false, error: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    )
  }
}
