import { STAFF_ROLES } from "../sim/actions";
import { useGameStore } from "../store/gameStore";
import { formatCash } from "./formatCash";
import styles from "./panels.module.css";

export const PayrollPanel = () => {
  const employees = useGameStore((s) => s.game.employees);
  const lastPayroll = useGameStore((s) => s.game.lastPayroll);
  const tfrFund = useGameStore((s) => s.game.tfrFund);
  const hire = useGameStore((s) => s.hireEmployee);
  const fire = useGameStore((s) => s.fireEmployee);

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Personale</h2>

      <div className={styles.row}>
        {STAFF_ROLES.map((r) => (
          <button
            key={r.role}
            className={styles.buttonSecondary}
            onClick={() => hire(r.role)}
          >
            Assumi {r.role} ({r.blurb})
          </button>
        ))}
      </div>

      {employees.length === 0 ? (
        <p className={styles.muted}>Nessun dipendente.</p>
      ) : (
        <ul className={styles.list}>
          {employees.map((e) => (
            <li key={e.id}>
              <span>
                {e.role} — {formatCash(e.grossMonthly)} lordi/mese
              </span>
              <button className={styles.buttonDanger} onClick={() => fire(e.id)}>
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
