import { useEffect, useState } from "react";
import { CashSparkline, ChartsPanel } from "../components/Charts";
import { CoachBanner } from "../components/CoachBanner";
import { EventChoiceBanner } from "../components/EventChoiceBanner";
import { EventFeed } from "../components/EventFeed";
import { InvestmentsPanel } from "../components/InvestmentsPanel";
import { LoanPanel } from "../components/LoanPanel";
import { SchedulePanel } from "../components/SchedulePanel";
import { OpportunitiesPanel } from "../components/OpportunitiesPanel";
import { PayrollPanel } from "../components/PayrollPanel";
import { ReportPanel } from "../components/ReportPanel";
import { TaxPanel } from "../components/TaxPanel";
import { UpgradesPanel } from "../components/UpgradesPanel";
import { Button } from "../components/ui/Button";
import { Sheet } from "../components/ui/Sheet";
import { formatCash } from "../components/formatCash";
import { DIFFICULTIES } from "../config/difficulty";
import { cityById } from "../config/market";
import { MILESTONE_DEFS } from "../sim/milestones";
import { pressureEffectBlurb } from "../sim/pressures";
import { dueF24Total, openInvoiceSchedule, scheduleTotals, thisCloseRows } from "../sim/selectors";
import { LOSE_MONTHS_BELOW_ZERO } from "../sim/types";
import { useGameStore } from "../store/gameStore";
import styles from "./GameHUD.module.css";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

type OpsTab = "fisco" | "credito" | "crescita" | "altro";

