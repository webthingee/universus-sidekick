import {useEffect, useState, type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import cards from '@site/src/data/cards.json';
import RandomCard from '@site/src/components/RandomCard';
import styles from './index.module.css';

// Homepage navigation tiles. Add more entries here as new sections are built.
const TILES = [
  {to: '/glossary', label: 'Glossary'},
  {to: '/docs/solo-ai', label: 'Guides'},
  {to: '/docs/how-to-play', label: 'How to Play'},
  {to: '/docs/anatomy-of-a-turn', label: 'Anatomy of a Turn'},
];

const imageUrl = (c: {set: string; num: string}) =>
  `https://universus.cards/cards/${c.set}/${c.num}.jpg`;

// Pick N distinct random cards, client-side only (avoids hydration mismatch).
function useRandomArt(count: number) {
  const [picks, setPicks] = useState<{set: string; num: string}[] | null>(null);
  useEffect(() => {
    const pool = [...cards];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setPicks(pool.slice(0, count));
  }, [count]);
  return picks;
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const art = useRandomArt(TILES.length);
  return (
    <Layout
      title={siteConfig.title}
      description="A fast, searchable reference for the UniVersus CCG rules.">
      <header className={clsx('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <Heading as="h1" className="hero__title">
            {siteConfig.title}
          </Heading>
          <nav className={styles.tiles} aria-label="Primary">
            {TILES.map((tile, i) => (
              <Link key={tile.to} className={styles.tile} to={tile.to}>
                {art?.[i] && (
                  <img
                    className={styles.tileArt}
                    src={imageUrl(art[i])}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <span className={styles.tileScrim} aria-hidden="true" />
                <span className={styles.tileLabel}>{tile.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main>
        <RandomCard />
      </main>
    </Layout>
  );
}
