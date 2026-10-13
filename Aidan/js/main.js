/* =========================================================
   PRIVATE SOCCER HAWAII ACADEMY — homepage behaviour
   Smooth scroll (Lenis) + GSAP/ScrollTrigger storytelling +
   "The Ball": one 3D soccer ball travelling the whole page —
   resting in the hero, riding the first-goal move, the format switch,
   circling the specialized-training ring and visiting every section.
   New interactive sections: hero intro, player selector, goal board,
   guided registration and data-driven camp cards.
   ========================================================= */
import { createBall } from './ball.js';

const html = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const on = (el, ev, fn) => { el.addEventListener(ev, fn); return () => el.removeEventListener(ev, fn); };

/* Always start a fresh load at the hero so the intro plays (unless a #section link was opened) */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!location.hash) window.scrollTo(0, 0);

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const mqMobile = matchMedia('(max-width: 900px)');

/* Training requests go to the endpoint in the form's data-endpoint (e.g. Formspree) when deployed.
   No endpoint → the request opens as a pre-filled email to the academy inbox.
   On a local preview the form runs in demo mode so test requests never reach a real inbox. */
const IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
const INBOX = 'privatesoccerhawaii@gmail.com';
const FORM_ENDPOINT = IS_LOCAL ? '' : ($('#booking-form').dataset.endpoint || '').trim();

/* Today's date in Hawaii (YYYY-MM-DD) — camps open/close on island time */
const todayHI = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Honolulu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/* ---------- Camps & clinics: cards rendered from the #camp-data JSON (runs even if GSAP never loads) ---------- */
(function renderCamps() {
  const list = $('.camps__list'), src = $('#camp-data');
  if (!list || !src) return;
  let camps = [];
  try { camps = JSON.parse(src.textContent); } catch (err) { console.warn('[camps] Could not read #camp-data', err); }
  const today = todayHI();
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parts = s => s.split('-').map(Number);
  const dayNum = s => { const [y, m, d] = parts(s); return Date.UTC(y, m - 1, d) / 864e5; };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const btn = (cls, href, label, attrs = {}) => {
    const a = el('a', `btn ${cls}`);
    a.href = href;
    Object.entries(attrs).forEach(([k, v]) => a.setAttribute(k, v));
    const lab = el('span', 'btn__label');
    lab.append(el('span', null, label));
    const dup = el('span', null, label); dup.setAttribute('aria-hidden', 'true'); lab.append(dup);
    const arrow = el('span', 'btn__arrow'); arrow.setAttribute('aria-hidden', 'true');
    a.append(lab, arrow);
    return a;
  };

  const live = camps.filter(c => c.end >= today).sort((a, b) => a.start.localeCompare(b.start));
  live.forEach(c => {
    const [y1, m1, d1] = parts(c.start), [, m2, d2] = parts(c.end || c.start);
    const li = el('li', 'camp');
    const date = el('div', 'camp__date');
    date.append(
      el('span', 'camp__month', m1 === m2 ? MONTHS[m1 - 1] : `${MONTHS[m1 - 1]} – ${MONTHS[m2 - 1]}`),
      el('span', 'camp__days', d1 === d2 && m1 === m2 ? `${d1}` : `${d1}–${d2}`),
      el('span', 'camp__year', String(y1)),
    );
    const isLive = c.start <= today;
    const status = el('span', `camp__status${isLive ? ' is-live' : ''}`);
    status.append(el('i'));
    const total = dayNum(c.end || c.start) - dayNum(c.start) + 1, into = dayNum(today) - dayNum(c.start) + 1;
    const until = dayNum(c.start) - dayNum(today);
    status.append(isLive ? `Happening now · Day ${into} of ${total}` : until <= 14 ? `Starts in ${until} day${until === 1 ? '' : 's'}` : 'Upcoming');
    date.append(status);

    const body = el('div', 'camp__body');
    if (c.tag) body.append(el('p', 'camp__tag', c.tag));
    body.append(el('h3', 'camp__name', c.name));
    if (c.description) body.append(el('p', 'camp__desc', c.description));
    const meta = el('dl', 'camp__meta');
    const row = (k, v) => { if (!v) return; const d = el('div'); d.append(el('dt', null, k), el('dd', null, v)); meta.append(d); };
    row('Time', c.time);
    row('Location', [c.location, c.address].filter(Boolean).join(' · '));
    row('Ages / skill', c.ages);
    row('Price', Array.isArray(c.price) ? c.price.join(' · ') : c.price);
    body.append(meta);

    const side = el('div', 'camp__side');
    if (c.image) {
      const fig = el('figure', 'camp__img ph');
      const img = el('img'); img.src = c.image; img.alt = c.imageAlt || ''; img.loading = 'lazy'; img.decoding = 'async';
      fig.append(img); side.append(fig);
    }
    const ctas = el('div', 'camp__ctas');
    if (c.registerUrl) ctas.append(btn('btn--primary', c.registerUrl, c.registerLabel || 'Register', { target: '_blank', rel: 'noopener', 'data-cursor': 'go' }));
    ctas.append(btn('btn--ghost', '#register', 'Ask about this camp', { 'data-train': 'Camp / Clinic', 'data-msg': `I have a question about the ${c.name}.` }));
    side.append(ctas);

    li.append(date, body, side);
    list.append(li);
  });

  /* Always end with a pointer to the next camp — no invented details, just the way to hear first */
  const next = el('li', 'camp camp--next');
  const nb = el('div', 'camp__body');
  nb.append(el('p', 'camp__tag', live.length ? 'More camps & clinics' : 'Next camp'), el('h3', 'camp__name', live.length ? 'New dates are announced here first.' : 'New dates coming soon.'));
  next.append(nb, btn('btn--primary', '#register', 'Tell me about the next camp', { 'data-train': 'Camp / Clinic', 'data-msg': "Please let me know when the next camp or clinic is announced.", 'data-cursor': 'go' }));
  list.append(next);
})();

/* ---------- Wait for CDN libraries (fail open: reveal content if they never arrive) ---------- */
function waitFor(test, timeout) {
  return new Promise(resolve => {
    const t0 = performance.now();
    const tick = () => (test() || performance.now() - t0 > timeout) ? resolve(test()) : setTimeout(tick, 25);
    tick();
  });
}
const libsOk = await waitFor(() => window.gsap && window.ScrollTrigger, 6000);
if (!libsOk) { html.classList.remove('js'); throw new Error('GSAP failed to load; static fallback shown.'); }
await waitFor(() => window.Lenis, 2500);

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
gsap.defaults({ overwrite: 'auto' });

/* ---------- Smooth scroll ---------- */
let lenis = null;
if (!reduceMotion && window.Lenis) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
function scrollToHash(hash) {
  const el = $(hash);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.5, easing: t => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}
/* In-page links. data-mode picks 1-on-1/Group on the format switch; data-train, data-level
   and data-msg pre-fill the registration wizard. */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  e.preventDefault();
  if (a.hasAttribute('data-placeholder') || a.getAttribute('href').length < 2) return;
  if (a.dataset.mode) coaching.setMode(a.dataset.mode);
  if (a.dataset.level) wizard.prefill(levels.prefillOf(a.dataset.level));
  if (a.dataset.train || a.dataset.msg) wizard.prefill({ training: a.dataset.train, message: a.dataset.msg });
  closeMenu();
  scrollToHash(a.getAttribute('href'));
  history.replaceState(null, '', a.getAttribute('href'));
});

/* ---------- Nav: theme + active link (start-edge based, robust with pinned sections) ---------- */
const themed = $$('main > section[data-theme]');
function setNav(el) { html.dataset.nav = el.dataset.theme; }
function syncNavTheme() {
  let cur = themed[0];
  themed.forEach(el => { if (el.getBoundingClientRect().top <= 40) cur = el; });
  setNav(cur);
}
themed.forEach((el, i) => ScrollTrigger.create({
  trigger: el, start: 'top 40px', end: 'top 40px',
  onEnter: () => setNav(el), onLeaveBack: () => setNav(themed[Math.max(0, i - 1)]),
}));

