"use client";

import { createContext, useContext } from "react";

export interface MenuPrivilege {
  path: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface PrivilegeContextType {
  isSuperAdmin: boolean;
  privileges: MenuPrivilege[];
  can: (path: string, action: "canView" | "canCreate" | "canEdit" | "canDelete") => boolean;
  /** Refetch `/api/auth/me` to update nav menus after group privilege changes (e.g. super-admin canView). */
  refreshSession: () => void;
}

export const PrivilegeContext = createContext<PrivilegeContextType>({
  isSuperAdmin: false,
  privileges: [],
  can: () => false,
  refreshSession: () => {},
});

export function usePrivileges() {
  return useContext(PrivilegeContext);
}
