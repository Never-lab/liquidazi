import { useEffect, useState } from "react";
import { AdSlot } from "../components/AdSlot";
import { CashSparkline, ChartsPanel } from "../components/Charts";
import { CoachBanner } from "../components/CoachBanner";
import { EventChoiceBanner } from "../components/EventChoiceBanner";
import { ProjectOfferBanner } from "../components/ProjectOfferBanner";
import { NotificationInbox } from "../components/NotificationInbox";
import { HoldingPanel } from "../components/HoldingPanel";
import { InvestmentsPanel } from "../components/InvestmentsPanel";
import { LoanPanel } from "../components/LoanPanel";
import { SchedulePanel } from "../components/SchedulePanel";
import { OpportunitiesPanel } from "../components/OpportunitiesPanel";
import { PayrollPanel } from "../components/PayrollPanel";
import { ReportPanel } from "../components/ReportPanel";
import { TaxPanel } from "../components/TaxPanel";
import { UpgradesPanel } from "../components/UpgradesPanel";
import { Button } from "../components/ui/Button";
import { Hint } from "../components/ui/Hint";
import { Sheet } from "../components/ui/Sheet";
import { formatCash } from "../components/formatCash";
import { DIFFICULTIES } from "../config/difficulty";
import { cityById } from "../config/market";
import { MILESTONE_DEFS, nextObjectives } from "../sim/milestones";
import { pressureEffectBlurb } from "../sim/pressures";
import {
  pressureBand,
  pressureBandLabel,
  RIVAL_PRESSURE_TOOLTIP,
} from "../sim/rival";
import { dueF24Total, openInvoiceSchedule, scheduleTotals, thisCloseRows } from "../sim/selectors";
import { LOSE_MONTHS_BELOW_ZERO } from "../sim/types";
import { useGameStore } from "../store/gameStore";
import { monthCloseHint } from "../ui/controlHints";
import { Icon, type IconName } from "../ui/icons";
import styles from "./GameHUD.module.css";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

type OpsTab = "fisco" | "credito" | "crescita" | "holding" | "altro";

