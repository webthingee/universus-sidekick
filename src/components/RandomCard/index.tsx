import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';

import cards from '@site/src/data/cards.json';
import styles from './styles.module.css';

type Card = {name: string; set: string; num: string};

const imageUrl = (c: Card) =>
  `https://universus.cards/cards/${c.set}/${c.num}.jpg`;

export default function RandomCard(): ReactNode {
  // index stays null until mounted so the random pick happens client-side only
  // (avoids a server/client hydration mismatch and re-rolls on every visit).
  const [index, setIndex] = useState<number | null>(null);
  const [dead, setDead] = useState(false);
  const fails = useRef(0);

  const roll = useCallback(() => {
    setIndex((prev) => {
      if (cards.length <= 1) return 0;
      let next = Math.floor(Math.random() * cards.length);
      while (next === prev) next = Math.floor(Math.random() * cards.length);
      return next;
    });
  }, []);

  useEffect(() => {
    roll();
  }, [roll]);

  // A single broken image skips to another card; only a run of failures
  // (host down / hotlinking blocked) hides the panel entirely.
  const handleError = () => {
    fails.current += 1;
    if (fails.current >= 4) {
      setDead(true);
    } else {
      roll();
    }
  };

  if (index === null || dead) {
    return null;
  }

  const card = cards[index];
  return (
    <section className={styles.wrap} aria-label="Random UniVersus card">
      <a
        className={styles.card}
        href={`https://universus.cards/?s=${encodeURIComponent(card.name)}`}
        target="_blank"
        rel="noopener noreferrer"
        title={`Look up “${card.name}” on universus.cards`}>
        <img
          className={styles.img}
          src={imageUrl(card)}
          alt={card.name}
          loading="lazy"
          onLoad={() => {
            fails.current = 0;
          }}
          onError={handleError}
        />
      </a>
      <div className={styles.meta}>
        <button type="button" className={styles.shuffle} onClick={roll}>
          🎲 Shuffle
        </button>
        <p className={styles.credit}>
          Card images via <Link href="https://universus.cards">universus.cards</Link>
        </p>
      </div>
    </section>
  );
}
