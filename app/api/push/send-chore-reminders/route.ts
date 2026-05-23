import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/api/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { processPushOutbox } from "@/lib/web-push";

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const admin = createAdminClient();
    const { data: count, error } = await admin.rpc("send_chore_reminders");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const pushResult = await processPushOutbox();

    return NextResponse.json({
      reminders_sent: count ?? 0,
      push: pushResult,
    });
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