const OPS_TABS: { id: OpsTab; label: string; icon: IconName }[] = [
  { id: "fisco", label: "Fisco", icon: "tax" },
  { id: "credito", label: "Credito", icon: "bank" },
  { id: "crescita", label: "Crescita", icon: "growth" },
  { id: "holding", label: "Holding", icon: "growth" },
  { id: "altro", label: "Bilancio", icon: "ledger" },
];

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
  const pendingProjectOffer = game.projectOffer;
  const monthBlocked = Boolean(pending || pendingProjectOffer);
  const closeHint = monthCloseHint({
    pendingEvent: Boolean(pending),
    pendingProjectOffer: Boolean(pendingProjectOffer),
  });
  const summary = game.lastCloseSummary;
  const nextGoals = nextObjectives(game, 3);
  const doneCount = (game.milestones ?? []).length;
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
    <div className={styles.deskWithAds}>
      <div className={styles.adRail}>
        <AdSlot placement="rail-left" />
      </div>
      <div className={styles.desk}>
      <header className={styles.sticky}>
        <div className={styles.stickyMeta}>
          <p className={styles.kicker}>
            {city.label} · {diffLabel}
            {seasonHint ? ` · ${seasonHint}` : ""}
          </p>
          <h2 className={styles.company}>{game.company.name}</h2>
          <p className={styles.monthLine} title="Mese di gioco, scorte magazzino (mesi di copertura) e reputazione (domanda / insoluti).">
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
              <p className={styles.chip} title={RIVAL_PRESSURE_TOOLTIP}>
                {(() => {
                  const band = pressureBand(game.rival.heat);
                  if (game.rival.contained) {
                    return `${game.rival.name} · Contenuto`;
                  }
                  if (band === "calma") {
                    return `${game.rival.name} · ${pressureBandLabel(band)}`;
                  }
                  return `${game.rival.name} · ${pressureBandLabel(band)} · ${Math.round(game.rival.heat)}`;
                })()}
              </p>
            )}
          </div>
        </div>
        <div className={styles.stickyActions}>
          <div key={cashPulse} className={styles.statPulse} title="Liquidità disponibile per spese e opportunità.">
            <span className={styles.statLabel}>
              <Icon name="wallet" size={12} className={styles.statIcon} />
              Cassa
            </span>
            <strong
              className={`${styles.cash} ${game.company.cash < 0 ? styles.cashBad : ""}`}
            >
              {formatCash(game.company.cash)}
            </strong>
            <CashSparkline history={game.history} bad={game.company.cash < 0} />
          </div>
          <div title="Debiti F24 aperti (scadenza didattica il 16 del mese successivo).">
            <span className={styles.statLabel}>
              <Icon name="receipt" size={12} className={styles.statIcon} />
              F24
            </span>
            <strong className={`${styles.cash} ${openTax > 0 ? styles.dueWarn : ""}`}>
              {formatCash(openTax)}
            </strong>
          </div>
          <NotificationInbox />
          <div className={styles.closeStack}>
            {closeHint ? (
              <Hint text={closeHint}>
                <Button
                  className={styles.closeBtn}
                  onClick={closeMonth}
                  disabled={monthBlocked}
                >
                  <Icon name="calendar" size={18} />
                  {pending
                    ? "Risolvi evento…"
                    : pendingProjectOffer
                      ? "Scegli progetto…"
                      : "Chiudi mese"}
                </Button>
              </Hint>
            ) : (
              <Button className={styles.closeBtn} onClick={closeMonth} disabled={monthBlocked}>
                <Icon name="calendar" size={18} />
                Chiudi mese
              </Button>
            )}
            {closeInvoiceTot.count > 0 && !monthBlocked && (
              <p className={styles.closeHint}>
                {closeInvoiceTot.net >= 0 ? "+" : ""}
                {formatCash(closeInvoiceTot.net)} · {closeInvoiceTot.count} scad.
              </p>
            )}
          </div>
        </div>
      </header>

      <div className={styles.goals}>
        {nextGoals.map((m) => (
          <span key={m.id} className={styles.goalTodo} title={m.blurb}>
            ○ {m.label}
          </span>
        ))}
        {nextGoals.length === 0 ? (
          <span className={styles.goalDone} title="Tutti gli obiettivi run">
            <Icon name="check" size={12} className={styles.goalCheck} />
            Run completata ({doneCount}/{MILESTONE_DEFS.length})
          </span>
        ) : (
          <button
            type="button"
            className={styles.goalLink}
            onClick={() => setScreen("objectives")}
          >
            Tutti ({doneCount}/{MILESTONE_DEFS.length})
          </button>
        )}
      </div>

      <div className={styles.alerts}>
        <CoachBanner />
        <EventChoiceBanner />
        <ProjectOfferBanner />

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

        {game.collectionCase &&
          (game.collectionCase.stage === "cartella" ||
            game.collectionCase.stage === "enforcement" ||
            game.collectionCase.stage === "terminal") && (
            <div className={styles.rescue} role="alert">
              <div className={styles.alertCopy}>
                <Icon name="tax" size={20} className={styles.alertIcon} />
                <p>
                  <strong>
                    {game.collectionCase.stage === "cartella"
                      ? "Cartella di pagamento"
                      : game.collectionCase.stage === "terminal"
                        ? "Rischio chiusura fiscale"
                        : "Pignoramento in corso"}
                    :
                  </strong>{" "}
                  {formatCash(game.collectionCase.principal)}
                  {game.collectionCase.stage === "terminal"
                    ? " — pochi mesi alla chiusura per insolvenza fiscale."
                    : game.collectionCase.stage === "cartella"
                      ? " — scegli se pagare, rateizzare o ignorare."
                      : " — prelievo forzato su cassa e tesoreria."}
                </p>
              </div>
            </div>
          )}

        {f24Due > 0 && (
          <div className={styles.f24Due} role="alert">
            <div className={styles.alertCopy}>
              <Icon name="receipt" size={20} className={styles.alertIcon} />
              <p>
                <strong>F24 da versare:</strong> {formatCash(f24Due)}. Scadenza ~giorno 16.
              </p>
            </div>
            <Button onClick={doPayF24}>
              <Icon name="receipt" size={18} />
              Paga F24
            </Button>
          </div>
        )}

        {offer && (
          <div className={styles.rescue} role="alert">
            <div className={styles.alertCopy}>
              <Icon name="bank" size={20} className={styles.alertIcon} />
              <p>
                <strong>Difficoltà di cassa.</strong> Prestito{" "}
                {formatCash(offer.principal)} / {offer.tenorMonths} mesi
                {offer.guarantee === "fondo_garanzia_pmi" ? " (Fondo PMI)" : ""}.
              </p>
            </div>
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
              <Icon name="ops" size={18} />
              Operazioni
            </Button>
            <button
              type="button"
              className={styles.auxToggle}
              onClick={() => setAuxOpen((v) => !v)}
            >
              <Icon name="chart" size={16} />
              {auxOpen ? "Nascondi grafici" : "Grafici"}
            </button>
            <div className={styles.toolbarRight}>
              {!coachOn && (
                <Button variant="ghost" onClick={enableCoach}>
                  <Icon name="book" size={18} />
                  Guide
                </Button>
              )}
              <Button variant="ghost" onClick={() => setScreen("menu")}>
                <Icon name="home" size={18} />
                Menu
              </Button>
            </div>
          </div>
        </div>

        {auxOpen && (
          <aside className={styles.deskSide}>
            <ChartsPanel history={game.history} />
          </aside>
        )}
      </div>

      <Sheet open={opsOpen} title="Operazioni" onClose={() => setOpsOpen(false)}>
        <div className={styles.opsTabs}>
          {OPS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={opsTab === tab.id ? styles.opsTabActive : styles.opsTab}
              onClick={() => setOpsTab(tab.id)}
            >
              <Icon name={tab.icon} size={16} />
              {tab.label}
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
          {opsTab === "holding" && <HoldingPanel />}
          {opsTab === "altro" && <ReportPanel />}
        </div>
      </Sheet>
      </div>
      <div className={styles.adRail}>
        <AdSlot placement="rail-right" />
      </div>
    </div>
  );
};
