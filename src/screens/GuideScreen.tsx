import { useState } from "react";
import { guidePages } from "../content/guidePages";
import { useGameStore } from "../store/gameStore";
import styles from "./MenuScreen.module.css";

const renderBody = (body: string) =>
  body.split(/\n\n+/).map((block, i) => {
    const line = block.trim();
    if (line.startsWith("## ")) {
      const rest = line.slice(3);
      const parts = rest.split(/\n/);
      const heading = parts[0] ?? "";
      const after = parts.slice(1).join("\n").trim();
      return (
        <div key={i}>
          <h3 className={styles.tutStep}>{heading}</h3>
          {after ? <p className={styles.subtitle}>{after}</p> : null}
        </div>
      );
    }
    return (
      <p key={i} className={styles.subtitle}>
        {line.replace(/^#+\s*/, "")}
      </p>
    );
  });

export const GuideScreen = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const [idx, setIdx] = useState(0);
  const page = guidePages[idx] ?? guidePages[0];

  if (!page) {
    return (
      <div className={styles.menu}>
        <h2 className={styles.title}>Guida</h2>
        <p className={styles.subtitle}>Nessun capitolo. Esegui npm run wiki:sync-help.</p>
        <button type="button" className={styles.secondary} onClick={() => setScreen("menu")}>
          Torna al menu
        </button>
      </div>
    );
  }

  return (
    <div className={styles.menu}>
      <h2 className={styles.title}>Guida</h2>
      <p className={styles.subtitle}>
        Riferimento di gioco. Il Tutorial resta l&apos;onboarding breve.
      </p>

      <div className={styles.guideLayout}>
        <nav className={styles.guideNav} aria-label="Capitoli">
          {guidePages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={i === idx ? styles.guideNavOn : styles.guideNavBtn}
              onClick={() => setIdx(i)}
            >
              {p.title}
            </button>
          ))}
        </nav>
        <article className={styles.tutCard}>
          <h3 className={styles.tutStep}>{page.title}</h3>
          {renderBody(page.body)}
        </article>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => setScreen("menu")}>
          Torna al menu
        </button>
      </div>
    </div>
  );
};
