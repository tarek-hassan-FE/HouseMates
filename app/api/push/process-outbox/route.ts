import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/api/cron-auth";
import { processPushOutbox } from "@/lib/web-push";

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const result = await processPushOutbox();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
