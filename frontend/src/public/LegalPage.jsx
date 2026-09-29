// LegalPage — public (split from screens-public.jsx)

import { PublicFooter, PublicNav } from '../shared/components.jsx';

import { HeroAurora, HeroTitle } from './hero.jsx';

// ---------- Privacy / Terms pages ----------
function LegalPage({ title, sub, updated, sections }) {
  return (
    <main>
      <PublicNav activeLink="" />
      <section className="public-hero page-hero">
        <HeroAurora />
        <div className="public-hero-inner">
          <HeroTitle>{title}</HeroTitle>
          <p className="public-hero-sub">{sub}</p>
        </div>
      </section>
      <section className="public-section" style={{ paddingTop: 8 }}>
        <div className="public-section-inner" style={{ maxWidth: 760 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' }}>Last updated: {updated}</p>
          {sections.map(s => (
            <div key={s.h} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>{s.h}</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{s.p}</p>
            </div>
          ))}
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            Questions about this page? <a href="#/contact" style={{ color: 'var(--primary)', fontWeight: 500 }}>Contact us</a>.
          </p>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}

export { LegalPage };
