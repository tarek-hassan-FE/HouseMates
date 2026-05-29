import { HouseVaultPanel } from "@/components/vault/house-vault-panel";
import { requireHouseSession } from "@/lib/auth/session";

export default async function VaultPage() {
  const session = await requireHouseSession();

  return (
    <HouseVaultPanel
      houseName={session.house.name}
      username={session.profile.username}
      vaultData={session.house.vault_data}
      isAdmin={session.isAdmin}
      vaultIntroSeen={session.profile.vault_intro_seen ?? false}
    />
  );
}
