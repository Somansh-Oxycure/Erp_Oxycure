import { useAuthStore } from '@/stores/auth-store';

/**
 * Returns the current user's role from the auth store.
 * Use this to conditionally hide UI elements based on role.
 *
 * Example:
 *   const role = useRole();
 *   if (role === 'installer') return null;
 */
export function useRole(): string | null {
  const user = useAuthStore((s) => s.user);
  return user?.role ?? null;
}
