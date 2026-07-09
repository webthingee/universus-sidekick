import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Layout from '@theme/Layout';

import glossaryData from '@site/src/data/glossary.json';
import styles from './glossary.module.css';

type Entry = {
  slug: string;
  name: string;
  definition: string;
  examples: string[];
  notes: string[];
  bullets: string[];
  seeAlso: string[];
  isKeyword: boolean;
  isAbility: boolean;
  category: string;
};

const entries = glossaryData as Entry[];
const slugToName = new Map(entries.map((e) => [e.slug, e.name]));
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const FILTERS: {id: string; label: string; test: (e: Entry) => boolean}[] = [
  {id: 'all', label: 'All', test: () => true},
  {id: 'keywords', label: 'Keywords', test: (e) => e.isKeyword},
  {id: 'abilities', label: 'Abilities', test: (e) => e.isAbility},
  {id: 'a-e', label: 'A–E', test: (e) => e.category >= 'A' && e.category <= 'E'},
  {id: 'f-m', label: 'F–M', test: (e) => e.category >= 'F' && e.category <= 'M'},
  {id: 'n-s', label: 'N–S', test: (e) => e.category >= 'N' && e.category <= 'S'},
  {id: 't-z', label: 'T–Z', test: (e) => e.category >= 'T' && e.category <= 'Z'},
];

// Rank a term by how well its *name* matches the query: exact, prefix, contains, none.
function nameRank(e: Entry, q: string): number {
  const n = e.name.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(q)) return 2;
  return 3;
}

// Match a term against the query, consistently at every query length: a single
// word matches the start of any word in the term name; a multi-word query matches
// as a substring of the name. This keeps results predictable — typing more always
// narrows (e.g. s → st → stu → stun all converge on Stun). Full-text search across
// definitions is available in the navbar search box.
function matchesQuery(e: Entry, q: string): boolean {
  const name = e.name.toLowerCase();
  if (q.includes(' ')) return name.includes(q);
  return name.split(/[^a-z0-9]+/).some((w) => w.startsWith(q));
}

