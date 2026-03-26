'use strict';

/* ── CONFIG — update after deploying Pages ─────────────── */
// This is your Cloudflare Pages URL. The /api/ path is handled
// by the /functions/api/ Pages Functions — no separate Worker needed.
const API = ''; // leave empty — /api/auth and /api/verify are relative paths

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  fixImages();
  faq();
  reveal();
  counters();
  stickyCTA();
  beforeAfter();
  payTabs();
  accessGate();
  dlGuard();
  smoothScroll();
});

/* ── IMAGE FALLBACKS ─────────────────────────────────────── */
function fixImages() {
  // img-slot: add .no-img to parent if image 404s
  document.querySelectorAll('.img-slot img, .hero-img img').forEach(img => {
    const slot = img.closest('.img-slot, .hero-img');
    img.addEventListener('error', () => slot && slot.classList.add('no-img'));
    if (img.complete && !img.naturalWidth) img.dispatchEvent(new Event('error'));
  });

  // template cards
  document.querySelectorAll('.tc .tc-img').forEach(img => {
    const card = img.closest('.tc');
    img.addEventListener('error', () => {
      if (card) { card.classList.add('tc-fallback'); img.style.display = 'none'; }
    });
    if (img.complete && !img.naturalWidth) img.dispatchEvent(new Event('error'));
  });
}

/* ── FAQ ─────────────────────────────────────────────────── */
function faq() {
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq');
      const open = item.classList.contains('open');
      document.querySelectorAll('.faq.open').forEach(el => el.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });
}

/* ── SCROLL REVEAL ───────────────────────────────────────── */
function reveal() {
  const els = document.querySelectorAll('.r');
  if (!els.length) return;
  const obs = new IntersectionObserver(
    es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } }),
    { threshold: 0.07, rootMargin: '0px 0px -24px 0px' }
  );
  els.forEach(el => obs.observe(el));
}

/* ── COUNTERS ────────────────────────────────────────────── */
function counters() {
  const els = document.querySelectorAll('[data-n]');
  if (!els.length) return;
  const obs = new IntersectionObserver(
    es => es.forEach(e => { if (e.isIntersecting) { count(e.target); obs.unobserve(e.target); } }),
    { threshold: 0.5 }
  );
  els.forEach(el => obs.observe(el));
}

function count(el) {
  const target = parseInt(el.dataset.n, 10);
  const sfx = el.dataset.sfx || '';
  const dur = 1500;
  const s = performance.now();
  (function tick(now) {
    const p = Math.min((now - s) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(ease * target).toLocaleString() + sfx;
    if (p < 1) requestAnimationFrame(tick);
  })(s);
}

/* ── STICKY CTA ──────────────────────────────────────────── */
function stickyCTA() {
  const bar = document.getElementById('sbar');
  const hero = document.querySelector('[data-hero]');
  if (!bar || !hero) return;
  new IntersectionObserver(
    ([e]) => bar.classList.toggle('show', !e.isIntersecting),
    { threshold: 0 }
  ).observe(hero);
}

/* ── BEFORE / AFTER SLIDER ───────────────────────────────── */
function beforeAfter() {
  const wrap = document.querySelector('.ba-wrap');
  if (!wrap) return;
  const after = wrap.querySelector('.ba-after');
  const div = wrap.querySelector('.ba-divider');
  const hdl = wrap.querySelector('.ba-handle');
  let drag = false;

  function setPos(x) {
    const r = wrap.getBoundingClientRect();
    let p = ((x - r.left) / r.width) * 100;
    p = Math.max(4, Math.min(96, p));
    after.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
    div.style.left = `${p}%`;
    hdl.style.left = `${p}%`;
  }

  wrap.addEventListener('mousedown', e => { drag = true; setPos(e.clientX); });
  document.addEventListener('mousemove', e => { if (drag) setPos(e.clientX); });
  document.addEventListener('mouseup', () => { drag = false; });
  wrap.addEventListener('touchstart', e => { drag = true; setPos(e.touches[0].clientX); }, { passive: true });
  document.addEventListener('touchmove', e => { if (drag) setPos(e.touches[0].clientX); }, { passive: true });
  document.addEventListener('touchend', () => { drag = false; });

  // Hint animation
  setTimeout(() => {
    const steps = [30, 70, 50], dur = 500;
    let i = 0;
    const t = setInterval(() => {
      if (i >= steps.length) { clearInterval(t); [after, div, hdl].forEach(el => el.style.transition = ''); return; }
      [after, div, hdl].forEach(el => el.style.transition = `all ${dur}ms ease`);
      const p = steps[i++];
      after.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
      div.style.left = `${p}%`;
      hdl.style.left = `${p}%`;
    }, dur + 100);
  }, 1400);
}

/* ── PAYMENT TABS ────────────────────────────────────────── */
function payTabs() {
  document.querySelectorAll('.pay-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.panel;
      document.querySelectorAll('.pay-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.pay-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(id);
      if (panel) panel.classList.add('active');
    });
  });
}

/* ── SMOOTH SCROLL ───────────────────────────────────────── */
function smoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ── ACCESS GATE ─────────────────────────────────────────── */
function accessGate() {
  const form = document.getElementById('ac-form');
  if (!form) return;

  const emailEl = document.getElementById('ac-email');
  const errEl   = document.getElementById('ac-err');
  const expEl   = document.getElementById('ac-exp');
  const submitEl = document.getElementById('ac-submit');

  if (window.location.search.includes('expired=1') && expEl) expEl.classList.add('show');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = emailEl.value.trim().toLowerCase();
    if (!email) return;

    errEl.classList.remove('show');
    submitEl.disabled = true;
    submitEl.textContent = 'Verifying...';

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.ok && data.token) {
        localStorage.setItem('gf_tok', data.token);
        localStorage.setItem('gf_em', email);
        window.location.href = '/download.html';
      } else {
        errEl.textContent = data.error || 'Email not found. Use the email you purchased with.';
        errEl.classList.add('show');
        submitEl.disabled = false;
        submitEl.textContent = 'Access My Bundle';
      }
    } catch {
      errEl.textContent = 'Connection error — please try again.';
      errEl.classList.add('show');
      submitEl.disabled = false;
      submitEl.textContent = 'Access My Bundle';
    }
  });
}

/* ── DOWNLOAD GUARD ──────────────────────────────────────── */
async function dlGuard() {
  if (!document.body.classList.contains('p-dl')) return;

  const tok = localStorage.getItem('gf_tok');
  if (!tok) { window.location.href = '/access.html'; return; }

  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tok }),
    });
    const data = await res.json();

    if (!data.valid) {
      localStorage.removeItem('gf_tok');
      localStorage.removeItem('gf_em');
      window.location.href = '/access.html' + (data.reason === 'expired' ? '?expired=1' : '');
      return;
    }

    const emEl = document.getElementById('dl-email');
    if (emEl) emEl.textContent = data.email || localStorage.getItem('gf_em') || '';

  } catch {
    // Worker down — allow access if token present (graceful fallback)
    const emEl = document.getElementById('dl-email');
    if (emEl) emEl.textContent = localStorage.getItem('gf_em') || '';
  }
}

/* ── PIXEL ───────────────────────────────────────────────── */
function px(n, p) { if (typeof fbq !== 'undefined') fbq('track', n, p || {}); }
