import { round2 } from "../sim/types";

export const MONTHLY_MORA_RATE = 0.01;
export const MONTHS_BEFORE_CARTELLA = 6;
export const RATEATION_MONTHS = 12;
export const RATEATION_FEE = 0.10;
export const ENFORCEMENT_AGGIO = 0.08;
export const ENFORCEMENT_MONTHS_TO_TERMINAL = 4;
export const TERMINAL_MONTHS_TO_LOST = 3;
export const LOST_THRESHOLD_FLOOR = 2000;
export const LOST_THRESHOLD_YTD_PCT = 0.05;

export const COMPLIANCE_CARTELLA = 15;
export const COMPLIANCE_IGNORE = 20;
export const COMPLIANCE_SKIP_RATA = 10;
export const COMPLIANCE_PAY_CLOSE = 5;
export const COMPLIANCE_RATEATION_DONE = 8;
export const COMPLIANCE_ENFORCEMENT_CLEAR = 3;

export const lostThreshold = (ytdRevenue: number): number =>
  Math.max(LOST_THRESHOLD_FLOOR, round2(ytdRevenue * LOST_THRESHOLD_YTD_PCT));
