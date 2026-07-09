import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import glossary from '@site/src/data/glossary.json';
import styles from './index.module.css';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="A fast, searchable reference for the UniVersus CCG rules.">
      <header className={clsx('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <Heading as="h1" className="hero__title">
            {siteConfig.title}
          </Heading>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <p className={styles.heroCount}>
            {glossary.length} rules terms — search, filter, and cross-reference.
          </p>
          <div className={styles.buttons}>
            <Link className="button button--secondary button--lg" to="/glossary">
              Browse the Glossary →
            </Link>
          </div>
        </div>
      </header>
    </Layout>
  );
}
