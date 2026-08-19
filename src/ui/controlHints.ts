/** Italian hint/copy helpers for disabled or non-obvious controls. */

export const monthCloseHint = (opts: {
  pendingEvent: boolean;
  pendingProjectOffer?: boolean;
}): string | null => {
  if (opts.pendingEvent) return "Risolvi prima l'evento in corso, poi potrai chiudere il mese.";
  return null;
};

export const portfolioBuyHint = (opts: {
  noOps: boolean;
  belowMin: boolean;
  shortCash: boolean;
  minLabel: string;
}): string => {
  if (opts.noOps) return "Hai esaurito le operazioni di portafoglio per questo mese.";
  if (opts.belowMin) return `Ordine minimo ${opts.minLabel}.`;
  if (opts.shortCash) return "Cassa insufficiente per questo acquisto.";
  return "Acquista al prezzo di mercato corrente (1 operazione).";
};

export const portfolioSellHint = (opts: {
  noOps: boolean;
  invalidPct: boolean;
}): string => {
  if (opts.noOps) return "Hai esaurito le operazioni di portafoglio per questo mese.";
  if (opts.invalidPct) return "Indica una percentuale tra 1 e 100.";
  return "Vendi: l'eventuale plusvalenza confluisce nel bilancio (IRES).";
};

export const capexHint = (opts: {
  listed: boolean;
  cooldownMonths: number;
  shortCash: boolean;
  costLabel: string;
}): string => {
  if (opts.listed) return "CAPEX non disponibile mentre la partecipata è in vendita.";
  if (opts.cooldownMonths > 0) {
    return `Prossimo CAPEX tra ${opts.cooldownMonths} mesi — avanza il calendario.`;
  }
  if (opts.shortCash) return `Cassa insufficiente (servono ${opts.costLabel}).`;
  return `Investi ${opts.costLabel} → +16% EBITDA; poi 6 mesi di attesa.`;
};

export const f24PayHint = (opts: { dueNow: number; blocked: boolean }): string => {
  if (opts.blocked) {
    return "F24 bloccato: gestisci prima il debito in riscossione (cartella / pignoramento).";
  }
  if (opts.dueNow <= 0) return "Nessun importo F24 dovuto in questo momento.";
  return "Paga i debiti F24 scaduti per evitare mora e cartella.";
};

export const upgradeBuyHint = (opts: {
  atMax: boolean;
  shortCash: boolean;
  costLabel: string;
}): string => {
  if (opts.atMax) return "Livello massimo già raggiunto per questo upgrade.";
  if (opts.shortCash) return `Cassa insufficiente (servono ${opts.costLabel}).`;
  return `Acquista / potenzia per ${opts.costLabel}.`;
};

export const treasuryDepositHint = (opts: {
  belowMin: boolean;
  shortCash: boolean;
  minLabel: string;
}): string => {
  if (opts.belowMin) return `Deposito minimo ${opts.minLabel}.`;
  if (opts.shortCash) return "Cassa insufficiente per questo deposito.";
  return "Sposta liquidità in tesoreria (interessi, non comfort).";
};

export const treasuryWithdrawHint = (opts: {
  invalidAmount: boolean;
  overBalance: boolean;
}): string => {
  if (opts.invalidAmount) return "Indica un importo da prelevare maggiore di zero.";
  if (opts.overBalance) return "Non puoi prelevare più del saldo tesoreria.";
  return "Riporta fondi dalla tesoreria alla cassa.";
};

export const growthInvestHint = (opts: {
  belowMin: boolean;
  shortCash: boolean;
  atCap: boolean;
  minLabel: string;
}): string => {
  if (opts.atCap) return `Tetto crescita raggiunto (+${3 * 8} FL bonus).`;
  if (opts.belowMin) return `Investimento minimo ${opts.minLabel} per +8 FL.`;
  if (opts.shortCash) return "Cassa insufficiente per questo investimento crescita.";
  return "Reinvesti in forza lavoro (+8 FL permanenti).";
};

export const projectOfferAcceptHint = (canAfford: boolean): string | null =>
  canAfford ? null : "Cassa insufficiente per accettare questo progetto.";

export const loanOfferHint = (disabledReason: string | null): string | null => disabledReason;
