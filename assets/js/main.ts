// ── Navbar scroll state ──────────────────────────────────────────────────────
const nav = document.getElementById('navbar');
if (nav) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      nav.classList.add('nav-scrolled');
    } else {
      nav.classList.remove('nav-scrolled');
    }
  }, { passive: true });
}

// ── Mobile menu toggle ───────────────────────────────────────────────────────
const menuBtn  = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
if (menuBtn && mobileMenu) {
  menuBtn.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('hidden');
    menuBtn.setAttribute('aria-expanded', String(!open));
  });
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!nav?.contains(e.target as Node)) {
      mobileMenu.classList.add('hidden');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

// ── Hero rotating word ───────────────────────────────────────────────────────
// Cycles the last yellow word of the H1 with a buttery fade + slide + width
// transition. Key design decisions:
//   - Width animates too (not min-width reserved), so "del Caribe" sits
//     flush against the current word regardless of its length. No dead
//     whitespace when a short word shows.
//   - Every next word's pixel width is pre-measured via a hidden clone so
//     we know the target width exactly (no layout thrash).
//   - Easing: cubic-bezier(.22, 1, .36, 1) — the "ease-out-quint" curve
//     used by Apple / Linear / Vercel. Feels more premium than linear or
//     ease.
//   - Phases are serialised so they don't fight: fade+slide out (300ms) →
//     swap text + set width → fade+slide in (420ms).
//   - Respects prefers-reduced-motion: no rotation, static word.
//   - Pauses on hover and when tab is backgrounded.
(() => {
  const rotator = document.querySelector<HTMLElement>('.hero-rotator');
  if (!rotator) return;

  const raw = rotator.dataset.words ?? '';
  const words = raw.split('|').map(w => w.trim()).filter(Boolean);
  if (words.length < 2) return;

  let idx = words.findIndex(w => w === rotator.textContent?.trim());
  if (idx < 0) idx = 0;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Measure each word's rendered width via Canvas — same technique as
  // chenglou/pretext. Canvas measureText is DOM-free, doesn't trigger
  // reflow, and returns the exact width the browser will paint given
  // an identical font shorthand. We read the rotator's computed style
  // once to build that shorthand, then add the horizontal padding
  // (which Canvas doesn't account for).
  const widthFor: Record<string, number> = {};
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const measureAll = () => {
    if (!ctx) {
      // Canvas unavailable — extremely rare. Fall back to a no-op:
      // we simply don't animate width, and the word will snap.
      return;
    }
    const cs = window.getComputedStyle(rotator);
    // Build the CSS font shorthand expected by Canvas:
    //   "style weight size/line-height family"
    ctx.font = [
      cs.fontStyle || 'normal',
      cs.fontWeight || 'normal',
      cs.fontSize || '16px',
      cs.fontFamily || 'sans-serif',
    ].join(' ');
    const padLeft = parseFloat(cs.paddingLeft) || 0;
    const padRight = parseFloat(cs.paddingRight) || 0;
    for (const w of words) {
      widthFor[w] = Math.ceil(ctx.measureText(w).width + padLeft + padRight);
    }
    // Lock the starting width to the initial word so the first transition
    // has something concrete to animate from.
    const initialWidth = widthFor[words[idx]];
    if (initialWidth) rotator.style.width = `${initialWidth}px`;
  };
  measureAll();

  let resizeTimer: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measureAll, 150);
  }, { passive: true });

  let intervalId: number | null = null;
  let paused = false;
  let inFlight = false;

  const advance = () => {
    if (paused || inFlight) return;
    inFlight = true;
    const nextIdx = (idx + 1) % words.length;
    const nextWord = words[nextIdx];
    const nextWidth = widthFor[nextWord];

    // Phase 1: exit — slide up + fade out. 300ms feels natural without
    // being slow.
    rotator.style.transform = 'translateY(-0.35em)';
    rotator.style.opacity = '0';

    window.setTimeout(() => {
      // Mid-point: swap text and kick the width animation. Because the
      // opacity is already 0, the text swap is invisible — the user only
      // perceives the smooth width change.
      rotator.textContent = nextWord;
      if (nextWidth) rotator.style.width = `${nextWidth}px`;
      rotator.style.transform = 'translateY(0.35em)';
      // Force a reflow so the enter transition has a starting state.
      void rotator.offsetWidth;
      // Phase 2: enter — slide up into place + fade in.
      rotator.style.transform = 'translateY(0)';
      rotator.style.opacity = '1';
      idx = nextIdx;
      window.setTimeout(() => { inFlight = false; }, 520);
    }, 300);
  };

  const start = () => {
    if (intervalId) return;
    intervalId = window.setInterval(advance, 3400);
  };
  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const wrap = rotator.closest<HTMLElement>('.hero-rotator-wrap') ?? rotator;
  wrap.addEventListener('mouseenter', () => { paused = true; });
  wrap.addEventListener('mouseleave', () => { paused = false; });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  const kickoff = () => window.setTimeout(start, 1500);
  if (document.readyState === 'complete') kickoff();
  else window.addEventListener('load', kickoff, { once: true });
})();
