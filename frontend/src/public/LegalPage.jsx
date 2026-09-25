// LegalPage — public (split from screens-public.jsx)

import { PublicFooter, PublicNav } from '../shared/components.jsx';

import Aurora from '../shared/reactbits/Aurora.jsx';
import ShinyText from '../shared/reactbits/ShinyText.jsx';
import CountUp from '../shared/reactbits/CountUp.jsx';
import SplitText from '../shared/reactbits/SplitText.jsx';
import AnimatedContent from '../shared/reactbits/AnimatedContent.jsx';
import Magnet from '../shared/reactbits/Magnet.jsx';
import ScrollVelocity from '../shared/reactbits/ScrollVelocity.jsx';
import StarBorder from '../shared/reactbits/StarBorder.jsx';
import GlareHover from '../shared/reactbits/GlareHover.jsx';  // hero preview card only — the one deliberate hover flourish
import Ribbons from '../shared/reactbits/Ribbons.jsx';

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
