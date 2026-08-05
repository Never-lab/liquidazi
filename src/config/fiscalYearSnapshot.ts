/**
 * A FiscalYearSnapshot is a frozen set of educational rates for one campaign
 * year. It is never "the live law" — fiscal logic (Phase 2+) reads only from
 * here, never hardcodes rates inline.
 *
 * This mirrors docs/fiscal-snapshot/fy2024.placeholder.json (kept as typed
 * constants rather than a cross-project JSON import, since docs/ sits
 * outside the src/ TypeScript project boundary). Keep the two in sync.
 */
export interface FiscalYearSnapshot {
  year: number;
  label: string;
  iva_standard_rate: number;
  iva_mode: string;
  f24_day: number;
  ires_rate: number;
  irap_rate: number;
  inps_employer_rate: number;
  inps_employee_rate: number;
  irpef_withholding_simplified_rate: number;
  tfr_accrual_factor: number;
  ires_acconto_pct: number;
  acconto_split_first: number;
  acconto_split_second: number;
  penalty_late_pct: number;
  interest_late_pct: number;
  /** points subtracted from the compliance score per skipped F24 */
  compliance_malus_late: number;
  diritto_camerale_flat: number;
  euribor_3m_path: number[];
  fondo_garanzia_coverage_investment: number;
  fondo_garanzia_coverage_liquidity: number;
  disclaimer: string;
}

export const fiscalYearSnapshot: FiscalYearSnapshot = {
  year: 2024,
  label: "Italia FY2024 educational pack (placeholder rates — replace before playtest)",
  iva_standard_rate: 0.22,
  iva_mode: "monthly",
  f24_day: 16,
  ires_rate: 0.24,
  irap_rate: 0.039,
  inps_employer_rate: 0.30,
  inps_employee_rate: 0.0919,
  irpef_withholding_simplified_rate: 0.23,
  tfr_accrual_factor: 0.0741,
  ires_acconto_pct: 1.0,
  acconto_split_first: 0.4,
  acconto_split_second: 0.6,
  penalty_late_pct: 0.15,
  interest_late_pct: 0.04,
  compliance_malus_late: 10,
  diritto_camerale_flat: 200,
  euribor_3m_path: [0.035, 0.035, 0.034, 0.034, 0.033, 0.033, 0.032, 0.032, 0.031, 0.031, 0.030, 0.030],
  fondo_garanzia_coverage_investment: 0.8,
  fondo_garanzia_coverage_liquidity: 0.5,
  disclaimer: "Modello educativo semplificato. Non costituisce consulenza fiscale.",
};