// Shared inner content for a term (used by both the card and the A–Z list row).
function EntryBody({entry, onRef}: {entry: Entry; onRef: (slug: string) => void}): ReactNode {
  return (
    <>
      {entry.definition
        .split('\n\n')
        .filter(Boolean)
        .map((para, i) => (
          <p key={i} className={styles.para}>
            {para}
          </p>
        ))}

      {entry.bullets.length > 0 && (
        <ul className={styles.bullets}>
          {entry.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      {entry.examples.map((ex, i) => (
        <div key={i} className={styles.example}>
          <span className={styles.calloutLabel}>Example</span>
          <span>{ex}</span>
        </div>
      ))}

      {entry.notes.map((n, i) => (
        <div key={i} className={styles.note}>
          <span className={styles.calloutLabel}>Note</span>
          <span>{n}</span>
        </div>
      ))}

      {entry.seeAlso.length > 0 && (
        <div className={styles.seeAlso}>
          <span className={styles.seeAlsoLabel}>See also</span>
          {entry.seeAlso.map((slug) => (
            <a
              key={slug}
              href={`#${slug}`}
              className={styles.seeAlsoLink}
              onClick={(e) => {
                e.preventDefault();
                onRef(slug);
              }}>
              {slugToName.get(slug) ?? slug}
            </a>
          ))}
        </div>
      )}
    </>
  );
}

function Card({
  entry,
  onRef,
  flash,
}: {
  entry: Entry;
  onRef: (slug: string) => void;
  flash: boolean;
}): ReactNode {
  return (
    <article id={entry.slug} className={`${styles.card} ${flash ? styles.flash : ''}`}>
      <header className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{entry.name}</h2>
        <div className={styles.badges}>
          {entry.isKeyword && <span className={styles.keywordBadge}>Keyword</span>}
          <span className={styles.letterBadge}>{entry.category}</span>
        </div>
      </header>
      <EntryBody entry={entry} onRef={onRef} />
    </article>
  );
}

// A compact, tap-to-expand row for the A–Z list.
function ListRow({
  entry,
  open,
  flash,
  onToggle,
  onRef,
  scrollMarginTop,
}: {
  entry: Entry;
  open: boolean;
  flash: boolean;
  onToggle: (slug: string) => void;
  onRef: (slug: string) => void;
  scrollMarginTop: number;
}): ReactNode {
  return (
    <div
      id={entry.slug}
      className={`${styles.row} ${flash ? styles.flash : ''}`}
      style={{scrollMarginTop}}>
      <button
        className={styles.rowHeader}
        onClick={() => onToggle(entry.slug)}
        aria-expanded={open}>
        <span className={styles.rowName}>{entry.name}</span>
        {entry.isKeyword && <span className={styles.kwDot} title="Keyword" />}
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>›</span>
      </button>
      {open && (
        <div className={styles.rowBody}>
          <EntryBody entry={entry} onRef={onRef} />
        </div>
      )}
    </div>
  );
}

// The draggable A–Z index rail (iOS Contacts style).
function AlphabetScrubber({
  present,
  onPick,
}: {
  present: Set<string>;
  onPick: (letter: string) => void;
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);

  const pick = useCallback(
    (clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = (clientY - rect.top) / rect.height;
      let idx = Math.floor(ratio * ALPHABET.length);
      idx = Math.max(0, Math.min(ALPHABET.length - 1, idx));
      let letter = ALPHABET[idx];
      if (!present.has(letter)) {
        // snap outward to the nearest letter that has entries
        for (let d = 1; d < ALPHABET.length; d++) {
          const hi = ALPHABET[idx + d];
          const lo = ALPHABET[idx - d];
          if (hi && present.has(hi)) {
            letter = hi;
            break;
          }
          if (lo && present.has(lo)) {
            letter = lo;
            break;
          }
        }
      }
      if (present.has(letter)) {
        setActive(letter);
        onPick(letter);
      }
    },
    [present, onPick]
  );

  return (
    <div
      ref={ref}
      className={styles.scrubber}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.buttons) pick(e.clientY);
      }}
      onPointerUp={() => setActive(null)}
      onPointerCancel={() => setActive(null)}
      onPointerLeave={() => setActive(null)}>
      {active && <span className={styles.scrubBubble}>{active}</span>}
      {ALPHABET.map((l) => (
        <span
          key={l}
          className={`${styles.scrubLetter} ${present.has(l) ? '' : styles.scrubLetterOff} ${
            active === l ? styles.scrubLetterActive : ''
          }`}>
          {l}
        </span>
      ))}
    </div>
  );
}

