/**
 * A FiscalYearSnapshot is a frozen set of educational rates for one campaign
 * year. It is never "the live law" — fiscal logic reads only from here.
 *
 * Sources (indicative, FY2024 educational pack):
 * - IVA 22%: DPR 633/72 aliquota ordinaria
 * - IRES 24%: art. 77 TUIR (post-2017)
 * - IRAP 3,9%: aliquota base ordinaria (regioni possono differire)
 * - INPS: aliquote semplificate datoriali/dipendenti (ordine di grandezza IVS)
 * - IRPEF withholding: flat didattica, non scaglioni
 * - TFR: 1/13,5 ≈ 7,41% del lordo
 * - Euribor path: scenario inventato per la campagna, non feed live
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
  /** bank spread over Euribor without guarantees, in basis points */
  loan_base_spread_bps: number;
  /** spread discount when backed by Fondo di Garanzia PMI (guarantee, NOT a grant) */
  fondo_garanzia_spread_discount_bps: number;
  /** spread discount with a personal fideiussione */
  fideiussione_spread_discount_bps: number;
  /** max principal the bank approves without Fondo di Garanzia */
  loan_max_principal_base: number;
  /** max principal with Fondo di Garanzia PMI backing */
  loan_max_principal_fondo: number;
  disclaimer: string;
}

export const fiscalYearSnapshot: FiscalYearSnapshot = {
  year: 2024,
  label: "Italia FY2024 educational pack (aliquote indicative + fonti in header file)",
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
  loan_base_spread_bps: 300,
  fondo_garanzia_spread_discount_bps: 100,
  fideiussione_spread_discount_bps: 50,
  loan_max_principal_base: 25000,
  loan_max_principal_fondo: 50000,
  disclaimer: "Modello educativo semplificato. Non costituisce consulenza fiscale.",
};
