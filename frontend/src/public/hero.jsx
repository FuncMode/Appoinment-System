// Shared public-page hero pieces — split out of Landing.jsx so the other
// public pages can render their hero without pulling the whole Landing
// (and its WebGL/gsap visuals) into their bundle chunk.

// Aurora WebGL wash behind every public hero (Landing + subpages share the
// .public-hero pattern). Brand-blue color stops keep it on-palette; the
// wrapper's positioning/opacity lives in styles.css (.public-hero-aurora).
// aria-hidden + pointer-events:none keep it purely decorative.
import Aurora from '../shared/reactbits/Aurora.jsx';
import ShinyText from '../shared/reactbits/ShinyText.jsx';

function HeroAurora() {
  return (
    <div className="public-hero-aurora" aria-hidden="true">
      <Aurora colorStops={['#2563EB', '#7CC0FF', '#2563EB']} amplitude={0.9} blend={0.6} speed={0.7} />
    </div>
  );
}

// Shiny sweep for hero titles — one treatment across every public page so
// the headings read as a family (dark ink with a brand-blue glint). The
// `light` variant swaps to white ink for the Landing's photo hero, where
// dark text would be unreadable over the blue overlay. The shine uses a
// near-white blue (not #7CC0FF): mid-sweep, pale blue letters on the blue
// veil dropped to ~2.5:1 contrast — the paler shine keeps the shimmer
// readable at every point of the animation.
function HeroTitle({ children, light = false }) {
  return (
    <h1>
      <ShinyText
        text={children}
        speed={4}
        color={light ? '#FFFFFF' : '#111827'}
        shineColor={light ? '#CFE3FF' : '#2563EB'}
        spread={120}
      />
    </h1>
  );
}

export { HeroAurora, HeroTitle };
