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
}

export const PrivilegeContext = createContext<PrivilegeContextType>({
  isSuperAdmin: false,
  privileges: [],
  can: () => false,
});

export function usePrivileges() {
  return useContext(PrivilegeContext);
}
