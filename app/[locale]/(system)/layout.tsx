import { SystemShell } from "@/components/system/system-shell";
import { requireSystemAdmin } from "@/lib/auth/system-admin";

export default async function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSystemAdmin();

  return <SystemShell>{children}</SystemShell>;
}