export const GameHUD = () => {
  const game = useGameStore((s) => s.game);
  const doAdvanceMonth = useGameStore((s) => s.advanceMonth);
  const doPayF24 = useGameStore((s) => s.payF24);
  const acceptOffer = useGameStore((s) => s.acceptLoanOffer);
  const declineOffer = useGameStore((s) => s.declineLoanOffer);
  const setScreen = useGameStore((s) => s.setScreen);
  const coachOn = useGameStore((s) => s.coachOn);
  const enableCoach = useGameStore((s) => s.enableCoach);
  const [opsOpen, setOpsOpen] = useState(false);
  const [opsTab, setOpsTab] = useState<OpsTab>("fisco");
  const [auxOpen, setAuxOpen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 720px)").matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 960px)");
    const sync = () => {
      if (mq.matches) setAuxOpen(true);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const [cashPulse, setCashPulse] = useState(0);
  const city = cityById(game.company.city);
  const openTax = game.liabilities.filter((l) => !l.paid).reduce((s, l) => s + l.amount, 0);
  const f24Due = dueF24Total(game);
  const closeInvoiceTot = scheduleTotals(thisCloseRows(openInvoiceSchedule(game)));
  const offer = game.loanOffer;
  const pending = game.pendingEvent;
  const summary = game.lastCloseSummary;
  const done = new Set(game.milestones ?? []);
  const diffLabel = DIFFICULTIES[game.difficulty ?? "normal"].label;
  const seasonHint =
    game.calendar.month === 8
      ? "Agosto · stagione bassa"
      : game.calendar.month === 9
        ? "Settembre · ripresa"
        : null;

  const closeMonth = () => {
    doAdvanceMonth();
    setCashPulse((n) => n + 1);
  };

  return (
    <div className={styles.desk}>
      <header className={styles.sticky}>
        <div className={styles.stickyMeta}>
          <p className={styles.kicker}>
            {city.label} · {diffLabel}
            {seasonHint ? ` · ${seasonHint}` : ""}
          </p>
          <h2 className={styles.company}>{game.company.name}</h2>
          <p className={styles.monthLine}>
            {MESI[game.calendar.month - 1]} {game.calendar.year}
            {" · "}m{game.monthsPlayed + 1}
            {" · "}scorte {game.supplyMonths ?? 0}m
            {" · "}rep {Math.round(game.company.reputation)}
            {game.monthsBelowZero > 0
              ? ` · rosso ${game.monthsBelowZero}/${LOSE_MONTHS_BELOW_ZERO}`
              : ""}
          </p>
          <div className={styles.chips}>
            {game.quarterPressure && (
              <p
                className={styles.chip}
                title={pressureEffectBlurb(game.quarterPressure.id)}
              >
                Q · {game.quarterPressure.label} · {game.quarterPressure.monthsLeft}m
              </p>
            )}
            {game.rival && (
              <p className={styles.chip}>
                {game.rival.name} · {Math.round(game.rival.heat)}
              </p>
            )}
          </div>
        </div>
        <div className={styles.stickyActions}>
          <div key={cashPulse} className={styles.statPulse}>
            <span className={styles.statLabel}>Cassa</span>
            <strong
              className={`${styles.cash} ${game.company.cash < 0 ? styles.cashBad : ""}`}
            >
              {formatCash(game.company.cash)}
            </strong>
            <CashSparkline history={game.history} bad={game.company.cash < 0} />
          </div>
          <div>
            <span className={styles.statLabel}>F24</span>
            <strong className={`${styles.cash} ${openTax > 0 ? styles.dueWarn : ""}`}>
              {formatCash(openTax)}
            </strong>
          </div>
          <div className={styles.closeStack}>
            <Button
              className={styles.closeBtn}
              onClick={closeMonth}
              disabled={Boolean(pending)}
              title={pending ? "Risolvi prima l'evento" : undefined}
            >
              {pending ? "Risolvi evento…" : "Chiudi mese"}
            </Button>
            {closeInvoiceTot.count > 0 && !pending && (
              <p className={styles.closeHint}>
                {closeInvoiceTot.net >= 0 ? "+" : ""}
                {formatCash(closeInvoiceTot.net)} · {closeInvoiceTot.count} scad.
              </p>
            )}
          </div>
        </div>
      </header>

      <div className={styles.goals}>
        {MILESTONE_DEFS.map((m) => (
          <span
            key={m.id}
            className={done.has(m.id) ? styles.goalDone : styles.goalTodo}
            title={m.blurb}
          >
            {done.has(m.id) ? "✓ " : ""}
            {m.label}
          </span>
        ))}
      </div>

      <div className={styles.alerts}>
        <CoachBanner />
        <EventChoiceBanner />

        {summary && game.monthsPlayed > 0 && (
          <div
            key={game.monthsPlayed}
            className={`${styles.monthSummary} ${
              summary.delta >= 0 ? styles.monthGood : styles.monthBad
            }`}
            role="status"
          >
            <p className={styles.monthDelta}>
              {summary.delta >= 0 ? "Δ cassa +" : "Δ cassa "}
              {formatCash(summary.delta)}
            </p>
            {summary.lines.length > 0 && (
              <p className={styles.monthLines}>
                {summary.lines
                  .slice()
                  .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
                  .slice(0, 4)
                  .map((l) => `${l.label} ${l.amount >= 0 ? "+" : ""}${formatCash(l.amount)}`)
                  .join(" · ")}
              </p>
            )}
          </div>
        )}

        {f24Due > 0 && (
          <div className={styles.f24Due} role="alert">
            <p>
              <strong>F24 da versare:</strong> {formatCash(f24Due)}. Scadenza ~giorno 16.
            </p>
            <Button onClick={doPayF24}>Paga F24</Button>
          </div>
        )}

        {offer && (
          <div className={styles.rescue} role="alert">
            <p>
              <strong>Difficoltà di cassa.</strong> Prestito{" "}
              {formatCash(offer.principal)} / {offer.tenorMonths} mesi
              {offer.guarantee === "fondo_garanzia_pmi" ? " (Fondo PMI)" : ""}.
            </p>
            <div className={styles.rescueActions}>
              <Button onClick={acceptOffer}>Accetta</Button>
              <Button variant="ghost" onClick={declineOffer}>
                Rifiuta
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.deskBody}>
        <div className={styles.deskMain}>
          <OpportunitiesPanel />
          <SchedulePanel compact />

          <div className={styles.toolbar}>
            <Button variant="secondary" onClick={() => setOpsOpen(true)}>
              Operazioni
            </Button>
            <button
              type="button"
              className={styles.auxToggle}
              onClick={() => setAuxOpen((v) => !v)}
            >
              {auxOpen ? "Nascondi grafici / feed" : "Grafici e cronologia"}
            </button>
            <div className={styles.toolbarRight}>
              {!coachOn && (
                <Button variant="ghost" onClick={enableCoach}>
                  Guide
                </Button>
              )}
              <Button variant="ghost" onClick={() => setScreen("menu")}>
                Menu
              </Button>
            </div>
          </div>
        </div>

        {auxOpen && (
          <aside className={styles.deskSide}>
            <ChartsPanel history={game.history} />
            <EventFeed />
          </aside>
        )}
      </div>

      <Sheet open={opsOpen} title="Operazioni" onClose={() => setOpsOpen(false)}>
        <div className={styles.opsTabs}>
          {(
            [
              ["fisco", "Fisco / Personale"],
              ["credito", "Credito"],
              ["crescita", "Crescita"],
              ["altro", "Bilancio"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={opsTab === id ? styles.opsTabActive : styles.opsTab}
              onClick={() => setOpsTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.ops}>
            {opsTab === "fisco" && (
              <>
                <PayrollPanel />
                <TaxPanel />
                <SchedulePanel />
              </>
            )}
          {opsTab === "credito" && <LoanPanel />}
          {opsTab === "crescita" && (
            <>
              <InvestmentsPanel />
              <UpgradesPanel />
            </>
          )}
          {opsTab === "altro" && <ReportPanel />}
        </div>
      </Sheet>
    </div>
  );
};
