export const queryKeys = {
  chores: (houseId: string) => ["chores", houseId] as const,
  redemptions: (houseId: string) => ["redemptions", houseId] as const,
};
