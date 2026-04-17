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
// Cycles the last word of the H1 every few seconds with a fade + slide
// transition. Respects prefers-reduced-motion and pauses when the user
// hovers the word (so they can read it). Kicks in only after LCP to
// keep Core Web Vitals untouched.
(() => {
  const rotator = document.querySelector<HTMLElement>('.hero-rotator');
  if (!rotator) return;

  const raw = rotator.dataset.words ?? '';
  const words = raw.split('|').map(w => w.trim()).filter(Boolean);
  if (words.length < 2) return;

  // Current index — start at the DOM's initial word so we don't flash
  // a different word on first paint.
  let idx = words.findIndex(w => w === rotator.textContent?.trim());
  if (idx < 0) idx = 0;

  const prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  // Lock the min-width to the widest word so the layout doesn't shift
  // when the word changes. We measure all words using a hidden clone.
  const measure = () => {
    const ghost = rotator.cloneNode(true) as HTMLElement;
    ghost.style.position = 'absolute';
    ghost.style.visibility = 'hidden';
    ghost.style.pointerEvents = 'none';
    ghost.style.whiteSpace = 'nowrap';
    ghost.style.transform = 'none';
    ghost.style.opacity = '1';
    rotator.parentElement?.appendChild(ghost);
    let maxWidth = 0;
    for (const w of words) {
      ghost.textContent = w;
      maxWidth = Math.max(maxWidth, ghost.getBoundingClientRect().width);
    }
    ghost.remove();
    if (maxWidth > 0) rotator.style.minWidth = `${Math.ceil(maxWidth)}px`;
  };
  measure();
  // Re-measure on resize (font-size uses clamp with vw units)
  let resizeTimer: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measure, 150);
  }, { passive: true });

  let intervalId: number | null = null;
  let paused = false;

  const advance = () => {
    if (paused) return;
    idx = (idx + 1) % words.length;
    // Phase 1: slide up + fade out the current word
    rotator.style.transform = 'translateY(-0.5em)';
    rotator.style.opacity = '0';
    window.setTimeout(() => {
      // Phase 2: swap text and prep slide-up-from-below
      rotator.textContent = words[idx];
      rotator.style.transform = 'translateY(0.5em)';
      // Force a reflow so the browser picks up the starting transform
      void rotator.offsetWidth;
      // Phase 3: settle into place
      rotator.style.transform = 'translateY(0)';
      rotator.style.opacity = '1';
    }, 280);
  };

  const start = () => {
    if (intervalId) return;
    intervalId = window.setInterval(advance, 2800);
  };
  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // Pause while the word is hovered so the user can read it.
  const wrap = rotator.closest<HTMLElement>('.hero-rotator-wrap') ?? rotator;
  wrap.addEventListener('mouseenter', () => { paused = true; });
  wrap.addEventListener('mouseleave', () => { paused = false; });

  // Pause when the tab is backgrounded (battery + CPU friendly).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  // Kick in 1.5s after load to clear the LCP window.
  const kickoff = () => window.setTimeout(start, 1500);
  if (document.readyState === 'complete') kickoff();
  else window.addEventListener('load', kickoff, { once: true });
})();
