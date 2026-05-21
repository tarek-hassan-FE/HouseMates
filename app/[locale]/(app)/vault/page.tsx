import { HouseVaultPanel } from "@/components/vault/house-vault-panel";
import { requireHouseSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { parseVaultData } from "@/lib/vault/types";

export default async function VaultPage() {
  const session = await requireHouseSession();
  const supabase = await createClient();

  const { data: houseRow } = await supabase
    .from("houses")
    .select("vault_data")
    .eq("id", session.house.id)
    .single();

  const vaultData = parseVaultData(houseRow?.vault_data ?? session.house.vault_data);

  return (
    <HouseVaultPanel
      houseName={session.house.name}
      username={session.profile.username}
      vaultData={vaultData}
      isAdmin={session.isAdmin}
      vaultIntroSeen={session.profile.vault_intro_seen ?? false}
    />
  );
}
