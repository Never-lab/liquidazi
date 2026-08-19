import { BRAND_DOMAIN, BRAND_NAME } from "../config/brand";
import type { LegalPageId } from "../ui/legalPath";

export type LegalSection = { heading: string; body: string };

export type LegalDoc = {
  title: string;
  documentTitle: string;
  sections: LegalSection[];
};

export const LEGAL_PAGES: Record<LegalPageId, LegalDoc> = {
  privacy: {
    title: "Privacy",
    documentTitle: `Privacy — ${BRAND_NAME}`,
    sections: [
      {
        heading: "Titolare",
        body: `${BRAND_NAME} (${BRAND_DOMAIN}) è un simulatore educativo. Questa pagina descrive i dati che trattiamo per far funzionare il sito, senza inventare una società o una P.IVA. Per richieste usa Feedback nel gioco.`,
      },
      {
        heading: "Account e cloud",
        body: "Se crei un account salviamo username, hash della password, trofei, salvataggi cloud (tre slot e preferenze) e, se invii una run, le statistiche in classifica (username visibile). Il feedback può includere username se sei loggato. La sessione scade dopo 2 ore di inattività e al massimo 7 giorni dal login. Sul server teniamo un log tecnico rotante delle richieste (metodo, percorso, stato HTTP, username se loggato): niente IP, query, body o token.",
      },
      {
        heading: "Sul tuo dispositivo",
        body: "In localStorage restano la cache di gioco, la sessione e se hai visto l’intro. L’ospite non ha account: i salvataggi restano solo sul dispositivo.",
      },
      {
        heading: "Misurazione e ads",
        body: "Plausible (se configurato) è senza cookie. Per Google AdSense usiamo la CMP certificata di Google (Privacy e messaggi in AdSense): utenti SEE, UK e Svizzera vedono il messaggio Google con Consenti, Nega il consenso e Gestisci le opzioni. Puoi riaprire le scelte con «Preferenze annunci» in fondo alla pagina. Non vendiamo i tuoi dati.",
      },
    ],
  },
  termini: {
    title: "Termini",
    documentTitle: `Termini — ${BRAND_NAME}`,
    sections: [
      {
        heading: "Cos’è Floatdesk",
        body: `${BRAND_NAME} è un modello educativo semplificato di SRL. Non è consulenza fiscale, software da commercialista né un servizio bancario. I numeri e le regole sono didattici.`,
      },
      {
        heading: "Uso",
        body: "Puoi giocare come ospite (solo sul dispositivo) o con account. Lo username può comparire in classifica. Il servizio è offerto così com’è: niente garanzia di uptime o di conservazione infinita dei salvataggi.",
      },
      {
        heading: "Regole minime",
        body: "Niente abuso delle API, truffe sulle classifiche o tentativi di accesso ad account altrui. Possiamo rifiutare o chiudere un account in caso di abuso.",
      },
    ],
  },
};
