import {
  STAFF_ROLES,
  baseGrossFor,
  capacityPointsFor,
  employerCostMonthly,
} from "../config/staffPay";
import { sectorById } from "../config/market";
import { useGameStore } from "../store/gameStore";
import { formatCash } from "./formatCash";
import styles from "./panels.module.css";

export const PayrollPanel = () => {
  const game = useGameStore((s) => s.game);
  const employees = game.employees;
  const sector = game.company.sector;
  const lastPayroll = game.lastPayroll;
  const tfrFund = game.tfrFund;
  const hire = useGameStore((s) => s.hireEmployee);
  const fire = useGameStore((s) => s.fireEmployee);

  const sectorLabel = sectorById(sector).label;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Personale</h2>
        <span className={styles.badge}>CCNL {sectorLabel}</span>
      </div>

      <div className={styles.cards}>
        {STAFF_ROLES.map((r) => {
          const base = baseGrossFor(sector, r.role);
          return (
            <article key={r.role} className={styles.deal}>
              <div>
                <h3 className={styles.dealTitle}>Assumi {r.role}</h3>
                <p className={styles.dealMeta}>
                  {r.blurb}
                  <br />
                  Lordo {formatCash(base)} · costo az. ~
                  {formatCash(employerCostMonthly(base))}/mese
                </p>
              </div>
              <div className={styles.dealActions}>
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => hire(r.role)}
                >
                  Assumi
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {employees.length === 0 ? (
        <p className={styles.muted}>Nessun dipendente.</p>
      ) : (
        <ul className={styles.list}>
          {employees.map((e) => (
            <li key={e.id}>
              <span>
                {e.role} · {formatCash(e.grossMonthly)} lordo ·{" "}
                {capacityPointsFor(e.role)} pt · {e.senioritySteps} scatti
              </span>
              <button
                type="button"
                className={styles.buttonDanger}
                onClick={() => fire(e.id)}
              >
                Licenzia
                {e.tfrAccrued > 0 ? ` (−${formatCash(e.tfrAccrued)} TFR)` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}

      {lastPayroll && (
        <p className={styles.muted}>
          Ultimo cedolino: netto {formatCash(lastPayroll.totalNet)}, ritenute IRPEF{" "}
          {formatCash(lastPayroll.irpefWithheld)}, INPS {formatCash(lastPayroll.inpsTotal)}.
        </p>
      )}
      {tfrFund > 0 && (
        <p className={styles.muted}>Fondo TFR accantonato: {formatCash(tfrFund)}</p>
      )}
    </section>
  );
};
