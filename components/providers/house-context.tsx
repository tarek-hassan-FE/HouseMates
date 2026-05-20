"use client";

import { createContext, useContext } from "react";
import type { House, Profile } from "@/lib/database.types";

type HouseContextValue = {
  profile: Profile;
  house: House;
  isAdmin: boolean;
};

const HouseContext = createContext<HouseContextValue | null>(null);

export function HouseProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: HouseContextValue;
}) {
  return (
    <HouseContext.Provider value={value}>{children}</HouseContext.Provider>
  );
}

export function useHouse() {
  const ctx = useContext(HouseContext);
  if (!ctx) {
    throw new Error("useHouse must be used within HouseProvider");
  }
  return ctx;
}
