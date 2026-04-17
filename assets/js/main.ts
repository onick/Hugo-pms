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

// ── Hero rotating pitch (adjective + paired proof, synced) ────────────────────
//
// The headline adjective rotates AND a paired proof line underneath rotates
// in sync. Each adjective is married to a specific fact that earns it —
// turning the hero into a living micro-pitch instead of mere decoration.
//
// Animation choreography (per rotation):
//   t=0     : dot pulses outward (ring expands with rgba decay)
//   t=0     : adjective + proof fade/slide out (300ms)
//   t=300ms : text swapped in DOM, width locked to measured target
//   t=305ms : adjective + proof fade/slide in (520ms)
//   t=820ms : idle until next interval
//
// Measurement via Canvas.measureText (same technique as chenglou/pretext):
//   - DOM-free → no reflow on measure
//   - reads the element's computed font shorthand for pixel-perfect match
//   - re-measured on resize (font uses clamp()/vw)
//
// Width animates (not min-width reserved), so surrounding text ("del Caribe",
// etc.) sits flush against the word with zero dead whitespace.
(() => {
  const rotator = document.querySelector<HTMLElement>('.hero-rotator');
  if (!rotator) return;

  const words = (rotator.dataset.words ?? '').split('|').map(w => w.trim()).filter(Boolean);
  if (words.length < 2) return;

  // Optional: paired proof line. If absent, we still rotate the adjective.
  const proof = document.querySelector<HTMLElement>('.hero-proof');
  const dot = document.querySelector<HTMLElement>('.hero-proof-dot');
  const proofs = (rotator.dataset.proofs ?? '').split('|').map(p => p.trim());
  // Only treat proofs as valid if we have one per word.
  const hasProofPairs = !!proof && proofs.length === words.length;

  let idx = words.findIndex(w => w === rotator.textContent?.trim());
  if (idx < 0) idx = 0;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Canvas-based measurement — one canvas shared for both the adjective
  // and the proof line. For each, we read the computed font shorthand
  // and cache widths by string.
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const measureElement = (el: HTMLElement, strings: string[]): Record<string, number> => {
    const out: Record<string, number> = {};
    if (!ctx) return out;
    const cs = window.getComputedStyle(el);
    ctx.font = [
      cs.fontStyle || 'normal',
      cs.fontWeight || 'normal',
      cs.fontSize || '16px',
      cs.fontFamily || 'sans-serif',
    ].join(' ');
    const padLeft = parseFloat(cs.paddingLeft) || 0;
    const padRight = parseFloat(cs.paddingRight) || 0;
    for (const s of strings) {
      out[s] = Math.ceil(ctx.measureText(s).width + padLeft + padRight);
    }
    return out;
  };

  let adjWidths: Record<string, number> = {};
  let proofWidths: Record<string, number> = {};

  const remeasure = () => {
    adjWidths = measureElement(rotator, words);
    if (hasProofPairs) proofWidths = measureElement(proof!, proofs);
    const iw = adjWidths[words[idx]];
    if (iw) rotator.style.width = `${iw}px`;
    // We let the proof line wrap naturally — no width lock — because it
    // lives on its own row and word-level width animation there would
    // compete with the rest of the copy for visual attention. But we
    // still measure it so future features can use it.
  };
  remeasure();

  let resizeTimer: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(remeasure, 150);
  }, { passive: true });

  let intervalId: number | null = null;
  let paused = false;
  let inFlight = false;

  const pulseDot = () => {
    if (!dot) return;
    dot.style.boxShadow = '0 0 0 10px rgba(233,255,87,0)';
    window.setTimeout(() => {
      if (dot) dot.style.boxShadow = '0 0 0 0 rgba(233,255,87,0.6)';
    }, 640);
  };

  const advance = () => {
    if (paused || inFlight) return;
    inFlight = true;
    const nextIdx = (idx + 1) % words.length;

    // 1. Kick the dot pulse concurrent with exit — viewer's eye gets a
    //    subtle cue that something is changing.
    pulseDot();

    // 2. Exit: both strings fade up + out.
    rotator.style.transform = 'translateY(-0.35em)';
    rotator.style.opacity = '0';
    if (proof) {
      proof.style.transform = 'translateY(-0.35em)';
      proof.style.opacity = '0';
    }

    window.setTimeout(() => {
      // 3. Swap texts and lock the adjective width to its new target.
      rotator.textContent = words[nextIdx];
      const nw = adjWidths[words[nextIdx]];
      if (nw) rotator.style.width = `${nw}px`;
      if (proof && hasProofPairs) proof.textContent = proofs[nextIdx];

      // 4. Prep enter-from-below state without visible flicker.
      rotator.style.transform = 'translateY(0.35em)';
      if (proof) proof.style.transform = 'translateY(0.35em)';
      void rotator.offsetWidth; // force reflow so transitions start cleanly

      // 5. Enter: slide into place + fade in.
      rotator.style.transform = 'translateY(0)';
      rotator.style.opacity = '1';
      if (proof) {
        proof.style.transform = 'translateY(0)';
        proof.style.opacity = '1';
      }

      idx = nextIdx;
      window.setTimeout(() => { inFlight = false; }, 520);
    }, 300);
  };

  const start = () => {
    if (intervalId) return;
    intervalId = window.setInterval(advance, 3600);
  };
  const stop = () => {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
  };

  // Pause on hover of either the adjective or the proof — so the reader
  // can actually digest whatever caught their eye.
  const pauseOn = (el: Element | null) => {
    if (!el) return;
    el.addEventListener('mouseenter', () => { paused = true; });
    el.addEventListener('mouseleave', () => { paused = false; });
  };
  pauseOn(rotator.closest('.hero-rotator-wrap'));
  pauseOn(document.querySelector('.hero-proof-wrap'));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  const kickoff = () => window.setTimeout(start, 1500);
  if (document.readyState === 'complete') kickoff();
  else window.addEventListener('load', kickoff, { once: true });
})();
