export type LegalPageId = "privacy" | "termini";

export const legalPageFromPath = (pathname: string): LegalPageId | null => {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/privacy") return "privacy";
  if (p === "/termini") return "termini";
  return null;
};
