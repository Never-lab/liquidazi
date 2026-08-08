import { useState, type FormEvent } from "react";
import { ApiError, submitFeedback, type FeedbackKind } from "../api/client";
import { bugReportUrl, enhancementUrl } from "../config/repo";
import { useGameStore } from "../store/gameStore";
import { Icon } from "../ui/icons";
import styles from "./MenuScreen.module.css";

export const FeedbackScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const auth = useGameStore((s) => s.auth);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await submitFeedback(
        { kind, message: message.trim(), contact: contact.trim() || undefined },
        auth?.token,
      );
      setDone(true);
      setMessage("");
      setContact("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Invio non riuscito",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Segnala o migliora</h2>
      <p className={styles.subtitle}>
        Scrivi qui: non serve un account GitHub. Se sei loggato, alleghiamo il
        tuo username. Contatto opzionale se vuoi una risposta.
      </p>

      {done ? (
        <p className={styles.subtitle} role="status">
          Grazie — messaggio ricevuto. Puoi inviarnene un altro o tornare al menu.
        </p>
      ) : null}

      <form className={styles.feedbackForm} onSubmit={(e) => void onSubmit(e)}>
        <label className={styles.field}>
          Tipo
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as FeedbackKind)}
          >
            <option value="bug">Bug / problema</option>
            <option value="idea">Idea / miglioria</option>
          </select>
        </label>

        <label className={styles.field}>
          Messaggio
          <textarea
            name="message"
            rows={5}
            maxLength={2000}
            required
            minLength={10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Cosa è successo o cosa vorresti cambiare…"
          />
        </label>

        <label className={styles.field}>
          Contatto (opzionale)
          <input
            name="contact"
            type="text"
            maxLength={80}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="email o telegram, se vuoi"
            autoComplete="email"
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="submit"
          className={styles.primary}
          disabled={busy}
          title={busy ? "Invio in corso…" : "Invia il messaggio di feedback."}
        >
          {busy ? "Invio…" : "Invia"}
        </button>
      </form>

      <p className={styles.feedbackAlt}>
        Preferisci GitHub?{" "}
        <a href={bugReportUrl()} target="_blank" rel="noopener noreferrer">
          bug
        </a>
        {" · "}
        <a href={enhancementUrl()} target="_blank" rel="noopener noreferrer">
          idea
        </a>
      </p>

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => setScreen("menu")}>
          <span className={styles.btnInner}>
            <Icon name="chevron" size={18} className={styles.chevronBack} />
            Torna al menu
          </span>
        </button>
      </div>
    </div>
  );
};
