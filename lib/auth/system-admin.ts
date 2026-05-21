import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function isSystemAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase.rpc("is_system_admin");
  return !error && data === true;
}

export async function requireSystemAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin, error } = await supabase.rpc("is_system_admin");

  if (error || !isAdmin) {
    redirect("/dashboard");
  }

  return { userId: user.id };
}
