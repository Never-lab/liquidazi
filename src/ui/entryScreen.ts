/** Marketing door when signed out (competitive bet B1). */
export const SIGNED_OUT_DOOR = "landing" as const;

const PUBLIC_WHEN_SIGNED_OUT = new Set([
  "landing",
  "leaderboard",
  "tutorial",
  "guide",
  "feedback",
]);

/**
 * After persist rehydrate: signed-out users must not stay on in-app surfaces.
 * Stale `auth` screen becomes the landing door. Public screens stay reachable.
 */
export const coerceScreenIfSignedOut = (screen: string, hasAuth: boolean): string => {
  if (hasAuth) return screen;
  if (screen === "auth") return SIGNED_OUT_DOOR;
  if (PUBLIC_WHEN_SIGNED_OUT.has(screen)) return screen;
  return SIGNED_OUT_DOOR;
};
