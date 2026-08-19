/** Google-certified CMP (AdSense Privacy & messaging) — TCF / Funding Choices hooks. */

export const CONSENT_SETTINGS_LABEL = "Preferenze annunci";

type TcfApi = (
  command: string,
  version: number,
  callback?: (...args: unknown[]) => void,
  parameter?: unknown,
) => void;

type GoogleFc = {
  callbackQueue?: Array<() => void>;
  showRevocationMessage?: () => void;
};

type ConsentWindow = Window & {
  __tcfapi?: TcfApi;
  googlefc?: GoogleFc;
};

/** Re-open Google CMP privacy UI (TCF displayConsentUi or Funding Choices fallback). */
export const openGoogleConsentSettings = (win?: ConsentWindow): boolean => {
  const w: ConsentWindow | undefined =
    win ?? (typeof window !== "undefined" ? (window as ConsentWindow) : undefined);
  if (!w) return false;

  const tcf = w.__tcfapi;
  if (typeof tcf === "function") {
    tcf("displayConsentUi", 2, () => {});
    return true;
  }

  const fc = w.googlefc;
  if (typeof fc?.showRevocationMessage === "function") {
    fc.showRevocationMessage();
    return true;
  }

  return false;
};