export default function GlossaryPage(): ReactNode {
  const [query, setQuery] = useState('');
  const [filterId, setFilterId] = useState('keywords');
  const [view, setView] = useState<'cards' | 'list'>('list');
  const [flashSlug, setFlashSlug] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [stickyTop, setStickyTop] = useState(0);
  const controlsRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const [chipNav, setChipNav] = useState({left: false, right: false});

  const activeFilter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0];

  // Track whether filter chips overflow off either edge, to show the fade/arrows.
  const updateChipNav = useCallback(() => {
    const el = chipsRef.current;
    if (!el) return;
    setChipNav({
      left: el.scrollLeft > 1,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
  }, []);

  useLayoutEffect(() => {
    updateChipNav();
    const el = chipsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateChipNav);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateChipNav]);

  const nudgeChips = useCallback((dir: number) => {
    chipsRef.current?.scrollBy({left: dir * 160, behavior: 'smooth'});
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? entries
          .filter((e) => matchesQuery(e, q))
          .sort((a, b) => nameRank(a, q) - nameRank(b, q) || a.name.localeCompare(b.name))
      : entries;
    return base.filter(activeFilter.test);
  }, [query, activeFilter]);

  // For the A–Z view: alphabetical, grouped into letter sections.
  const sections = useMemo(() => {
    const sorted = [...results].sort(
      (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    );
    const groups: {letter: string; items: Entry[]}[] = [];
    for (const e of sorted) {
      let g = groups[groups.length - 1];
      if (!g || g.letter !== e.category) {
        g = {letter: e.category, items: []};
        groups.push(g);
      }
      g.items.push(e);
    }
    return groups;
  }, [results]);

  const presentLetters = useMemo(
    () => new Set(sections.map((s) => s.letter)),
    [sections]
  );

  // Measure the sticky controls so section jumps land below them (not hidden).
  useLayoutEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const update = () => setStickyTop(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const navbarH = 60;
  const scrollMarginTop = navbarH + stickyTop + 12;

  const toggleExpanded = useCallback((slug: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const scrollToLetter = useCallback((letter: string) => {
    document.getElementById(`sec-${letter}`)?.scrollIntoView({block: 'start'});
  }, []);

  // Follow a cross-reference: clear filters, expand it (list view), flash it.
  const goToRef = useCallback((slug: string) => {
    setQuery('');
    setFilterId('all');
    setExpanded((prev) => new Set(prev).add(slug));
    setFlashSlug(slug);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${slug}`);
    }
  }, []);

  // When a flash target is set (cross-ref or deep-link), scroll to it after the
  // DOM has committed, then clear the highlight once the animation finishes.
  useEffect(() => {
    if (!flashSlug) return;
    const el = document.getElementById(flashSlug);
    el?.scrollIntoView({behavior: 'smooth', block: 'start'});
    const t = setTimeout(() => setFlashSlug(null), 1600);
    return () => clearTimeout(t);
  }, [flashSlug, view]);

  // Deep-link support: highlight (and expand) #slug on first load and hash change.
  useEffect(() => {
    const applyHash = () => {
      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (hash && slugToName.has(hash)) {
        setExpanded((prev) => new Set(prev).add(hash));
        setFlashSlug(hash);
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  return (
    <Layout
      title="Glossary"
      description="A searchable glossary of UniVersus CCG rules terms.">
      <main className={styles.page}>
        <div className={styles.intro}>
          <h1 className={styles.pageTitle}>Glossary</h1>
        </div>
        <div className={styles.controls} ref={controlsRef}>
          <div className={styles.controlsRow}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon} aria-hidden>
                🔍
              </span>
              <input
                type="search"
                className={styles.search}
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  className={styles.clearBtn}
                  onClick={() => setQuery('')}
                  aria-label="Clear search">
                  ✕
                </button>
              )}
            </div>

            <div className={styles.viewToggle} role="tablist" aria-label="View">
              <button
                className={`${styles.viewBtn} ${view === 'cards' ? styles.viewBtnActive : ''}`}
                onClick={() => setView('cards')}
                aria-pressed={view === 'cards'}>
                Cards
              </button>
              <button
                className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
                onClick={() => setView('list')}
                aria-pressed={view === 'list'}>
                A–Z
              </button>
            </div>
          </div>

          <div className={styles.chipsScroller}>
            <div
              ref={chipsRef}
              className={styles.chips}
              onScroll={updateChipNav}>
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  className={`${styles.chip} ${f.id === filterId ? styles.chipActive : ''}`}
                  onClick={() => setFilterId(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
            {chipNav.left && (
              <button
                className={`${styles.chipNav} ${styles.chipNavLeft}`}
                onClick={() => nudgeChips(-1)}
                aria-label="Scroll filters left">
                ‹
              </button>
            )}
            {chipNav.right && (
              <button
                className={`${styles.chipNav} ${styles.chipNavRight}`}
                onClick={() => nudgeChips(1)}
                aria-label="Scroll filters right">
                ›
              </button>
            )}
          </div>

        </div>

        {results.length === 0 ? (
          <p className={styles.empty}>No terms match “{query}”.</p>
        ) : view === 'cards' ? (
          <div className={styles.list}>
            {results.map((entry) => (
              <Card
                key={entry.slug}
                entry={entry}
                onRef={goToRef}
                flash={entry.slug === flashSlug}
              />
            ))}
          </div>
        ) : (
          <div className={styles.indexWrap}>
            <div className={styles.indexList}>
              {sections.map((section) => (
                <section key={section.letter} className={styles.section}>
                  <div
                    id={`sec-${section.letter}`}
                    className={styles.sectionHeader}
                    style={{scrollMarginTop}}>
                    {section.letter}
                  </div>
                  {section.items.map((entry) => (
                    <ListRow
                      key={entry.slug}
                      entry={entry}
                      open={expanded.has(entry.slug)}
                      flash={entry.slug === flashSlug}
                      onToggle={toggleExpanded}
                      onRef={goToRef}
                      scrollMarginTop={scrollMarginTop}
                    />
                  ))}
                </section>
              ))}
            </div>
            <AlphabetScrubber present={presentLetters} onPick={scrollToLetter} />
          </div>
        )}
      </main>
    </Layout>
  );
}