/* ---------- Header: section scoreboard, hopping ball, pitch rail, hide-on-scroll ---------- */
const nav = (() => {
  const header = $('.nav'), linksWrap = $('.nav__links'), navLinks = $$('.nav__links a');
  const ballEl = $('.nav__ball'), subIn = $('.nav__sub-in'), mark = $('.nav__mark-spin');
  const rail = $('.nav__rail'), railFill = $('.nav__rail-fill'), railBall = $('.nav__rail-ball');
  const isGroup = () => $('.modes').dataset.mode === 'group';
  /* section → [label, index of nav link it lights up (-1 = none)]; either may depend on the format switch.
     Links: 0 Home · 1 Programs · 2 Players · 3 Coach Robert · 4 Camps · 5 Testimonials · 6 FAQ · 7 Contact */
  const SECTIONS = [
    ['#hero', 'Soccer academy &middot; Honolulu', 0],
    ['#intro', '<b>02</b>Personalized coaching', -1],
    ['#programs', () => (isGroup() ? '<b>03</b>Small-group training' : '<b>03</b>Private training'), 1],
    ['#specialties', '<b>03</b>Specialized training', 1],
    ['#players', '<b>04</b>Every player', 2],
    ['#goals', '<b>05</b>Player goals', 2],
    ['#coach', '<b>06</b>Meet Coach Robert', 3],
    ['#camps', '<b>07</b>Camps &amp; clinics', 4],
    ['#testimonials', '<b>08</b>Testimonials', 5],
    ['#register', '<b>09</b>Get started', 7],
    ['#faq', '<b>10</b>FAQ', 6],
    ['#finale', 'Dream big, play hard', -1],
  ].map(([sel, label, link]) => ({ el: $(sel), label, link })).filter(s => s.el);
  const val = v => (typeof v === 'function' ? v() : v);
  const linkOf = i => (SECTIONS[i] ? val(SECTIONS[i].link) : -1);

  let current = -1, shownLabel = '', hoverLink = null, ballShown = false;
  const hop = reduceMotion ? 0 : 1;

  function placeBall(linkIdx, instant) {
    if (linkIdx < 0 || !navLinks[linkIdx] || !linksWrap.offsetParent) {
      if (ballShown) gsap.to(ballEl, { opacity: 0, scale: 0, duration: 0.3 });
      ballShown = false;
      return;
    }
    const w = linksWrap.getBoundingClientRect(), r = navLinks[linkIdx].getBoundingClientRect();
    const x = r.left - w.left + r.width / 2, y = r.bottom - w.top - 5;
    if (!ballShown || instant || !hop) {
      gsap.set(ballEl, { x, y });
      gsap.to(ballEl, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(3)' });
      ballShown = true;
      return;
    }
    /* A little lob: horizontal glide, vertical up-and-bounce */
    gsap.to(ballEl, { x, duration: 0.55, ease: 'power1.inOut' });
    gsap.timeline()
      .to(ballEl, { y: y - 16, duration: 0.27, ease: 'power2.out' })
      .to(ballEl, { y, duration: 0.4, ease: 'bounce.out' });
  }

  function setSection(i, force) {
    if (i === current && !force) return;
    const dir = i >= current ? 1 : -1;
    const first = current === -1;
    current = i;
    const s = SECTIONS[i], link = linkOf(i), label = val(s.label);
    navLinks.forEach((a, k) => {
      a.classList.toggle('is-active', k === link);
      if (k === link) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    if (hoverLink === null) placeBall(link);
    if (label === shownLabel) return;
    shownLabel = label;
    /* First paint: the wordmark intro reveals the supporting line itself */
    if (first || reduceMotion) { subIn.innerHTML = label; return; }
    gsap.timeline()
      .to(subIn, { yPercent: -110 * dir, duration: 0.3, ease: 'power2.in' })
      .add(() => { subIn.innerHTML = label; })
      .fromTo(subIn, { yPercent: 110 * dir }, { yPercent: 0, duration: 0.5, ease: 'power3.out' });
  }

  SECTIONS.forEach((s, i) => ScrollTrigger.create({
    trigger: s.el, start: 'top 50%', end: 'bottom 50%',
    onToggle: self => { if (self.isActive) setSection(i); },
  }));
  setSection(0);

  navLinks.forEach((a, k) => {
    a.addEventListener('pointerenter', () => { hoverLink = k; placeBall(k); });
  });
  linksWrap.addEventListener('pointerleave', () => { hoverLink = null; placeBall(linkOf(current)); });

  /* Pitch rail: a tick at each section's start */
  function buildTicks() {
    $$('.nav__tick', rail).forEach(t => t.remove());
    const max = Math.max(1, ScrollTrigger.maxScroll(window));
    SECTIONS.slice(1).forEach(s => {
      const t = document.createElement('i');
      t.className = 'nav__tick';
      t.dataset.at = (s.el.getBoundingClientRect().top + window.scrollY) / max;
      t.style.left = `${Math.min(100, t.dataset.at * 100)}%`;
      rail.appendChild(t);
    });
    placeBall(linkOf(current), true);
  }
  ScrollTrigger.addEventListener('refresh', buildTicks);

  /* Scroll-linked bits: rail progress, spinning ring mark, solid/hidden states */
  let lastY = window.scrollY;
  function onScroll() {
    const y = window.scrollY, max = Math.max(1, ScrollTrigger.maxScroll(window)), p = clamp(y / max, 0, 1);
    railFill.style.transform = `scaleX(${p})`;
    railBall.style.left = `${p * 100}%`;
    $$('.nav__tick', rail).forEach(t => t.classList.toggle('is-passed', p >= +t.dataset.at - 0.001));
    if (!reduceMotion) mark.style.transform = `rotate(${y * 0.18}deg)`;
    header.classList.toggle('is-solid', y > 24);
    const dy = y - lastY;
    if (!html.classList.contains('menu-open') && !header.matches(':focus-within')) {
      if (dy > 6 && y > innerHeight * 0.9) header.classList.add('is-hidden');
      else if (dy < -6 || y < innerHeight * 0.5) header.classList.remove('is-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  /* Revealing the header when the pointer reaches the top edge */
  window.addEventListener('pointermove', e => { if (e.clientY < 24) header.classList.remove('is-hidden'); }, { passive: true });
  window.addEventListener('resize', () => placeBall(linkOf(current), true));
  onScroll();
  return { onScroll, refresh: () => setSection(current, true) };
})();

/* ---------- Mobile menu ---------- */
const menuToggle = $('.nav__toggle'), menu = $('.menu');
function openMenu() { html.classList.add('menu-open'); menuToggle.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-hidden', 'false'); lenis?.stop(); }
function closeMenu() { if (!html.classList.contains('menu-open')) return; html.classList.remove('menu-open'); menuToggle.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true'); lenis?.start(); }
menuToggle.addEventListener('click', () => html.classList.contains('menu-open') ? closeMenu() : openMenu());
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

/* ---------- Custom cursor (desktop only) ---------- */
const cursorPos = { x: innerWidth / 2, y: innerHeight / 2, inside: false };
const CURSOR_LABELS = { play: 'Play', view: 'View', go: 'Go' };
if (finePointer && !mqMobile.matches && !reduceMotion) {
  html.classList.add('has-cursor', 'cursor-hidden');
  const cursorEl = $('.cursor'), labelEl = $('.cursor__label');
  const cur = { x: cursorPos.x, y: cursorPos.y };
  window.addEventListener('pointermove', e => {
    cursorPos.x = e.clientX; cursorPos.y = e.clientY; cursorPos.inside = true;
    html.classList.remove('cursor-hidden');
  }, { passive: true });
  document.addEventListener('mouseleave', () => { cursorPos.inside = false; html.classList.add('cursor-hidden'); });
  gsap.ticker.add(() => {
    cur.x = lerp(cur.x, cursorPos.x, 0.4); cur.y = lerp(cur.y, cursorPos.y, 0.4);
    cursorEl.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
  });
  const setCursorState = target => {
    const t = target && target.closest ? target.closest('[data-cursor], a, button, [role="tab"], label, summary') : null;
    let s = t ? (t.dataset.cursor || 'link') : '';
    if (s === 'view' && t.getAttribute('aria-selected') === 'true') s = 'link';
    if (html.dataset.cursor !== s) { html.dataset.cursor = s; labelEl.textContent = CURSOR_LABELS[s] || ''; }
  };
  document.addEventListener('pointerover', e => setCursorState(e.target));
  document.addEventListener('click', e => setCursorState(e.target));
  /* The element under a resting pointer changes while the page scrolls underneath it */
  window.addEventListener('scroll', () => { if (cursorPos.inside) setCursorState(document.elementFromPoint(cursorPos.x, cursorPos.y)); }, { passive: true });
} else {
  cursorPos.inside = false;
}

/* ---------- Magnetic buttons + photo tilt ---------- */
function magnetize(scope = document) {
  if (!finePointer || reduceMotion) return;
  $$('[data-magnetic]', scope).forEach(btn => {
    if (btn.dataset.magnetized) return;
    btn.dataset.magnetized = '1';
    const xTo = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'power3.out' });
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.32);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.36);
    });
    btn.addEventListener('pointerleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' });
    });
  });
}
magnetize();
if (finePointer && !reduceMotion) {
  $$('[data-tilt]').forEach(fig => {
    gsap.set(fig, { transformPerspective: 1000 });
    const rx = gsap.quickTo(fig, 'rotationX', { duration: 0.8, ease: 'power3.out' });
    const ry = gsap.quickTo(fig, 'rotationY', { duration: 0.8, ease: 'power3.out' });
    fig.addEventListener('pointermove', e => {
      const r = fig.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      rx(-ny * 5); ry(nx * 7);
    });
    fig.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/* ---------- Programs: the 1-ON-1 / GROUP switch ---------- */
const coaching = (() => {
  const sec = $('.modes'), tabs = $$('.switch__opt'), panels = $$('.mode');
  function setMode(mode, focus = false) {
    if (!mode || sec.dataset.mode === mode) return;
    sec.dataset.mode = mode;
    sec.dataset.theme = mode === 'private' ? 'dark' : 'light';
    tabs.forEach(t => {
      const sel = t.dataset.mode === mode;
      t.setAttribute('aria-selected', String(sel));
      t.tabIndex = sel ? 0 : -1;
      if (sel && focus) t.focus();
    });
    panels.forEach(p => {
      const sel = p.dataset.mode === mode;
      p.classList.toggle('is-active', sel);
      p.toggleAttribute('inert', !sel);
      p.setAttribute('aria-hidden', String(!sel));
    });
    syncNavTheme();
    nav.refresh();
  }
  tabs.forEach((t, k) => {
    t.addEventListener('click', () => setMode(t.dataset.mode));
    t.addEventListener('keydown', e => {
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      setMode(tabs[(k + dir + tabs.length) % tabs.length].dataset.mode, true);
    });
  });
  return { setMode };
})();

/* Shared tab keyboard pattern (arrows move + select) */
function tabKeys(tabs, select) {
  tabs.forEach((t, k) => t.addEventListener('keydown', e => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = tabs[(k + dir + tabs.length) % tabs.length];
    select(next.dataset.level, true);
  }));
}

/* =========================================================
   04 TRAINING FOR EVERY PLAYER — selector.
   Picking a player swaps copy, focus areas, photo, chip and CTA,
   and the journey marker runs that player's range across the
   FIRST KICK → FOUNDATION → DEVELOPMENT → COMPETITION pitch.
   ========================================================= */
const levels = (() => {
  const sec = $('.levels'), tabs = $$('.lt'), panels = $$('.lp'), shots = $$('.lm');
  const chipIn = $('.levels__chip-in'), trail = $('.lj__trail'), marker = $('.lj__marker'), markerParts = $$('.lj__marker > *');
  const zones = $$('.lj__zone'), labels = $$('.lj__labels text'), legend = $$('.lj-legend li');
  const L = trail.getTotalLength();
  const LEVELS = {
    young:       { range: [0, 0.26],    scale: 0.8,  chip: 'Keiki · ages 4–8',            prefill: { group: 'Young player (keiki)' } },
    youth:       { range: [0.2, 0.56],  scale: 1,    chip: 'Ages 9–17',                   prefill: { group: 'Youth player' } },
    competitive: { range: [0.5, 1],     scale: 1.18, chip: 'Club · school · tryouts',     prefill: { group: 'Competitive athlete', experience: 'Competitive' } },
    adults:      { range: [0.06, 0.72], scale: 1,    chip: 'Adults · beginners to experienced', prefill: { group: 'Adult', experience: 'Adult' } },
  };
  const state = { a: 0, b: 0 };
  let cur = null;

  function drawRange() {
    const len = Math.max(0.001, (state.b - state.a) * L);
    trail.style.strokeDasharray = `${len} ${L * 2}`;
    trail.style.strokeDashoffset = `${-state.a * L}`;
    const p = trail.getPointAtLength(state.b * L);
    marker.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
  }
  function markZones([a, b]) {
    const xa = trail.getPointAtLength(a * L).x, xb = trail.getPointAtLength(b * L).x;
    const lit = z => { const x0 = 20 + z * 290, x1 = x0 + 290; return xb >= x0 && xa <= x1; };
    zones.forEach(r => r.classList.toggle('is-on', lit(+r.dataset.z)));
    labels.forEach(t => t.classList.toggle('is-on', lit(+t.dataset.z)));
    legend.forEach(t => t.classList.toggle('is-on', lit(+t.dataset.z)));
  }

  function set(key, focus = false, instant = false) {
    const info = LEVELS[key];
    if (!info || key === cur) return;
    const prevKey = cur;
    cur = key;
    sec.dataset.level = key;
    tabs.forEach(t => {
      const sel = t.dataset.level === key;
      t.setAttribute('aria-selected', String(sel));
      t.tabIndex = sel ? 0 : -1;
      if (sel && focus) t.focus();
    });
    panels.forEach(p => {
      const sel = p.dataset.level === key;
      p.classList.toggle('is-active', sel);
      p.toggleAttribute('inert', !sel);
      p.setAttribute('aria-hidden', String(!sel));
    });
    /* Photo: the outgoing shot stays underneath until the new one has wiped in */
    const prev = shots.find(s => s.dataset.level === prevKey), next = shots.find(s => s.dataset.level === key);
    shots.forEach(s => s.classList.remove('is-leaving'));
    if (prev && prev !== next) { prev.classList.remove('is-active'); prev.classList.add('is-leaving'); setTimeout(() => prev.classList.remove('is-leaving'), 1100); }
    next.classList.add('is-active');
    markZones(info.range);

    const swapChip = () => { chipIn.textContent = info.chip; };
    if (instant || reduceMotion) {
      swapChip();
      state.a = info.range[0]; state.b = info.range[1];
      drawRange();
      gsap.set(markerParts, { scale: info.scale, svgOrigin: '0 0' });
      return;
    }
    gsap.timeline()
      .to(chipIn, { yPercent: -130, duration: 0.22, ease: 'power2.in' })
      .add(swapChip)
      .fromTo(chipIn, { yPercent: 130 }, { yPercent: 0, duration: 0.45, ease: 'power3.out' });
    /* The trail shrinks to the new start, then the marker runs to the new end */
    gsap.timeline({ onUpdate: drawRange })
      .to(state, { a: info.range[0], b: Math.max(info.range[0] + 0.01, Math.min(state.b, info.range[0] + 0.04)), duration: 0.45, ease: 'power2.inOut' })
      .to(state, { b: info.range[1], duration: 1.1, ease: 'power3.inOut' });
    gsap.to(markerParts, { scale: info.scale, svgOrigin: '0 0', duration: 0.8, ease: 'back.out(2.4)', delay: 0.4 });
  }

  tabs.forEach(t => t.addEventListener('click', () => set(t.dataset.level)));
  tabKeys(tabs, set);
  set('young', false, true);
  return { set, prefillOf: key => LEVELS[key]?.prefill || {} };
})();

/* =========================================================
   05 WHAT DO YOU WANT TO IMPROVE? — goal board.
   Simple front-end matching: each goal maps to the training
   areas that cover it. Selected goals are wired to those areas,
   a ball runs the newest wire, and the CTA carries the picks
   into the registration wizard.
   ========================================================= */
const goals = (() => {
  const board = $('.goals__board'), tiles = $$('.gt'), progs = $$('.gp'), svg = $('.goals__wires');
  const wireSet = $('.goals__wire-set'), runner = $('.goals__runner'), recs = $('.goals__recs');
  const summary = $('.goals__summary'), cta = $('.goals__cta'), clearBtn = $('.goals__clear');
  const ctaSpans = $$('.btn__label > span', cta);
  const MATCH = {
    'weak-foot': ['technical'], dribbling: ['technical'], strength: ['strength'], positioning: ['tactical'],
    goalkeeper: ['goalkeeper'], shooting: ['technical'], speed: ['speed'], leadership: ['group', 'camps'],
  };
  /* Goal → the matching option in the wizard's "Training goals" step */
  const TO_WIZARD = {
    'weak-foot': 'Weak Foot', dribbling: 'Dribbling', strength: 'Strength + Conditioning', positioning: 'Positioning + Strategy',
    goalkeeper: 'Goalkeeping', shooting: 'Shooting', speed: 'Speed + Agility', leadership: 'Confidence',
  };
  const nameOf = k => $('.gt__name', tiles.find(t => t.dataset.goal === k)).textContent;
  const progName = k => $('.gp__name', progs.find(p => p.dataset.program === k)).textContent;
  const selected = [];

  const wiresOn = () => getComputedStyle(svg).display !== 'none';
  function wirePath(goal, prog) {
    const s = svg.getBoundingClientRect();
    const t = tiles.find(x => x.dataset.goal === goal).getBoundingClientRect();
    const p = progs.find(x => x.dataset.program === prog).getBoundingClientRect();
    const r = recs.getBoundingClientRect();
    const x1 = t.right - s.left, y1 = t.top + t.height / 2 - s.top;
    const x2 = r.left - s.left, y2 = p.top + p.height / 2 - s.top;
    const dx = (x2 - x1) * 0.55;
    return { d: `M${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + dx).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`, x2, y2 };
  }
  function drawWires(fresh) {
    wireSet.textContent = '';
    if (!wiresOn()) return null;
    let newest = null;
    selected.forEach(g => MATCH[g].forEach(p => {
      const { d, x2, y2 } = wirePath(g, p);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'goals__wire'); path.setAttribute('d', d);
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('class', 'goals__wire-end'); dot.setAttribute('cx', x2); dot.setAttribute('cy', y2); dot.setAttribute('r', 4.5);
      wireSet.append(path, dot);
      if (g === fresh) {
        newest = newest || { path, prog: p };
        if (!reduceMotion) {
          const len = path.getTotalLength();
          gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' });
          gsap.fromTo(dot, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.4, delay: 0.6, ease: 'back.out(3)' });
        }
      }
    }));
    return newest;
  }
  function hit(prog) {
    const el = progs.find(p => p.dataset.program === prog);
    el.classList.remove('is-hit'); void el.offsetWidth; el.classList.add('is-hit');
  }
  function runBall(newest) {
    if (!newest || reduceMotion) { if (newest) hit(newest.prog); return; }
    const { path, prog } = newest, len = path.getTotalLength(), st = { u: 0 };
    gsap.killTweensOf(st);
    gsap.set(runner, { opacity: 1 });
    gsap.to(st, {
      u: 1, duration: 0.75, ease: 'power2.inOut',
      onUpdate: () => {
        const p = path.getPointAtLength(st.u * len);
        runner.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(st.u * 540).toFixed(0)})`);
      },
      onComplete: () => { hit(prog); gsap.to(runner, { opacity: 0, duration: 0.25, delay: 0.1 }); },
    });
  }

  function render(fresh) {
    tiles.forEach(t => t.setAttribute('aria-pressed', String(selected.includes(t.dataset.goal))));
    const hits = {};
    selected.forEach(g => MATCH[g].forEach(p => { (hits[p] = hits[p] || []).push(nameOf(g)); }));
    progs.forEach(p => {
      const list = hits[p.dataset.program];
      p.classList.toggle('is-on', !!list);
      $('.gp__why', p).textContent = list ? `For: ${list.join(' · ')}` : '';
    });
    tiles.forEach(t => { $('.gt__to', t).textContent = selected.includes(t.dataset.goal) ? `→ ${MATCH[t.dataset.goal].map(progName).join(' + ')}` : ''; });
    const areas = Object.keys(hits);
    summary.innerHTML = selected.length
      ? `<b>${selected.length} goal${selected.length > 1 ? 's' : ''}</b> → ${areas.length} training area${areas.length > 1 ? 's' : ''}. Coach Robert will shape the sessions around them.`
      : 'Pick a goal to see where it leads.';
    const label = selected.length ? `Find the Right Program · ${selected.length}` : 'Find the Right Program';
    ctaSpans.forEach(s => { s.textContent = label; });
    clearBtn.hidden = !selected.length;
    const newest = drawWires(fresh);
    if (fresh) {
      const tile = tiles.find(t => t.dataset.goal === fresh);
      tile.classList.remove('is-pop'); void tile.offsetWidth; tile.classList.add('is-pop');
      if (newest) runBall(newest); else MATCH[fresh].forEach(hit);
    }
  }

  tiles.forEach(t => t.addEventListener('click', () => {
    const g = t.dataset.goal, i = selected.indexOf(g);
    if (i >= 0) { selected.splice(i, 1); render(); } else { selected.push(g); render(g); }
  }));
  clearBtn.addEventListener('click', () => { selected.length = 0; render(); tiles[0].focus(); });
  cta.addEventListener('click', () => {
    const progsOn = progs.filter(p => p.classList.contains('is-on')).map(p => p.dataset.program);
    const training = progsOn.length === 1 ? { technical: 'Technical Skills', goalkeeper: 'Goalkeeper' }[progsOn[0]] : undefined;
    wizard.prefill({ goals: selected.map(g => TO_WIZARD[g]), training });
  });
  window.addEventListener('resize', () => drawWires());
  ScrollTrigger.addEventListener('refresh', () => drawWires());
  render();
  return { board };
})();

/* =========================================================
   09 REGISTRATION — guided 6-step training request.
   Progress rail + ball, Next/Back, per-step validation, multi-select
   goals, summary, and submission through the existing form channel.
   ========================================================= */
const wizard = (() => {
  const form = $('#booking-form'), steps = $$('.wiz__step', form), stepBtns = $$('.wiz__steps button', form);
  const viewport = $('.wiz__viewport', form), fill = $('.wiz__fill', form), ball = $('.wiz__ball', form);
  const count = $('.wiz__count', form), prefillNote = $('.wiz__prefill', form), err = $('.wiz__error', form);
  const back = $('.wiz__back', form), next = $('.wiz__next', form), submit = $('.wiz__submit', form);
  const summary = $('.wiz__summary', form), done = $('.wiz__done', form), other = $('.wiz__other', form);
  const F = form.elements, N = steps.length;
  let cur = 0, reached = 0, flip = null, grow = null;

  /* Sensible date limits: birth dates in the past, start dates from today */
  const today = todayHI();
  F.dob.max = today;
  F.start_date.min = today;

  const checked = name => $$(`input[name="${name}"]:checked`, form).map(i => i.value);
  const radio = name => $(`input[name="${name}"]:checked`, form)?.value || '';
  const optsOf = name => $(`input[name="${name}"]`, form).closest('.opts');
  const mark = (el, bad) => el.classList.toggle('is-invalid', bad);

  /* Each step returns an error message (or '') and marks what's missing */
  const CHECK = [
    () => {
      const a = !F.player_name.value.trim(), b = !F.dob.value;
      mark(F.player_name, a); mark(F.dob, b);
      return a || b ? "Add the player's name and date of birth to continue." : '';
    },
    () => { const bad = !radio('experience'); mark(optsOf('experience'), bad); return bad ? 'Choose the closest experience level.' : ''; },
    () => {
      const g = checked('goals'), needOther = g.includes('Other') && !F.goals_other.value.trim();
      mark(optsOf('goals'), !g.length); mark(F.goals_other, needOther);
      return !g.length ? 'Pick at least one goal.' : needOther ? 'Tell us a little about the "Other" goal.' : '';
    },
    () => { const bad = !radio('training'); mark(optsOf('training'), bad); return bad ? "Choose a training type — 'Not sure' is fine." : ''; },
    () => {
      const d = !checked('days').length, t = !checked('times').length, s = !F.start_date.value;
      mark(optsOf('days'), d); mark(optsOf('times'), t); mark(F.start_date, s);
      return d || t || s ? 'Choose preferred days, times and an earliest start date.' : '';
    },
    () => {
      const e = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(F.email.value.trim()), p = F.phone.value.replace(/\D/g, '').length < 7;
      mark(F.email, e); mark(F.phone, p);
      return e || p ? 'Add a valid email and phone number so we can reply.' : '';
    },
  ];
  const fail = msg => {
    err.textContent = msg;
    if (reduceMotion) return;
    form.classList.remove('is-shake'); void form.offsetWidth; form.classList.add('is-shake');
  };

  function data() {
    return {
      player_name: F.player_name.value.trim(),
      parent_name: F.parent_name.value.trim(),
      dob: F.dob.value,
      player_group: F.player_group.value,
      experience: radio('experience'),
      goals: checked('goals').join(', '),
      goals_other: F.goals_other.value.trim(),
      training: radio('training'),
      days: checked('days').join(', '),
      times: checked('times').join(', '),
      start_date: F.start_date.value,
      area: F.area.value,
      neighborhood: F.neighborhood.value.trim(),
      email: F.email.value.trim(),
      phone: F.phone.value.trim(),
      message: F.message.value.trim(),
    };
  }
  const LABELS = {
    player_name: 'Player', parent_name: 'Parent / guardian', dob: 'Date of birth', player_group: 'Player group', experience: 'Experience',
    goals: 'Goals', goals_other: 'Other goal', training: 'Training type', days: 'Days', times: 'Times', start_date: 'Earliest start',
    area: 'Location', neighborhood: 'Area', email: 'Email', phone: 'Phone', message: 'Message',
  };
  function buildSummary() {
    const d = data();
    summary.textContent = '';
    const dl = document.createElement('dl');
    dl.className = 'wiz__summary';
    const title = document.createElement('p');
    title.className = 'wiz__summary-title';
    title.textContent = 'Your request';
    summary.append(title);
    ['player_name', 'experience', 'goals', 'training', 'days', 'times', 'start_date', 'area'].forEach(k => {
      if (!d[k]) return;
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = LABELS[k]; dd.textContent = d[k];
      summary.append(dt, dd);
    });
  }

  function paint() {
    stepBtns.forEach((b, i) => {
      if (i === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.classList.toggle('is-done', i < reached || (i < cur));
      b.disabled = i > reached;
    });
    const p = cur / (N - 1);
    if (reduceMotion) { fill.style.transform = `scaleX(${p})`; ball.style.left = `${p * 100}%`; }
    else {
      gsap.to(fill, { scaleX: p, duration: 0.7, ease: 'power3.inOut' });
      gsap.to(ball, { left: `${p * 100}%`, rotation: cur * 220, duration: 0.8, ease: 'power3.inOut' });
    }
    count.textContent = `Step ${cur + 1} of ${N}`;
    back.hidden = cur === 0;
    next.hidden = cur === N - 1;
    submit.hidden = cur !== N - 1;
    if (cur === N - 1) buildSummary();
  }

  function go(i, { validate = true, focus = true } = {}) {
    if (flip) { flip.progress(1); flip = null; }   // a fast second click finishes the running transition
    if (grow) { grow.progress(1); grow = null; }
    if (i === cur || i < 0 || i >= N) return;
    if (validate && i > cur) {
      for (let k = cur; k < i; k++) {
        const msg = CHECK[k]();
        if (msg) { if (k !== cur) go(k, { validate: false }); fail(msg); return; }
      }
    }
    err.textContent = '';
    const dir = i > cur ? 1 : -1, from = steps[cur], to = steps[i];
    cur = i; reached = Math.max(reached, i);
    paint();
    const swap = () => { from.hidden = true; from.classList.remove('is-active'); to.hidden = false; to.classList.add('is-active'); };
    const land = () => {
      if (!focus) return;
      const first = $('input:not([type="hidden"]), select, textarea', to);
      (first || to).focus({ preventScroll: true });
      const top = form.getBoundingClientRect().top;
      if (top < 0) scrollToHash('#booking-form');
    };
    if (reduceMotion) { swap(); land(); return; }
    const h0 = viewport.offsetHeight;
    flip = gsap.timeline({ onComplete: () => { flip = null; land(); } })
      .to(from, { x: -36 * dir, opacity: 0, duration: 0.22, ease: 'power2.in' })
      .add(() => {
        swap();
        const h1 = viewport.offsetHeight;
        grow = gsap.fromTo(viewport, { height: h0 }, { height: h1, duration: 0.45, ease: 'power3.inOut', clearProps: 'height', onComplete: () => { grow = null; } });
      })
      .fromTo(to, { x: 36 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out', clearProps: 'transform,opacity' });
  }

  next.addEventListener('click', () => go(cur + 1));
  back.addEventListener('click', () => go(cur - 1));
  stepBtns.forEach((b, i) => b.addEventListener('click', () => go(i)));
  /* Enter moves forward instead of submitting early */
  form.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
    if (cur < N - 1) { e.preventDefault(); go(cur + 1); }
  });
  /* Clear invalid marks as soon as the visitor fixes them */
  form.addEventListener('input', e => {
    const t = e.target;
    t.classList.remove('is-invalid');
    t.closest('.opts')?.classList.remove('is-invalid');
    if (t.name === 'goals') other.hidden = !checked('goals').includes('Other');
    if (cur === N - 1) buildSummary();
  });

  /* Pre-fill from the CTAs around the page — never jumps steps, never overwrites a typed message */
  function prefill(o = {}) {
    if (form.classList.contains('is-sent')) return;
    const notes = [];
    const setRadio = (name, value) => { const r = $(`input[name="${name}"][value="${CSS.escape(value)}"]`, form); if (r) { r.checked = true; r.closest('.opts')?.classList.remove('is-invalid'); return true; } return false; };
    if (o.group) { F.player_group.value = o.group; notes.push(o.group); }
    if (o.experience && setRadio('experience', o.experience)) notes.push(o.experience);
    if (o.goals && o.goals.length) {
      $$('input[name="goals"]', form).forEach(i => { i.checked = o.goals.includes(i.value); });
      other.hidden = !o.goals.includes('Other');
      notes.push(`${o.goals.length} goal${o.goals.length > 1 ? 's' : ''}`);
    }
    if (o.training && setRadio('training', o.training)) notes.push(o.training);
    if (o.message && !F.message.value.trim()) F.message.value = o.message;
    if (!notes.length) return;
    prefillNote.hidden = false;
    prefillNote.textContent = `Pre-filled: ${notes.join(' · ')}`;
    if (!reduceMotion) gsap.fromTo(prefillNote, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.4)', delay: 0.6 });
    if (cur === N - 1) buildSummary();
  }

  /* Submit: validate every step, then send through the configured channel */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    for (let k = 0; k < N; k++) {
      const msg = CHECK[k]();
      if (msg) { if (k !== cur) go(k, { validate: false }); fail(msg); return; }
    }
    const d = data();
    const first = (d.parent_name || d.player_name).split(/\s+/)[0] || 'friend';
    const doneText = $('.wiz__done-text', form);
    if (F._gotcha.value) { finish(first); return; }   // honeypot: quietly "succeed" for bots
    err.textContent = 'Sending…';
    submit.disabled = true;
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ _subject: F._subject.value, ...d }),
        });
        if (!res.ok) throw new Error(res.statusText);
      } else if (IS_LOCAL) {
        console.info('[form] Demo mode — set data-endpoint on #booking-form to deliver requests. Payload:', d);
        doneText.textContent = "This preview isn't connected to an inbox yet — on the live site this request goes straight to Private Soccer Hawaii.";
      } else {
        /* No endpoint configured: hand the request to the visitor's email app, addressed to the academy */
        const body = Object.entries(d).filter(([, v]) => v).map(([k, v]) => `${LABELS[k]}: ${v}`).join('\n');
        location.href = `mailto:${INBOX}?subject=${encodeURIComponent(F._subject.value)}&body=${encodeURIComponent(body)}`;
        doneText.textContent = "Your email app should open with the request ready to send — press send and we'll get back to you as soon as possible.";
      }
      finish(first);
    } catch (error) {
      submit.disabled = false;
      err.textContent = `Something went wrong sending that. Please try again, or call/text 808-500-3222.`;
    }
  });
  function finish(first) {
    err.textContent = '';
    $('.wiz__done-name', form).textContent = first;
    form.classList.add('is-sent');
    done.hidden = false;
    done.focus({ preventScroll: true });
    scrollToHash('#booking-form');
    ScrollTrigger.refresh();
  }

  paint();
  return { prefill };
})();

/* =========================================================
   THE BALL — 3D ball controller
   Anchors: { at(): scrollY when reached, pos(): viewport {x,y},
              r(): radius px, arc: lob height (fraction of vh),
              alpha, path (SVG path to ride), onPath(u) }
   ========================================================= */
const rally = (() => {
  const canvas = $('.ball'), shadow = $('.ball-shadow');
  let ball = null, anchors = [], intro = null, prev = null, pathLen = new Map();
  const cur = { x: 0, y: 0, r: 40 };
  let hiddenByUI = false;

  function init() {
    if (reduceMotion) { canvas.remove(); shadow.remove(); return false; }
    try {
      ball = createBall({ canvas, quality: mqMobile.matches ? 'low' : 'high' });
    } catch (err) {
      console.warn('[ball] WebGL unavailable — ball disabled.', err);
      canvas.remove(); shadow.remove();
      return false;
    }
    html.classList.add('has-ball');
    ball.setVisible(false);
    window.addEventListener('resize', () => ball.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden) prev = null; });
    gsap.ticker.add(tick);
    return true;
  }

  function pathPoint(path, u) {
    if (!pathLen.has(path)) pathLen.set(path, path.getTotalLength());
    const len = pathLen.get(path);
    const pt = path.getPointAtLength(clamp(u, 0, 1) * len);
    const m = path.getScreenCTM();
    return { x: m.a * pt.x + m.c * pt.y + m.e, y: m.b * pt.x + m.d * pt.y + m.f };
  }

  function sample(s) {
    const n = anchors.length;
    if (!n) return null;
    const ats = anchors.map(a => a.at());
    let i = 0;
    while (i < n - 1 && s >= ats[i + 1]) i++;
    const a = anchors[i], b = anchors[i + 1];
    const resting = p => ({ x: p.x, y: p.y, r: a.r(), alpha: a.alpha ?? 1, groundY: p.y, height: 0, squash: 1 });
    if (!b || s <= ats[i]) return resting(a.pos());

    const span = Math.max(1, ats[i + 1] - ats[i]);
    const u = clamp((s - ats[i]) / span, 0, 1);

    if (a.path) {
      const p = pathPoint(a.path, u);
      a.onPath?.(u);
      return { x: p.x, y: p.y, r: a.r(), alpha: 1, groundY: p.y + 2, height: 0, squash: 1, noShadow: !!a.noShadow };
    }

    const p0 = a.pos(), p1 = b.pos();
    const ue = easeInOut(u);
    const gx = lerp(p0.x, p1.x, ue), gy = lerp(p0.y, p1.y, ue);
    const arcH = (a.arc ?? 0.16) * innerHeight;
    const h = Math.sin(Math.PI * u);
    const edge = Math.min(u, 1 - u);
    const squash = edge < 0.07 && arcH ? 1 - 0.16 * (1 - edge / 0.07) : 1;
    return {
      x: gx, y: gy - arcH * h,
      r: lerp(a.r(), b.r(), ue),
      alpha: lerp(a.alpha ?? 1, b.alpha ?? 1, ue),
      groundY: gy, height: h * (arcH ? 1 : 0), squash,
    };
  }

  function tick(_, dtMs) {
    if (!ball) return;
    const dt = Math.min(0.05, dtMs / 1000);
    const st = sample(window.scrollY);
    if (!st || hiddenByUI) { ball.setVisible(false); shadow.style.opacity = 0; prev = null; return; }

    let tx = st.x, ty = st.y;
    if (intro) { tx += intro.x; ty += intro.y; }
    const k = 1 - Math.exp(-dt * (intro ? 40 : 12));
    if (!prev) { cur.x = tx; cur.y = ty; cur.r = st.r; }
    else { cur.x += (tx - cur.x) * k; cur.y += (ty - cur.y) * k; cur.r += (st.r - cur.r) * k; }
    const dx = prev ? cur.x - prev.x : 0, dy = prev ? cur.y - prev.y : 0;
    prev = { x: cur.x, y: cur.y };

    ball.roll(dx, dy);
    ball.setScreen(cur.x, cur.y, cur.r, st.squash);
    ball.setAlpha(st.alpha);
    ball.setVisible(st.alpha > 0.02);

    if (cursorPos.inside) {
      const nx = clamp((cursorPos.x - cur.x) / innerWidth * 2, -1, 1);
      const ny = clamp((cursorPos.y - cur.y) / innerHeight * 2, -1, 1);
      ball.lookToward(nx, -ny);
    }

    const lift = clamp(st.height, 0, 1);
    const shadowY = st.groundY + cur.r * 1.05;
    shadow.style.width = `${cur.r * 2.6}px`;
    shadow.style.height = `${cur.r * 0.5}px`;
    shadow.style.opacity = st.noShadow ? 0 : st.alpha * (0.85 - lift * 0.55);
    shadow.style.transform = `translate(${cur.x}px, ${shadowY}px) translate(-50%, -50%) scale(${1 - lift * 0.35})`;

    ball.update(dt);
  }

  return {
    init,
    pathPoint,
    setAnchors(list) { anchors = list; prev = null; },
    setHidden(v) { hiddenByUI = v; },
    /** Hero entrance: drop in from the top-right with a real bounce. */
    enter() {
      if (!ball) return;
      intro = { x: innerWidth * 0.45, y: -innerHeight * 0.7 };
      gsap.to(intro, { x: 0, duration: 1.6, ease: 'power2.out' });
      gsap.to(intro, { y: 0, duration: 1.6, ease: 'bounce.out', onComplete: () => { intro = null; } });
    },
    get active() { return !!ball; },
    get anchors() { return anchors; },
    sample,
  };
})();
const hasBall = rally.init();

/* ---------- Shared helpers for anchors ---------- */
const rectOf = el => el.getBoundingClientRect();
const center = el => { const r = rectOf(el); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const docTop = el => rectOf(el).top + window.scrollY;
const vh = () => innerHeight;
const baseR = () => (mqMobile.matches ? 24 : clamp(innerWidth * 0.03, 26, 50));
const dur = st => Math.max(1, st.end - st.start);
const A = Object.fromEntries($$('[data-ball]').map(el => [el.dataset.ball, el]));

/* ---------- Wordmark: HAWAII reveals → pitch line draws → supporting line →
   ball runs the line → the line wraps into a ring → settles ---------- */
function logoIntro() {
  return gsap.timeline({ defaults: { ease: 'power3.out' } })
    .to('.nav__mark-ring', { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut' }, 0)
    .fromTo('.nav__mark-mono', { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2.4)' }, 0.25)
    .to('.wm__top', { opacity: 0.75, duration: 0.5 }, 0.1)
    .to('.wm__big > span', { y: 0, duration: 0.85, ease: 'power4.out' }, 0.12)
    .fromTo('.wm__track', { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.6, ease: 'power2.inOut' }, 0.55)
    .to('.nav__sub-in', { y: 0, duration: 0.6 }, 0.8)
    .fromTo('.wm__dot', { left: '0%', opacity: 0 }, { opacity: 1, duration: 0.15 }, 0.95)
    .to('.wm__dot', { left: '100%', duration: 0.75, ease: 'power2.inOut' }, 0.98)
    .to('.wm__track', { scaleX: 0, transformOrigin: '100% 50%', duration: 0.3, ease: 'power2.in' }, 1.7)
    .fromTo('.wm__pulse', { scale: 0, opacity: 1 }, { scale: 1, duration: 0.42, ease: 'back.out(2)' }, 1.78)
    .to('.wm__pulse', { scale: 1.7, opacity: 0, duration: 0.55, ease: 'power2.out' }, 2.2)
    .to('.wm__track', { scaleX: 1, transformOrigin: '0% 50%', duration: 0.55, ease: 'power3.out' }, 2.24);
}

/* ---------- Wordmark loop: every few seconds the ball dribbles along the line
   (three touches), the letters of HAWAII ripple as it passes, the line wraps into
   a ring, the ring's ball orbits the mark and the crest pops. Hovering replays it. ---------- */
let logoTl = null;
function logoLoop() {
  const name = $('.wm__big > span');
  if (!name.querySelector('.wm__ch')) {
    const text = name.textContent;
    name.textContent = '';
    [...text].forEach(c => {
      const sp = document.createElement('span');
      sp.className = c === ' ' ? 'wm__ch wm__ch--sp' : 'wm__ch';
      sp.textContent = c === ' ' ? ' ' : c;
      name.appendChild(sp);
    });
  }
  const chars = $$('.wm__ch:not(.wm__ch--sp)');
  const hot = (el, v) => () => el.classList.toggle('is-hot', v);
  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 3.6, defaults: { overwrite: false } });
  tl.to('.wm__dot', { opacity: 0, scale: 0.3, duration: 0.2, ease: 'power2.in' }, 0)
    .set('.wm__dot', { left: '0%' }, 0.21)
    .to('.wm__dot', { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(3)' }, 0.22)
    .to('.wm__dot', { left: '100%', duration: 1.35, ease: 'none' }, 0.45);
  for (let k = 0; k < 3; k++) {
    tl.to('.wm__dot', { y: -9, duration: 0.225, ease: 'power2.out' }, 0.45 + k * 0.45)
      .to('.wm__dot', { y: 0, duration: 0.225, ease: 'power2.in' }, 0.675 + k * 0.45);
  }
  chars.forEach((c, i) => {
    const t = 0.5 + i * (1.2 / chars.length);
    tl.to(c, { y: -5, duration: 0.18, ease: 'power2.out' }, t)
      .to(c, { y: 0, duration: 0.45, ease: 'bounce.out' }, t + 0.18)
      .call(hot(c, true), null, t)
      .call(hot(c, false), null, t + 0.75);
  });
  tl.to('.wm__track', { scaleX: 0, transformOrigin: '100% 50%', duration: 0.3, ease: 'power2.in' }, 1.8)
    .fromTo('.wm__pulse', { scale: 0, opacity: 1 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' }, 1.85)
    .to('.wm__pulse', { scale: 1.8, opacity: 0, duration: 0.6, ease: 'power2.out' }, 2.25)
    .to('.wm__track', { scaleX: 1, transformOrigin: '0% 50%', duration: 0.55, ease: 'power3.out' }, 2.3)
    .fromTo('.nav__mark-orbit', { rotation: 0 }, { rotation: 360, svgOrigin: '20 20', duration: 1.1, ease: 'power2.inOut' }, 1.9)
    .to('.nav__mark-mono', { scale: 1.2, transformOrigin: '50% 50%', duration: 0.18, ease: 'power2.out' }, 2.9)
    .to('.nav__mark-mono', { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, 3.08);
  logoTl = tl;
  return tl;
}
$('.nav__brand').addEventListener('pointerenter', () => {
  if (logoTl && (logoTl.time() >= logoTl.duration() - 0.05 || !logoTl.isActive())) logoTl.restart();
});

/* =========================================================
   01 HERO — intro timeline:
   1 headline reveals → 2 action photo masks in → 3 pitch lines draw →
   4 the player marker runs its line → 5 program strip → 6 CTAs.
   ========================================================= */
const heroRun = (() => {
  const run = $('.ht__run'), marker = $('.ht__marker');
  const L = run.getTotalLength();
  const place = u => {
    run.style.strokeDasharray = `${L}`;
    run.style.strokeDashoffset = `${L * (1 - u)}`;
    const p = run.getPointAtLength(L * u);
    marker.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
  };
  place(0);
  const pulse = () => gsap.fromTo('.ht__marker-pulse', { scale: 1, opacity: 0.9 }, { scale: 2.8, opacity: 0, duration: 0.9, ease: 'power2.out' });
  return { place, pulse };
})();

function heroIntro(isMobile) {
  const hero = $('.hero'), visual = $('.hero__visual');
  const lines = $$('.hero__pitch .pl');
  lines.forEach(l => { const len = l.getTotalLength(); gsap.set(l, { strokeDasharray: len, strokeDashoffset: len }); });
  const run = { u: 0 };

  const loop = logoLoop();
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: () => { hero.classList.add('is-ready'); loop.play(); } });
  tl.add(logoIntro(), 0)
    .to('.hero__kicker', { opacity: 1, duration: 0.6 }, 0.15)
    .fromTo('.hero__title .mask > span', { y: 0, yPercent: 112 }, { y: 0, yPercent: 0, duration: 1.05, stagger: 0.14, ease: 'power4.out' }, 0.2)
    .to('.hero__media', { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.3, ease: 'power4.inOut' }, 0.5)
    .fromTo('.hero__media img', { scale: 1.25 }, { scale: 1, duration: 2.2, ease: 'power3.out' }, 0.5)
    .to('.hero__inset', { clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: 1.1, ease: 'power4.inOut' }, 0.85)
    .to('.hero__title em', { '--uline': 1, duration: 0.8, ease: 'power3.inOut' }, 1.0)
    .to(lines, { strokeDashoffset: 0, duration: 1.4, stagger: 0.06, ease: 'power2.inOut' }, 1.0)
    .to('.ht__arc', { opacity: 1, duration: 0.8 }, 1.3)
    .set('.ht__mates', { opacity: 1 }, 1.35)
    .fromTo('.ht__mates circle', { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(3)' }, 1.35)
    .to('.ht__marker', { opacity: 1, duration: 0.3 }, 1.5)
    .to(run, { u: 1, duration: 1.4, ease: 'power2.inOut', onUpdate: () => heroRun.place(run.u) }, 1.55)
    .to('.ht__head', { opacity: 1, duration: 0.3 }, 2.85)
    .add(() => heroRun.pulse(), 2.9)
    .fromTo('.hero__strip li', { y: 18 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, clearProps: 'transform' }, 1.9)
    .add(() => rally.enter(), 2.0)
    .fromTo('.hero__copy', { y: 18 }, { opacity: 1, y: 0, duration: 0.9 }, 2.0)
    .fromTo('.hero__cta .btn', { y: 18 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, clearProps: 'y' }, 2.2)
    .fromTo('.hero__tag', { scale: 0.7, transformOrigin: '100% 100%' }, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(2)' }, 2.35)
    .fromTo('.hero__proof', { x: -14 }, { opacity: 1, x: 0, duration: 0.8 }, 2.45);

  /* Hovering the media replays the run (desktop) */
  let replaying = false;
  if (!isMobile && finePointer) {
    visual.addEventListener('pointerenter', () => {
      if (replaying || tl.isActive()) return;
      replaying = true;
      gsap.fromTo(run, { u: 0 }, { u: 1, duration: 1.2, ease: 'power2.inOut', onUpdate: () => heroRun.place(run.u), onComplete: () => { heroRun.pulse(); replaying = false; } });
    });
  }

  /* Light scroll-out: the media sinks, the content lifts */
  const out = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hero__visual', { yPercent: 10, ease: 'none', scrollTrigger: out });
  if (!isMobile) {
    gsap.to('.hero__content', { yPercent: -8, ease: 'none', scrollTrigger: out });
    /* Depth: the media and the words drift apart with the pointer */
    if (finePointer) {
      const mx = gsap.quickTo('.hero__media', 'x', { duration: 1.1, ease: 'power3.out' }), my = gsap.quickTo('.hero__media', 'y', { duration: 1.1, ease: 'power3.out' });
      const ix = gsap.quickTo('.hero__inset', 'x', { duration: 1.3, ease: 'power3.out' }), iy = gsap.quickTo('.hero__inset', 'y', { duration: 1.3, ease: 'power3.out' });
      hero.addEventListener('pointermove', e => {
        const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
        mx(nx * -14); my(ny * -10); ix(nx * 18); iy(ny * 12);
      });
      hero.addEventListener('pointerleave', () => { mx(0); my(0); ix(0); iy(0); });
    }
  }
  return tl;
}

/* ---------- Generic line-mask reveal ---------- */
function maskReveal(selector, trigger, start = 'top 80%') {
  return gsap.from(selector, {
    yPercent: 112, duration: 1.15, stagger: 0.12, ease: 'power4.out',
    scrollTrigger: { trigger, start, once: true },
  });
}

/* Pinned storytelling uses CSS position:sticky (robust with Lenis, no pin-spacers).
   Returns true when the inner panel fits the viewport and the section was made tall. */
function stickyPin(sec, innerSel, enabled) {
  const inner = $(innerSel, sec);
  sec.classList.remove('is-pinned');
  if (!enabled || inner.scrollHeight > innerHeight + 2) return false;
  sec.classList.add('is-pinned');
  return true;
}

/* =========================================================
   SECTIONS
   ========================================================= */
/* 02 "The first goal": a side-view pitch where scroll plays pass → touch → give & go → goal.
   Two teammates move up the pitch and swing the kicking leg on contact, every completed step
   bursts on the pitch and unlocks one promise, and the net ripples when the ball goes in.
   Desktop pins it to scroll (the 3D ball rides the flight path); mobile loops it on its own. */
function setupRally(isDesktop, reduced = false) {
  const sec = $('.rally'), svg = $('.rally__court'), line = $('.rally__ghost'), trail = $('.rally__trail');
  const ballEl = $('.rally__ball'), shadowEl = $('.rally__shadow'), countN = $('.rally__count-n');
  const calls = $$('.rally__call'), points = $$('.rally__points .stat'), bursts = $$('.rally__bursts circle');
  const plA = $('.rally__player--a'), plB = $('.rally__player--b');
  const kickA = $('.rally__player-kick', plA), kickB = $('.rally__player-kick', plB);
  const L = line.getTotalLength();

  /* Where each of the 8 quadratic segments ends along the path:
     touch, contact, touch, contact, touch, contact, goal, net */
  const nums = line.getAttribute('d').match(/-?\d+(\.\d+)?/g).map(Number);
  const E = [];
  let acc = 0;
  for (let i = 2, x0 = nums[0], y0 = nums[1]; i < nums.length; i += 4) {
    const seg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    seg.setAttribute('d', `M${x0} ${y0} Q${nums[i]} ${nums[i + 1]} ${nums[i + 2]} ${nums[i + 3]}`);
    svg.appendChild(seg); acc += seg.getTotalLength(); seg.remove();
    E.push(acc); x0 = nums[i + 2]; y0 = nums[i + 3];
  }
  const F = E.map(v => v / acc);
  const BOUNCE = [F[0], F[2], F[4], F[6]];
  const SHOT = [[0, F[1]], [F[1], F[3]], [F[3], F[5]], [F[5], F[7]]];
  /* Player x keyframes (foot = ball contact - 16) and the moments each one strikes the ball */
  const PA = { keys: [[0, 180], [0.04, 180], [F[3] - 0.006, 796], [F[3] + 0.01, 796], [F[7], 1240]], hits: [0.012, F[3]] };
  const PB = { keys: [[0, 520], [F[1] + 0.006, 520], [F[5] - 0.01, 1056], [1, 1056]], hits: [F[1], F[5]] };

  /* The trail is a short comet tail that follows the ball */
  const TAIL = 240;
  gsap.set(trail, { strokeDasharray: `${TAIL} ${L + TAIL}`, strokeDashoffset: TAIL });
  let prevU = 0, shownCount = 0;
  /* Mobile: the pitch is wider than the screen and a "camera" pans to keep the ball in frame */
  const stage = $('.rally__stage');
  const pan = !isDesktop && !reduced ? gsap.quickTo(svg, 'x', { duration: 0.6, ease: 'power3.out' }) : null;

  const setCount = k => {
    if (k === shownCount) return;
    const dir = k > shownCount ? 1 : -1;
    shownCount = k;
    if (reduced) { countN.textContent = k; return; }
    gsap.timeline()
      .to(countN, { yPercent: -110 * dir, duration: 0.16, ease: 'power2.in', overwrite: true })
      .add(() => { countN.textContent = k; })
      .fromTo(countN, { yPercent: 110 * dir }, { yPercent: 0, duration: 0.4, ease: 'back.out(2.2)' });
  };
  const placePlayer = (el, kick, P, u) => {
    const ks = P.keys;
    let x = ks[ks.length - 1][1];
    for (let i = 0; i < ks.length - 1; i++) {
      if (u <= ks[i + 1][0]) { x = lerp(ks[i][1], ks[i + 1][1], easeInOut(clamp((u - ks[i][0]) / Math.max(1e-6, ks[i + 1][0] - ks[i][0]), 0, 1))); break; }
    }
    el.setAttribute('transform', `translate(${x.toFixed(1)} 380)`);
    const bump = Math.max(0, ...P.hits.map(h => 1 - Math.abs(u - h) / 0.03));
    kick.setAttribute('transform', `rotate(${(-48 * bump).toFixed(1)} 17 -58)`);
  };

  function draw(u) {
    const p = line.getPointAtLength(L * u);
    trail.style.strokeDashoffset = TAIL - L * u;
    /* Ball: spins with travel, squashes on each touch */
    const nearBounce = BOUNCE.some(b => Math.abs(u - b) < 0.006);
    ballEl.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(u * 1440).toFixed(0)})${nearBounce ? ' scale(1.18 0.8)' : ''}`);
    const h = Math.min(300, Math.max(0, 380 - p.y));
    shadowEl.setAttribute('cx', p.x.toFixed(1));
    shadowEl.setAttribute('rx', (17 - h * 0.035).toFixed(1));
    shadowEl.style.opacity = (0.55 - h * 0.0013).toFixed(2);
    sec.style.setProperty('--bx', `${(p.x / 16).toFixed(1)}%`);
    if (pan) {
      const W = svg.clientWidth, V = stage.clientWidth;
      pan(clamp(V / 2 - (p.x / 1600) * W, V - W, 0));
    }

    placePlayer(plA, kickA, PA, u);
    placePlayer(plB, kickB, PB, u);

    /* Calls: PASS / TOUCH / GIVE & GO / GOAL, each while its move is in the air */
    calls.forEach((c, i) => c.classList.toggle('is-on', u > 0.001 && u >= SHOT[i][0] - 0.01 && u <= BOUNCE[i] + (i === 3 ? 0.05 : 0.005)));

    /* Promises: fill toward their touch, light when it lands */
    let landed = 0;
    points.forEach((pt, i) => {
      const from = i ? BOUNCE[i - 1] : 0;
      pt.style.setProperty('--p', clamp((u - from) / (BOUNCE[i] - from), 0, 1).toFixed(3));
      const lit = u >= BOUNCE[i] - 0.001;
      pt.classList.toggle('is-on', lit);
      if (lit) landed = i + 1;
    });
    points.forEach((pt, i) => pt.classList.toggle('is-current', i === landed - 1));
    setCount(landed);

    /* Bursts on forward crossings only */
    if (!reduced) BOUNCE.forEach((b, i) => {
      if (prevU < b && u >= b) gsap.fromTo(bursts[i], { attr: { r: 4 }, opacity: 0.95 }, { attr: { r: 60 }, opacity: 0, duration: 0.85, ease: 'power2.out', overwrite: true });
    });
    if (u >= 0.995) sec.classList.add('is-crowned');
    else if (u < 0.97) sec.classList.remove('is-crowned');
    prevU = u;
  }

  if (reduced) {
    sec.classList.add('is-set');
    draw(1);
    return { st: null, path: line, RIDE: [0, 1], pinned: false, cleanup: () => {} };
  }

  /* Entrance: title masks, pitch draws in, players step on */
  maskReveal('.rally__title .mask > span', '.rally__title');
  gsap.from('.rally__photo, .rally__aside, .rally__board', { opacity: 0, y: 22, duration: 1, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.rally__head', start: 'top 75%', once: true } });
  const ground = $('.rally__ground'), gLen = ground.getTotalLength();
  gsap.set(ground, { strokeDasharray: gLen, strokeDashoffset: gLen });
  gsap.timeline({ scrollTrigger: { trigger: '.rally__stage', start: 'top 88%', once: true }, onComplete: () => sec.classList.add('is-set') })
    .to(ground, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' })
    .from('.rally__ticks line', { scaleY: 0, transformOrigin: '50% 50%', duration: 0.5, stagger: 0.06, ease: 'back.out(3)' }, 0.5)
    .from('.rally__net', { scaleY: 0, transformOrigin: '50% 100%', duration: 0.7, ease: 'back.out(1.8)' }, 0.6)
    .from('.rally__box', { opacity: 0, duration: 0.8 }, 0.8)
    .from('.rally__points .stat', { y: 26, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'opacity,transform' }, 0.5);

  let st = null, RIDE = [0, 1], pinned = false, loop = null;
  if (isDesktop && stickyPin(sec, '.rally__pin', true)) {
    pinned = true;
    RIDE = [0.07, 0.93];
    st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: s => draw(clamp((s.progress - RIDE[0]) / (RIDE[1] - RIDE[0]), 0, 1)) });
    draw(0);
  } else if (isDesktop) {
    /* Too short to pin: the move plays while the pitch crosses the screen */
    st = ScrollTrigger.create({ trigger: '.rally__stage', start: 'top 80%', end: 'bottom 25%', onUpdate: s => draw(s.progress) });
    draw(0);
  } else {
    /* Mobile: the move loops on its own while the pitch is on screen */
    const state = { u: 0 };
    loop = gsap.to(state, { u: 1, duration: 6.5, ease: 'none', repeat: -1, repeatDelay: 1.6, paused: true, onUpdate: () => draw(state.u) });
    ScrollTrigger.create({ trigger: '.rally__stage', start: 'top bottom', end: 'bottom top', onToggle: s => (s.isActive ? loop.play() : loop.pause()) });
    draw(0);
  }
  return { st, path: line, RIDE, pinned, cleanup: () => { loop?.kill(); gsap.set(svg, { clearProps: 'transform' }); sec.classList.remove('is-crowned'); } };
}

function setupAbout() {
  const sec = $('.coach');
  gsap.fromTo('.coach__lines-a', { x: -80 }, { x: 80, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.coach__lines-b', { y: 60 }, { y: -60, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  maskReveal('.coach__title .mask > span', '.coach__title');
  gsap.to('.coach__copy p', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, stagger: 0.16, ease: 'power3.inOut', scrollTrigger: { trigger: '.coach__copy', start: 'top 85%', once: true } });
  gsap.to('.coach__media img', { scale: 1, ease: 'none', scrollTrigger: { trigger: '.coach__media', start: 'top bottom', end: 'center 45%', scrub: true } });
  gsap.fromTo('.coach__visual', { y: 70 }, { y: -40, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.coach__inset', { yPercent: 28, opacity: 0, rotation: -4, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.coach__visual', start: 'top 55%', once: true } });
  gsap.from('.coach__known-label, .coach__chips li', { opacity: 0, y: 14, duration: 0.8, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.coach__known', start: 'top 92%', once: true } });
}

function setupCoaching() {
  maskReveal('.modes__head .mask > span', '.modes__head');
  gsap.from('.switch', { opacity: 0, y: 24, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.modes__head', start: 'top 72%', once: true } });
  gsap.from('.modes__media', { opacity: 0, y: 50, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.modes__media', start: 'top 88%', once: true } });
  gsap.from('.modes__panels', { opacity: 0, y: 30, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.modes__panels', start: 'top 88%', once: true } });
}

/* The specialized-training ring: one continuous line draws around the core,
   lighting each program as it passes. Desktop pins it to scroll; mobile
   turns it into a vertically connected list. */
function setupClub(isDesktop, reduced = false) {
  const sec = $('.club'), ring = $('.club__ring-line'), tip = $('.club__ring-tip');
  const nodes = $$('.node'), list = $('.club__nodes');
  const nowName = $('.club__now-name'), nowText = $('.club__now-text');
  const F = nodes.map(n => +n.dataset.f);
  const L = ring.getTotalLength();
  const RIDE = [0.06, 0.9];
  let lit = 0, hover = null, shown = 0;
  gsap.set(ring, { strokeDasharray: L, strokeDashoffset: L });

  function readout() {
    const k = hover ?? lit;
    nodes.forEach((n, j) => n.classList.toggle('is-current', isDesktop && j === k));
    if (k === shown) return;
    shown = k;
    const n = nodes[k];
    const swap = () => { nowName.textContent = $('.node__name', n).textContent; nowText.textContent = $('.node__text', n).textContent; };
    if (reduced) { swap(); return; }
    gsap.timeline()
      .to([nowName, nowText], { opacity: 0, y: -8, duration: 0.16, ease: 'power2.in', overwrite: true })
      .add(swap)
      .fromTo([nowName, nowText], { y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power3.out' });
  }
  function draw(u) {
    ring.style.strokeDashoffset = L * (1 - u);
    const p = ring.getPointAtLength(L * u);
    tip.setAttribute('cx', p.x.toFixed(1)); tip.setAttribute('cy', p.y.toFixed(1));
    let k = 0;
    F.forEach((f, j) => { const lt = u >= f - 0.002; nodes[j].classList.toggle('is-lit', lt); if (lt) k = j; });
    lit = k;
    readout();
  }
  const fillList = p => {
    list.style.setProperty('--fill', p.toFixed(3));
    nodes.forEach((n, j) => n.classList.toggle('is-lit', p >= j / (nodes.length - 1) - 0.02));
  };

  if (reduced) { draw(1); fillList(1); return { st: null, ring, RIDE, cleanup: () => {} }; }

  const offs = [];
  let st = null;
  maskReveal('.club__intro .mask > span', '.club__intro');
  gsap.from('.club__copy, .club__now, .club__cta', { opacity: 0, y: 20, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.club__intro', start: 'top 72%', once: true } });

  if (isDesktop) {
    nodes.forEach((n, j) => {
      offs.push(on(n, 'pointerenter', () => { hover = j; readout(); }));
      offs.push(on(n, 'pointerleave', () => { hover = null; readout(); }));
    });
    gsap.from('.club__core', { opacity: 0, scale: 0.82, duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: '.club__orbit', start: 'top 80%', once: true } });
    gsap.from('.club__bubble img', { scale: 1.6, opacity: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out', scrollTrigger: { trigger: '.club__orbit', start: 'top 70%', once: true } });
    if (stickyPin(sec, '.club__pin', true)) {
      st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: s => draw(clamp((s.progress - RIDE[0]) / (RIDE[1] - RIDE[0]), 0, 1)) });
    } else {
      ScrollTrigger.create({ trigger: '.club__orbit', start: 'top 75%', end: 'bottom 45%', onUpdate: s => draw(s.progress) });
    }
    draw(0);
  } else {
    ScrollTrigger.create({ trigger: list, start: 'top 72%', end: 'bottom 62%', onUpdate: s => fillList(s.progress) });
    fillList(0);
  }
  return { st, ring, RIDE, cleanup: () => offs.forEach(f => f()) };
}

/* 04 Every player: entrance — title masks, tabs stagger in, the journey pitch draws */
function setupLevels() {
  maskReveal('.levels__head .mask > span', '.levels__head');
  gsap.from('.levels__intro', { opacity: 0, y: 18, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.levels__head', start: 'top 75%', once: true } });
  gsap.from('.lt', { opacity: 0, x: -24, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: '.levels__tabs', start: 'top 85%', once: true } });
  gsap.from('.levels__media', { clipPath: 'inset(0% 0% 100% 0% round 18px)', duration: 1.2, ease: 'power4.inOut', clearProps: 'clipPath', scrollTrigger: { trigger: '.levels__media', start: 'top 85%', once: true } });
  const lines = $$('.lj__lines > *');
  lines.forEach(l => { const len = l.getTotalLength(); gsap.set(l, { strokeDasharray: len, strokeDashoffset: len }); });
  gsap.timeline({ scrollTrigger: { trigger: '.levels__journey', start: 'top 88%', once: true } })
    .to(lines, { strokeDashoffset: 0, duration: 1.3, stagger: 0.08, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' })
    .from('.lj__marker > *', { scale: 0, svgOrigin: '0 0', duration: 0.6, ease: 'back.out(3)' }, 0.6)
    .from('.lj__labels text, .lj-legend li', { opacity: 0, y: 8, duration: 0.6, stagger: 0.08 }, 0.5);
}

/* 05 Goals: entrance only — the board itself is interaction-driven */
function setupGoals() {
  maskReveal('.goals__head .mask > span', '.goals__head');
  gsap.from('.goals__intro', { opacity: 0, y: 18, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.goals__head', start: 'top 75%', once: true } });
  gsap.from('.gt', { opacity: 0, x: -30, duration: 0.7, stagger: 0.06, ease: 'power3.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: '.goals__tiles', start: 'top 85%', once: true } });
  gsap.from('.goals__recs', { opacity: 0, y: 40, duration: 1, ease: 'power3.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: '.goals__recs', start: 'top 90%', once: true } });
}

/* Testimonials: a stack of parent notes. Desktop pins the section and deals one
   card per scroll step onto the table; "families" gets circled once the table is full. */
function setupCrowd(isDesktop) {
  const sec = $('.crowd'), table = $('.crowd__table'), cards = $$('.pcard'), n = cards.length;
  const track = $('.crowd__words-track'), countN = $('.crowd__count-n'), line = $('.crowd__line'), dots = $$('.crowd__dots li');
  const loopPath = $('.crowd__ring path');
  const NOTES = cards.map(c => $('.pcard__note', c).textContent);
  gsap.set(loopPath, { strokeDasharray: 1, strokeDashoffset: 1 });
  maskReveal('.crowd__title .mask > span', '.crowd__title');
  gsap.from('.crowd__last', { yPercent: 60, opacity: 0, duration: 1.1, delay: 0.36, ease: 'power4.out', scrollTrigger: { trigger: '.crowd__title', start: 'top 80%', once: true } });
  ScrollTrigger.create({ trigger: '.crowd__title', start: 'top 75%', once: true, onEnter: () => sec.classList.add('is-in') });
  gsap.from('.crowd__now, .crowd__dots', { opacity: 0, y: 20, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.crowd__intro', start: 'top 70%', once: true } });

  let step = -1;
  function setStep(i) {
    if (i === step) return;
    step = i;
    track.style.transform = `translateY(${-0.88 * i}em)`;
    countN.textContent = String(i + 1).padStart(2, '0');
    line.textContent = NOTES[i];
    dots.forEach((d, j) => d.classList.toggle('is-done', j <= i));
  }
  setStep(0);

  /* Measure in the dealing layout (one stack on a fixed-height table), not the grid fallback */
  if (isDesktop) sec.classList.add('is-dealing');
  /* Quotes vary in length: give every note the tallest one's height so the stack reads as one deck */
  const quotes = $$('.pcard__quote', sec);
  const evenQuotes = () => {
    quotes.forEach(q => { q.style.minHeight = ''; });
    if (!isDesktop || !quotes.length) return;
    const tallest = Math.max(...quotes.map(q => q.offsetHeight));
    quotes.forEach(q => { q.style.minHeight = `${tallest}px`; });
  };
  evenQuotes();
  /* Re-measure once web fonts settle (each refresh) */
  ScrollTrigger.addEventListener('refreshInit', evenQuotes);
  const unevenQuotes = () => { ScrollTrigger.removeEventListener('refreshInit', evenQuotes); quotes.forEach(q => { q.style.minHeight = ''; }); };
  if (isDesktop && stickyPin(sec, '.crowd__pin', true)) {
    const W = () => table.clientWidth, H = () => table.clientHeight;
    cards.forEach((c, i) => {
      c.style.zIndex = String(10 + n - i);
      gsap.set(c, { xPercent: -50, yPercent: -50, x: i * 4 - 10, y: i * -5 + 12, rotation: parseFloat(c.style.getPropertyValue('--r0')) || 0 });
    });
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.inOut', overwrite: false } });
    for (let i = 0; i < n - 1; i++) {
      const c = cards[i];
      tl.to(c, { x: () => +c.dataset.x * W(), y: () => +c.dataset.y * H(), rotation: +c.dataset.r, scale: 0.8, duration: 0.75 }, i + 0.1)
        .set(c, { zIndex: i + 1 }, i + 0.86)
        .to(cards[i + 1], { rotation: 0, scale: 1.03, duration: 0.5, ease: 'power2.out' }, i + 0.45);
    }
    tl.to(cards[n - 1], { scale: 1.1, duration: 0.6, ease: 'back.out(1.6)' }, n - 1 + 0.1)
      .to({}, { duration: 0.5 });
    const total = tl.duration();
    const st = ScrollTrigger.create({
      trigger: sec, start: 'top top', end: 'bottom bottom', animation: tl, scrub: 0.6, invalidateOnRefresh: true,
      onUpdate: s => {
        const t = s.progress * total;
        setStep(clamp(Math.floor(t + 0.5), 0, n - 1));
        loopPath.style.strokeDashoffset = 1 - clamp((t - (n - 1.4)) / 1.1, 0, 1);
      },
    });
    return { st, cleanup: () => { sec.classList.remove('is-dealing'); cards.forEach(c => { c.style.zIndex = ''; }); unevenQuotes(); } };
  }

  /* Static table (mobile swipe row, or a desktop screen too short to pin):
     the counter, word and dots still follow the scroll */
  sec.classList.remove('is-dealing');
  ScrollTrigger.create({ trigger: table, start: 'top 70%', end: 'bottom 40%', onUpdate: s => setStep(clamp(Math.floor(s.progress * n), 0, n - 1)) });
  gsap.from(cards, { y: 50, opacity: 0, rotation: i => (i % 2 ? 9 : -9), duration: 1, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: table, start: 'top 88%', once: true } });
  ScrollTrigger.create({ trigger: table, start: 'top 60%', once: true, onEnter: () => gsap.to(loopPath, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }) });
  return { st: null, cleanup: unevenQuotes };
}

function setupAction(isDesktop) {
  const fig = $('.action__video');
  const round = isDesktop ? 18 : 14;
  let hovering = false;
  maskReveal('.action__head .mask > span', '.action__head');
  gsap.from('.action__copy', { opacity: 0, y: 18, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.action__head', start: 'top 75%', once: true } });
  gsap.from('.camp', { opacity: 0, y: 40, duration: 1, stagger: 0.12, ease: 'power3.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: '.camps', start: 'top 85%', once: true } });
  gsap.set(fig, { clipPath: isDesktop ? `inset(0% 12% 0% 12% round ${round}px)` : `inset(0% 5% 0% 5% round ${round}px)`, scale: isDesktop ? 0.94 : 1 });
  gsap.to(fig, { clipPath: `inset(0% 0% 0% 0% round ${round}px)`, scale: 1, ease: 'none', scrollTrigger: { trigger: fig, start: 'top 88%', end: 'top 12%', scrub: true } });
  gsap.fromTo('.action__video img', { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
  if (isDesktop) {
    $$('.collage__item').forEach(el => {
      const sp = parseFloat(el.dataset.speed || '1');
      gsap.fromTo(el, { y: (sp - 1) * -220 }, { y: (sp - 1) * 220, ease: 'none', scrollTrigger: { trigger: '.action__collage', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.fromTo('.collage__item', { clipPath: `inset(100% 0% 0% 0% round ${round}px)` }, { clipPath: `inset(0% 0% 0% 0% round ${round}px)`, duration: 1.3, stagger: 0.12, ease: 'power4.out', scrollTrigger: { trigger: '.action__collage', start: 'top 82%', once: true } });
  } else {
    gsap.from('.collage__item', { opacity: 0, x: 40, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.action__collage', start: 'top 88%', once: true } });
  }

  const enter = () => { hovering = true; }, leave = () => { hovering = false; };
  if (isDesktop) { fig.addEventListener('pointerenter', enter); fig.addEventListener('pointerleave', leave); }
  return {
    fig,
    cleanup: () => { fig.removeEventListener('pointerenter', enter); fig.removeEventListener('pointerleave', leave); },
    pos: () => (isDesktop && hovering && cursorPos.inside) ? { x: cursorPos.x, y: cursorPos.y } : center(A['action-park']),
    followR: () => (isDesktop && hovering && cursorPos.inside) ? baseR() * 0.42 : baseR() * 0.78,
  };
}

function setupRegister() {
  maskReveal('.register__intro .mask > span', '.register__intro');
  gsap.from('.register__copy, .register__next li, .register__direct', { opacity: 0, y: 18, duration: 1, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.register__intro', start: 'top 75%', once: true } });
  gsap.from('.wiz', { opacity: 0, y: 50, duration: 1.1, ease: 'power3.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: '.wiz', start: 'top 88%', once: true } });
}

function setupFaq() {
  maskReveal('.faq__head .mask > span', '.faq__head');
  gsap.from('.faq__copy', { opacity: 0, y: 18, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.faq__head', start: 'top 75%', once: true } });
  gsap.from('.qa', { opacity: 0, y: 20, duration: 0.8, stagger: 0.05, ease: 'power3.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: '.faq__list', start: 'top 85%', once: true } });
  gsap.from('.social__grid li', { opacity: 0, y: 30, duration: 0.9, stagger: 0.06, ease: 'power3.out', clearProps: 'opacity,transform', scrollTrigger: { trigger: '.social', start: 'top 88%', once: true } });
}

function setupFinale() {
  gsap.from('.footer__big .mask > span', { yPercent: 110, duration: 1.3, stagger: 0.14, ease: 'power4.out', scrollTrigger: { trigger: '.footer__big', start: 'top 85%', once: true } });
  gsap.from('.finale__side > *', { opacity: 0, y: 20, duration: 1, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.finale__side', start: 'top 90%', once: true } });
  gsap.from('.footer__legal', { opacity: 0, y: 16, duration: 1, scrollTrigger: { trigger: '.footer__legal', start: 'top 98%', once: true } });

  /* Pitch lines draw in, then the boxes settle into place */
  const court = $('.court');
  ScrollTrigger.create({ trigger: court, start: 'top 82%', once: true, onEnter: () => court.classList.add('is-drawn') });

  /* Ages board: flips in like a scoreboard call */
  gsap.from('.score__num', { yPercent: 60, opacity: 0, rotateX: -80, duration: 0.9, stagger: 0.14, ease: 'back.out(2)', delay: 0.9, scrollTrigger: { trigger: court, start: 'top 82%', once: true } });

  /* Marquee: continuous drift, pushed faster (and reversed) by scroll velocity */
  const track = $('.marquee__track');
  const loop = gsap.to(track, { xPercent: -50, duration: 36, ease: 'none', repeat: -1, paused: true });
  let dir = 1;
  const marqueeST = ScrollTrigger.create({
    trigger: '.marquee', start: 'top bottom', end: 'bottom top',
    onToggle: s => (s.isActive ? loop.play() : loop.pause()),
    onUpdate: s => {
      const v = s.getVelocity();
      if (Math.abs(v) > 20) dir = v > 0 ? 1 : -1;
      const boost = clamp(Math.abs(v) / 250, 0, 7);
      gsap.to(loop, { timeScale: dir * (1 + boost), duration: 0.25, overwrite: true });
      gsap.to(loop, { timeScale: dir, duration: 1.4, delay: 0.25, ease: 'power2.out' });
    },
  });

  /* Sign-off letters thin out around the cursor — the ball "dents" the type */
  const cleanups = [() => { loop.kill(); marqueeST.kill(); }];
  const words = $$('[data-letters]');
  if (!words[0].querySelector('.ch')) {
    words.forEach(w => {
      const text = w.textContent;
      w.textContent = '';
      [...text].forEach(c => {
        const s = document.createElement('span');
        s.className = c === ' ' ? 'ch ch--space' : 'ch';
        s.textContent = c === ' ' ? ' ' : c;
        s.setAttribute('aria-hidden', 'true');
        w.appendChild(s);
      });
    });
  }
  if (finePointer) {
    const big = $('.footer__big'), chars = $$('.footer__word .ch:not(.ch--space)');
    let raf = 0, px = 0, py = 0;
    const paint = () => {
      raf = 0;
      chars.forEach(ch => {
        const r = ch.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const t = clamp(1 - d / 260, 0, 1);
        ch.style.setProperty('--w', Math.round(800 - 620 * t * t));
      });
    };
    const move = e => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(paint); };
    const leave = () => chars.forEach(ch => ch.style.removeProperty('--w'));
    big.addEventListener('pointermove', move);
    big.addEventListener('pointerleave', leave);
    cleanups.push(() => { big.removeEventListener('pointermove', move); big.removeEventListener('pointerleave', leave); leave(); });
  }
  return () => cleanups.forEach(f => f());
}

/* ---------- Gallery lightbox (every photo in the camps gallery is viewable) ---------- */
(function lightbox() {
  const dlg = $('#lightbox'), view = $('.lightbox__img'), cap = $('.lightbox__cap'), count = $('.lightbox__count');
  const triggers = $$('[data-gallery]').sort((a, b) => a.dataset.gallery - b.dataset.gallery);
  const imgs = triggers.map(t => $('img', t.closest('figure')));
  let i = 0;
  function show(k) {
    i = (k + imgs.length) % imgs.length;
    const src = imgs[i];
    view.src = src.currentSrc || $('source', src.parentElement)?.srcset || src.src;
    view.alt = src.alt;
    cap.textContent = src.alt;
    count.textContent = `${i + 1} / ${imgs.length}`;
  }
  const open = k => { show(k); dlg.showModal(); lenis?.stop(); rally.setHidden(true); };
  const close = () => { if (dlg.open) dlg.close(); };
  triggers.forEach(t => t.addEventListener('click', () => open(+t.dataset.gallery)));
  $$('.lightbox__step').forEach(b => b.addEventListener('click', () => show(i + +b.dataset.step)));
  $('.lightbox__close').addEventListener('click', close);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') show(i + 1);
    if (e.key === 'ArrowLeft') show(i - 1);
  });
  dlg.addEventListener('close', () => { lenis?.start(); rally.setHidden(false); });
})();

/* Camp cards were rendered before GSAP loaded: give their buttons the magnetic treatment too */
magnetize($('.camps'));

/* =========================================================
   BUILD — responsive contexts
   ========================================================= */
const mm = gsap.matchMedia();
mm.add({ isDesktop: '(min-width: 901px)', isMobile: '(max-width: 900px)', reduce: '(prefers-reduced-motion: reduce)' }, ctx => {
  const { isDesktop, reduce } = ctx.conditions;
  if (reduce) return setupReduced(isDesktop);

  const isMobile = !isDesktop;
  heroIntro(isMobile);
  const firstGoal = setupRally(isDesktop);
  setupCoaching();
  const club = setupClub(isDesktop);
  setupLevels();
  setupGoals();
  setupAbout();
  const action = setupAction(isDesktop);
  const crowd = setupCrowd(isDesktop);
  setupRegister();
  setupFaq();
  const finaleCleanup = setupFinale();

  /* ---- Ball anchors, in page order: hero → rides the first-goal move → the format switch knob →
     around the specialized-training ring → players → goals → Coach Robert → camps →
     testimonials → registration → FAQ → off the footer pitch ---- */
  const riders = [];
  if (hasBall) {
    const R = baseR;
    const rallySec = $('.rally'), about = $('.coach'), modes = $('.modes'), registerIntro = $('.register__intro');
    const knob = $('.switch__ball');
    const anchors = [
      { name: 'hero', at: () => 0, pos: () => center(A.hero), r: () => R(), arc: 0.22 },
      /* The 3D ball becomes the match ball: it rides the pitch's flight path while the section is pinned */
      ...(firstGoal.pinned ? [
        { name: 'rally-ride', at: () => firstGoal.st.start + firstGoal.RIDE[0] * dur(firstGoal.st), pos: () => rally.pathPoint(firstGoal.path, 0), r: () => firstGoal.path.getScreenCTM().a * 15, path: firstGoal.path, noShadow: true },
        { name: 'rally-out', at: () => firstGoal.st.start + firstGoal.RIDE[1] * dur(firstGoal.st), pos: () => rally.pathPoint(firstGoal.path, 1), r: () => firstGoal.path.getScreenCTM().a * 15, arc: 0.28 },
      ] : [
        { name: 'rally', at: () => docTop(rallySec) - vh() * 0.4, pos: () => center(A.rally), r: () => R() * 0.62, arc: 0.24 },
      ]),
      /* The ball rides the format switch knob — and follows it when the format changes */
      { name: 'modes-in', at: () => docTop(modes) - vh() * 0.12, pos: () => center(knob), r: () => R() * 0.4, arc: 0 },
      { name: 'modes-out', at: () => docTop(modes) + modes.offsetHeight - vh() * 0.95, pos: () => center(knob), r: () => R() * 0.4, arc: 0.3 },
    ];
    riders.push(modes);
    if (firstGoal.pinned) riders.push(rallySec);
    if (club.st) {
      anchors.push(
        { name: 'club-ride', at: () => club.st.start + club.RIDE[0] * dur(club.st), pos: () => rally.pathPoint(club.ring, 0), r: () => R() * 0.5, path: club.ring },
        { name: 'club-out', at: () => club.st.start + club.RIDE[1] * dur(club.st), pos: () => rally.pathPoint(club.ring, 1), r: () => R() * 0.5, arc: 0.28 },
      );
      riders.push($('.club'));
    } else {
      anchors.push({ name: 'club', at: () => docTop($('.club')) - vh() * 0.3, pos: () => center(A.club), r: () => R() * 0.7, arc: 0.26 });
    }
    anchors.push(
      { name: 'levels', at: () => docTop($('.levels')) - vh() * 0.3, pos: () => center(A.levels), r: () => R() * 0.6, arc: 0.26 },
      { name: 'goals', at: () => docTop($('.goals')) - vh() * 0.3, pos: () => center(A.goals), r: () => R() * 0.6, arc: 0.26 },
      { name: 'about', at: () => docTop(about) - vh() * 0.25, pos: () => center(A.about), r: () => R() * 0.78, arc: 0.3 },
      { name: 'action-in', at: () => docTop(action.fig) - vh() * 0.75, pos: action.pos, r: action.followR, arc: 0 },
      { name: 'action-out', at: () => docTop(action.fig) + action.fig.offsetHeight - vh() * 0.55, pos: action.pos, r: action.followR, arc: 0.3 },
    );
    /* Testimonials: the ball sits on the deck like a paperweight while the cards are dealt from under it */
    if (crowd.st) {
      anchors.push(
        { name: 'crowd-in', at: () => crowd.st.start + 0.02 * dur(crowd.st), pos: () => center(A.crowd), r: () => R() * 0.45, arc: 0 },
        { name: 'crowd-out', at: () => crowd.st.start + 0.96 * dur(crowd.st), pos: () => center(A.crowd), r: () => R() * 0.45, arc: 0.3 },
      );
    } else {
      anchors.push({ name: 'crowd', at: () => docTop($('.crowd')) - vh() * 0.3, pos: () => center(A.crowd), r: () => R() * 0.6, arc: 0.24 });
    }
    anchors.push(
      { name: 'contact', at: () => docTop(registerIntro) - vh() * 0.3, pos: () => center(A.contact), r: () => R() * 0.85, arc: 0.2 },
      { name: 'faq', at: () => docTop($('.faq')) - vh() * 0.3, pos: () => center(A.faq), r: () => R() * 0.7, arc: 0.22 },
      { name: 'footer-start', at: () => Math.min(docTop(A['footer-start']) - vh() * 0.85, ScrollTrigger.maxScroll(window) - vh() * 0.35), pos: () => { const p = center(A['footer-start']); return { x: p.x, y: p.y - R() * 0.8 }; }, r: () => R() * 0.8, arc: 0.12 },
      { name: 'footer-end', at: () => ScrollTrigger.maxScroll(window), pos: () => ({ x: innerWidth + R() * 2.6, y: center(A['footer-start']).y - R() * 0.8 }), r: () => R() * 0.8, arc: 0 },
    );
    riders.forEach(el => el.classList.add('has-rider'));
    rally.setAnchors(anchors);
  } else {
    html.classList.add('no-ball');
  }

  return () => { firstGoal.cleanup(); club.cleanup(); crowd.cleanup(); action.cleanup(); finaleCleanup(); riders.forEach(el => el.classList.remove('has-rider')); rally.setAnchors([]); };
});

/* ---------- Reduced motion: everything visible, interaction only ---------- */
function setupReduced(isDesktop) {
  setupRally(isDesktop, true);
  setupClub(isDesktop, true);
  heroRun.place(1);
  gsap.set('.action__video', { clipPath: 'inset(0% 0% 0% 0% round 18px)', scale: 1 });
  $('.hero').classList.add('is-ready', 'is-shown');
  $('.crowd').classList.add('is-in');
  $('.court').classList.add('is-drawn');
  $$('[data-letters]').forEach(w => w.removeAttribute('data-letters'));
  return () => {};
}

/* ---------- Refresh after fonts settle ---------- */
document.fonts?.ready.then(() => ScrollTrigger.refresh());
window.addEventListener('load', () => ScrollTrigger.refresh());

/* Read-only handle for QA in devtools: window.__ball.sample(scrollY) etc. */
window.__ball = { rally, lenis, cursorPos, anchorsOf: () => rally.anchors.map(a => ({ name: a.name, at: Math.round(a.at()), pos: a.pos(), r: Math.round(a.r()) })) };
