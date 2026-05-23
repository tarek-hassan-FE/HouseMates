import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SubscribeBody = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: request.headers.get("user-agent"),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let endpoint: string | undefined;
  try {
    const body = (await request.json()) as { endpoint?: string };
    endpoint = body.endpoint;
  } catch {
    endpoint = undefined;
  }

  if (endpoint) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);
  } else {
    await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  }

  return NextResponse.json({ success: true });
}
