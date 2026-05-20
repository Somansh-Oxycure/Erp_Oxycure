'use client';

import { useRole } from '@/hooks/useRole';

interface RoleGateProps {
  roles: string[];
  children: React.ReactNode;
}

/**
 * Renders children only if the current user's role is in the allowed list.
 */
export function RoleGate({ roles, children }: RoleGateProps) {
  const role = useRole();
  if (!role || !roles.includes(role)) return null;
  return <>{children}</>;
}
