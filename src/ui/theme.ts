export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "liquidazi-theme";

const prefersDark = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const resolveTheme = (pref: Theme): "light" | "dark" =>
  pref === "system" ? (prefersDark() ? "dark" : "light") : pref;

export const applyTheme = (pref: Theme) => {
  const resolved = resolveTheme(pref);
  document.documentElement.setAttribute("data-theme", resolved);
};

export const loadThemePref = (): Theme => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
};

export const saveThemePref = (pref: Theme) => {
  localStorage.setItem(STORAGE_KEY, pref);
  applyTheme(pref);
};

export const initTheme = () => {
  const pref = loadThemePref();
  applyTheme(pref);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (loadThemePref() === "system") applyTheme("system");
  });
};
