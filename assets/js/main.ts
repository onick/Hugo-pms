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
