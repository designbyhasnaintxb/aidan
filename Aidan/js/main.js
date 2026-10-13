/* Bellingham Soccer Training — interactions
   Works without GSAP/Lenis (vendored in js/vendor); they only enhance. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = matchMedia('(min-width: 1024px)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  if (gsap && ST) gsap.registerPlugin(ST);

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const tween = (dur, fn, ease = easeOut) => new Promise(done => {
    if (reduced) { fn(1); return done(); }
    const t0 = performance.now();
    const step = now => {
      const t = clamp((now - t0) / dur, 0, 1);
      fn(ease(t));
      t < 1 ? requestAnimationFrame(step) : done();
    };
    requestAnimationFrame(step);
  });

  /* ---------- Smooth scroll (desktop, fine pointer only) ---------- */
  let lenis = null;
  if (window.Lenis && !reduced && finePointer) {
    lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
    if (gsap && ST) {
      lenis.on('scroll', ST.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const scrollToEl = el => {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -76 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToEl(target);
    history.replaceState(null, '', id);
  }));

  /* ---------- Nav ---------- */
  const nav = $('.nav');
  const toggle = $('.nav__toggle');
  const menu = $('#mobile-menu');
  function closeMenu() {
    if (!toggle || toggle.getAttribute('aria-expanded') !== 'true') return;
    toggle.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
  }
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    nav.classList.add('is-scrolled');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  let lastY = 0;
  const onScrollNav = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 24 || !menu.hidden);
    nav.classList.toggle('is-hidden', y > 600 && y > lastY + 4 && menu.hidden);
    if (y < lastY - 4) nav.classList.remove('is-hidden');
    lastY = y;
  };
  addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  const navLinks = $$('.nav__links a');
  const sectionObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => sectionObs.observe(s));

  /* ---------- Reveal ---------- */
  const revealTargets = $$('.sec-head, .about__lede, .about__intro .slot, .about__portrait, .timeline__item, .facts__item, .vid, .clip, .cred__card, .status, .contact__direct, .inq');
  revealTargets.forEach((el, i) => { el.setAttribute('data-reveal', ''); el.style.transitionDelay = (el.matches('.timeline__item, .cred__card, .clip, .facts__item') ? (i % 5) * 70 : 0) + 'ms'; });
  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      revealObs.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  revealTargets.forEach(el => revealObs.observe(el));

  /* ---------- Hero: title + player run ---------- */
  const heroRun = $('.hero__run');
  const heroPlayer = $('.hero__player');
  const heroNodes = $$('.hero__nodes g');
  const nodeAt = [0, 0.27, 0.55, 0.8, 1];
  const placePlayer = t => {
    if (!heroRun) return;
    const L = heroRun.getTotalLength();
    const p = heroRun.getPointAtLength(L * t);
    heroPlayer.setAttribute('transform', `translate(${p.x} ${p.y})`);
    heroPlayer.style.transform = 'none';
    heroRun.style.strokeDashoffset = String(1 - t);
    heroNodes.forEach((g, i) => g.classList.toggle('is-on', t >= nodeAt[i] - 0.01));
  };
  const heroIntro = () => {
    if (!heroRun) return;
    placePlayer(0);
    if (gsap && !reduced) {
      gsap.from('.hero__title .line > span', { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.12 });
      gsap.from('.eyebrow, .hero__lede, .hero__ctas', { y: 18, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.25 });
    }
    tween(2600, placePlayer, t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2).then(heroIdle);
  };
  // Hero micro-loop: the marker shifts into space and settles, every ~6s
  const heroIdle = () => {
    if (reduced) return;
    let back = false;
    setInterval(() => {
      if (document.hidden) return;
      const from = back ? 0.94 : 1, to = back ? 1 : 0.94;
      back = !back;
      tween(1400, t => placePlayer(from + (to - from) * t), t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    }, 6000);
  };
  heroIntro();

  /* ---------- Packages: selector (desktop) / accordion (mobile) ---------- */
  const pk = $('[data-pk]');
  const pkItems = $$('[data-pk-item]', pk);
  const countUp = (el, to) => {
    if (!el) return;
    const from = parseInt(el.dataset.shown || el.textContent, 10) || 0;
    el.dataset.shown = to;
    if (from === to) return void (el.textContent = to);
    tween(650, t => { el.textContent = Math.round(from + (to - from) * t); });
  };
  const setActive = (item, { focus = false } = {}) => {
    pkItems.forEach(it => {
      const on = it === item;
      it.classList.toggle('is-active', on);
      if (desktop.matches) {
        it.querySelector('.pk__head').setAttribute('aria-expanded', String(on));
        it.querySelector('.pk__panel').setAttribute('aria-hidden', String(!on));
        it.querySelector('.pk__panel').toggleAttribute('inert', !on);
      }
    });
    pk.dataset.active = item.dataset.stage;
    countUp(item.querySelector('[data-count]'), parseInt(item.dataset.price, 10));
    if (focus) item.querySelector('.pk__head').focus();
  };
  const setOpen = (item, open) => {
    item.classList.toggle('is-open', open);
    item.querySelector('.pk__head').setAttribute('aria-expanded', String(open));
    const panel = item.querySelector('.pk__panel');
    panel.removeAttribute('aria-hidden');
    panel.toggleAttribute('inert', !open);
  };
  const syncPkMode = () => {
    const active = pkItems.find(i => i.classList.contains('is-active')) || pkItems[0];
    if (desktop.matches) {
      pkItems.forEach(i => i.classList.remove('is-open'));
      setActive(active);
    } else {
      pkItems.forEach(i => setOpen(i, i === active));
    }
  };
  pkItems.forEach((item, idx) => {
    const head = item.querySelector('.pk__head');
    head.addEventListener('click', () => {
      if (desktop.matches) return setActive(item);
      const open = !item.classList.contains('is-open');
      setOpen(item, open);
      if (open) { pkItems.forEach(i => i.classList.toggle('is-active', i === item)); countUp(item.querySelector('[data-count]'), parseInt(item.dataset.price, 10)); }
    });
    head.addEventListener('keydown', e => {
      if (!desktop.matches || !['ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const next = pkItems[(idx + (e.key === 'ArrowDown' ? 1 : pkItems.length - 1)) % pkItems.length];
      setActive(next, { focus: true });
    });
    if (finePointer) head.addEventListener('mouseenter', () => { if (desktop.matches) setActive(item); });
  });
  if (pk) {
    pkItems.forEach(i => { const c = i.querySelector('[data-count]'); if (c) c.dataset.shown = c.textContent; });
    syncPkMode();
    desktop.addEventListener('change', syncPkMode);
  }

  /* ---------- Curriculum: one marker, five layers ---------- */
  const curr = $('[data-curr]');
  if (curr) {
    const cx = $('.cx', curr);
    const tabs = $$('.curr__tabs button', curr);
    const steps = $$('[data-curr-step]', curr);
    const count = $('.curr__count', curr);
    const caption = $('.cx-caption', curr);
    let stage = 0;
    const setStage = (n, fromScroll = false) => {
      n = clamp(n, 0, steps.length - 1);
      if (n === stage && cx.dataset.stage === String(n)) return;
      stage = n;
      cx.dataset.stage = n;
      // restart the mental-layer sequence each time it is entered
      if (n === 4) { const noise = $('.cx-noise', cx); noise.style.animation = 'none'; void noise.getBBox(); noise.style.animation = ''; }
      tabs.forEach((t, i) => t.setAttribute('aria-selected', String(i === n)));
      steps.forEach((s, i) => s.classList.toggle('is-active', i === n));
      if (count) count.textContent = `0${n + 1} / 0${steps.length}`;
      if (caption) caption.innerHTML = steps[n].dataset.caption;
      if (!fromScroll && desktop.matches) scrollToEl(steps[n]);
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => setStage(i)));
    $$('.curr__arrow', curr).forEach(b => b.addEventListener('click', () => setStage(stage + parseInt(b.dataset.step, 10))));
    // Desktop: scroll drives the stage. Mobile: step-through only (no pinning).
    const stepObs = new IntersectionObserver(entries => {
      if (!desktop.matches) return;
      entries.forEach(en => { if (en.isIntersecting) setStage(steps.indexOf(en.target), true); });
    }, { rootMargin: '-48% 0px -48% 0px' });
    steps.forEach(s => stepObs.observe(s));
    // Swipe on the pitch (mobile)
    let sx = null;
    const pitch = $('.curr__pitch', curr);
    pitch.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    pitch.addEventListener('touchend', e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) setStage(stage + (dx < 0 ? 1 : -1));
      sx = null;
    });
  }

  /* ---------- Media: video (only once real footage is configured) ---------- */
  const vid = $('.vid');
  const lb = $('#lightbox');
  if (vid) {
    new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { vid.classList.add('is-in'); o.disconnect(); } }, { threshold: 0.3 }).observe(vid);
    const { videoMp4: mp4, videoWebm: webm, videoEmbed: embed } = vid.dataset;
    const play = $('.vid__play', vid);
    if (mp4 || webm || embed) {
      play.disabled = false;
      play.addEventListener('click', () => {
        const body = $('.lb__body', lb);
        if (embed) {
          const src = embed + (embed.includes('?') ? '&' : '?') + 'autoplay=1&rel=0';
          body.innerHTML = `<iframe src="${src}" title="Bellingham Soccer Training video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
        } else {
          body.innerHTML = `<video controls autoplay playsinline preload="metadata">${webm ? `<source src="${webm}" type="video/webm">` : ''}${mp4 ? `<source src="${mp4}" type="video/mp4">` : ''}</video>`;
        }
        lb.showModal();
        lenis?.stop();
      });
    }
  }
  if (lb) {
    const closeLb = () => { $('.lb__body', lb).innerHTML = ''; if (lb.open) lb.close(); lenis?.start(); };
    $('.lb__close', lb).addEventListener('click', closeLb);
    lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
    lb.addEventListener('close', () => { $('.lb__body', lb).innerHTML = ''; lenis?.start(); });
  }
  // Any inline <video data-autoplay> clips: play only while visible
  const clipObs = new IntersectionObserver(entries => entries.forEach(en => {
    const v = en.target;
    if (en.isIntersecting && !reduced) v.play().catch(() => {}); else v.pause();
  }), { threshold: 0.25 });
  $$('video[data-autoplay]').forEach(v => { v.muted = true; v.playsInline = true; clipObs.observe(v); });

  /* ---------- Inquiry form ---------- */
  const form = $('#inquiry');
  if (form) {
    const stepsEls = $$('.inq__step', form);
    const labels = $$('.inq__steps li', form);
    const back = $('[data-inq="back"]', form);
    const next = $('[data-inq="next"]', form);
    const submit = $('[data-inq="submit"]', form);
    const progress = $('.inq__progress', form);
    const live = $('.inq__count', form);
    let cur = 0;

    // Keep form package names in sync with the package section (single source of truth)
    pkItems.forEach((item, i) => {
      const name = item.querySelector('.pk__name')?.textContent.trim();
      const isPlaceholder = !name || name === 'Package name';
      const label = isPlaceholder ? `Package 0${i + 1}` : name;
      const nameEl = $(`[data-pkg-name="${i + 1}"]`, form);
      const input = $(`input[data-pkg="${i + 1}"]`, form);
      if (nameEl) nameEl.textContent = label;
      if (input) input.value = `${label} ($${item.dataset.price})`;
    });

    const show = n => {
      cur = n;
      stepsEls.forEach((s, i) => { s.hidden = i !== n; s.classList.toggle('is-active', i === n); });
      labels.forEach((l, i) => { l.classList.toggle('is-current', i === n); l.classList.toggle('is-done', i < n); });
      progress.style.setProperty('--p', `${(n / (stepsEls.length - 1)) * 100}%`);
      back.hidden = n === 0;
      next.hidden = n === stepsEls.length - 1;
      submit.hidden = n !== stepsEls.length - 1;
      live.textContent = `Step ${n + 1} of ${stepsEls.length}`;
    };
    const valid = n => {
      const s = stepsEls[n];
      let ok = true;
      $$('input, select, textarea', s).forEach(f => {
        if (f.type === 'radio') return;
        const good = f.checkValidity() && (!f.required || f.value.trim() !== '');
        f.classList.toggle('is-invalid', !good);
        f.setAttribute('aria-invalid', String(!good));
        if (!good) ok = false;
      });
      if ($('input[type="radio"][required]', s) && !$('input[type="radio"]:checked', s)) ok = false;
      $('.inq__err', s).hidden = ok;
      if (!ok) ($('.is-invalid', s) || $('input', s))?.focus();
      return ok;
    };
    next.addEventListener('click', () => { if (valid(cur)) { show(cur + 1); $('input, select, textarea', stepsEls[cur])?.focus({ preventScroll: true }); } });
    back.addEventListener('click', () => show(cur - 1));
    $$('input[type="radio"]', form).forEach(r => r.addEventListener('change', () => { $('.inq__err', stepsEls[0]).hidden = true; }));
    form.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && cur < stepsEls.length - 1) { e.preventDefault(); next.click(); }
    });

    // "Ask about this package" preselects the package
    $$('[data-package]').forEach(btn => btn.addEventListener('click', () => {
      const r = $(`input[data-pkg="${btn.dataset.package}"]`, form);
      if (r) { r.checked = true; show(0); }
    }));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!valid(cur)) return;
      if (form.elements._gotcha?.value) return;
      const data = Object.fromEntries(new FormData(form).entries());
      delete data._gotcha;
      const endpoint = form.dataset.endpoint;
      submit.disabled = true;
      if (endpoint) {
        // Formspree / Netlify / any form backend that accepts JSON
        try {
          const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
          if (!res.ok) throw new Error(res.status);
          location.href = form.getAttribute('action') || 'thanks.html';
          return;
        } catch (err) { /* fall through to email */ }
      }
      // No backend configured: hand off to the visitor's email app with everything filled in
      const to = ($('[data-email]')?.textContent || '').trim();
      const body = [
        `Package: ${data.package || ''}`,
        `Player age: ${data.player_age || ''}`,
        `Experience: ${data.experience || ''}`,
        `Main goal: ${data.goal || ''}`,
        '',
        `Name: ${data.name || ''}`,
        `Email: ${data.email || ''}`,
        `Phone: ${data.phone || '(not given)'}`,
        '',
        data.message || ''
      ].join('\n');
      location.href = `mailto:${to}?subject=${encodeURIComponent('Training availability request: ' + (data.package || ''))}&body=${encodeURIComponent(body)}`;
      const done = $('.inq__done', form);
      done.hidden = false;
      done.focus();
      submit.disabled = false;
    });
    show(0);
  }

  /* ---------- Page-wide development path (desktop only) ---------- */
  const devSvg = $('.devpath');
  const mainEl = $('main');
  let devLUT = null;
  const buildDevpath = () => {
    if (!devSvg || reduced || !desktop.matches) { document.documentElement.classList.remove('has-devpath'); devLUT = null; return; }
    document.documentElement.classList.add('has-devpath');
    const mr = mainEl.getBoundingClientRect();
    const W = mainEl.clientWidth, H = mainEl.scrollHeight;
    devSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    devSvg.setAttribute('width', W); devSvg.setAttribute('height', H);
    // The rail runs in the left gutter so it never crosses content; one node per section anchor.
    const contentLeft = $('.wrap', mainEl).getBoundingClientRect().left + parseFloat(getComputedStyle($('.wrap', mainEl)).paddingLeft) - mr.left;
    if (contentLeft < 40) { document.documentElement.classList.remove('has-devpath'); devLUT = null; return; }
    const gx = contentLeft / 2, sway = Math.min(12, contentLeft / 6);
    const pts = $$('[data-path]').map((el, i) => {
      const r = el.getBoundingClientRect();
      return { x: gx + (i % 2 ? sway : -sway), y: r.top + r.height / 2 - mr.top };
    }).sort((a, b) => a.y - b.y);
    $$('.devpath__node', devSvg).forEach(n => n.remove());
    pts.forEach(p => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('class', 'devpath__node'); c.setAttribute('r', '4.5');
      c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
      devSvg.insertBefore(c, head);
    });
    if (pts.length < 2) return;
    let d = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dy = (b.y - a.y) * 0.5;
      d += ` C${a.x} ${a.y + dy} ${b.x} ${b.y - dy} ${b.x} ${b.y}`;
    }
    const base = $('.devpath__base', devSvg), draw = $('.devpath__draw', devSvg);
    base.setAttribute('d', d); draw.setAttribute('d', d);
    const L = draw.getTotalLength();
    draw.style.strokeDasharray = `${L}`;
    // y → length lookup (path is monotonic in y)
    const N = 600; devLUT = [];
    for (let i = 0; i <= N; i++) { const l = (L * i) / N; devLUT.push([draw.getPointAtLength(l).y, l]); }
    devLUT.L = L; devLUT.draw = draw;
    updateDevpath();
  };
  const head = $('.devpath__head', devSvg || document);
  const updateDevpath = () => {
    if (!devLUT) return;
    const mr = mainEl.getBoundingClientRect();
    const y = innerHeight * 0.6 - mr.top;
    let lo = 0, hi = devLUT.length - 1;
    if (y <= devLUT[0][0]) hi = 0;
    else if (y >= devLUT[hi][0]) lo = hi;
    else while (hi - lo > 1) { const mid = (lo + hi) >> 1; devLUT[mid][0] < y ? lo = mid : hi = mid; }
    const l = devLUT[hi][1];
    devLUT.draw.style.strokeDashoffset = String(devLUT.L - l);
    const p = devLUT.draw.getPointAtLength(l);
    head.setAttribute('cx', p.x); head.setAttribute('cy', p.y);
    $$('.devpath__node', devSvg).forEach(n => n.classList.toggle('is-on', +n.getAttribute('cy') <= p.y + 1));
  };
  addEventListener('scroll', () => requestAnimationFrame(updateDevpath), { passive: true });
  let rT;
  addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(buildDevpath, 200); });
  addEventListener('load', buildDevpath);
  document.fonts?.ready.then(buildDevpath);

  /* ---------- Magnetic CTAs (desktop pointer only) ---------- */
  if (finePointer && !reduced) {
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) * 0.18, dy = (e.clientY - r.top - r.height / 2) * 0.28;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Content check (unverified slots) ---------- */
  const audit = $('.audit');
  const verifyCount = new Set($$('[data-verify]').map(el => el.dataset.verify)).size;
  if (audit) {
    $('[data-verify-count]', audit).textContent = verifyCount;
    if (!verifyCount) audit.remove();
    if (new URLSearchParams(location.search).has('audit')) { document.documentElement.classList.add('is-audit'); audit.setAttribute('aria-pressed', 'true'); }
    audit.addEventListener('click', () => {
      const on = document.documentElement.classList.toggle('is-audit');
      audit.setAttribute('aria-pressed', String(on));
    });
  }

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
