// icons.jsx — split from components.jsx (layered shared UI)
import { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext, Fragment } from 'react';
import brandLogo from '../assets/brand_logo.png';
import './data.js';
import AnimatedContent from './reactbits/AnimatedContent.jsx';


// ---------- Icon (Lucide inline via <i data-lucide>) ----------
function Icon({ name, size = 16, style = {}, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.lucide && ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      window.lucide.createIcons({ attrs: { width: size, height: size, 'stroke-width': 2 }, nameAttr: 'data-lucide' });
    }
  }, [name, size]);
  return <span ref={ref} className={className} style={{ display: 'inline-flex', width: size, height: size, ...style }} />;
}

export { Icon };
