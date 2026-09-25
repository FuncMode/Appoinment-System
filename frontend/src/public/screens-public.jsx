

// Barrel module — the individual screens live in their own files now.
// This file keeps the original module path so existing imports unchanged.
// Route screens are lazy-loaded from App.jsx; this barrel only carries the
// tiny shared pieces (hero visuals + static content) so importing it no
// longer drags every page (and gsap/ogl) into one bundle.

import { HeroAurora, HeroTitle } from './hero.jsx';
import { CARE_GUIDE } from './content.js';

export { HeroAurora, HeroTitle, CARE_GUIDE };

