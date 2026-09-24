// hooks.js — split from components.jsx (layered shared UI)
import { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, Fragment } from 'react';
import brandLogo from '../assets/brand_logo.png';
import './data.js';
import AnimatedContent from './reactbits/AnimatedContent.jsx';


// ---------- Router (hash-based) ----------
function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash.replace(/^#/, '') || '/');
  useEffect(() => {
    const onChange = () => {
      setRoute(window.location.hash.replace(/^#/, '') || '/');
      window.scrollTo(0, 0); // public pages are long — start from the top on navigation
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

function navigate(to) {
  window.location.hash = to;
  window.scrollTo(0, 0);
}

// ---------- Desktop-only gate (staff portals) ----------
// Live media-query hook — returns true when the viewport is wider than the
// app's 720px mobile breakpoint, updating on resize/rotation so the gate
// reacts live instead of only on load.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 721px)').matches);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 721px)');
    const onChange = (e) => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

export { useHashRoute, navigate, useIsDesktop };
