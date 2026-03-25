/**
 * GROFIT — Frontend Script v2
 * Worker API | Before/After | FAQ | Scroll Reveal | Sticky CTA
 *
 * CONFIGURE:
 *   WORKER_URL — your Cloudflare Worker URL
 */

'use strict';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const WORKER_URL = 'https://grofit-worker.YOUR_SUBDOMAIN.workers.dev';
const TOKEN_KEY  = 'grofit_token';
const EMAIL_KEY  = 'grofit_email';
const TOKEN_EXP  = 'grofit_token_exp';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const q = sel => document.querySelector(sel);
const qa = sel => [...document.querySelectorAll(sel)];

function setToken(token, exp, email) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXP, exp.toString());
  localStorage.setItem(EMAIL_KEY, email);
}

function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  const exp   = parseInt(localStorage.getItem(TOKEN_EXP) || '0', 10);
  const email = localStorage.getItem(EMAIL_KEY) || '';
  if (!token || Date.now() > exp) return null;
  return { token, exp, email };
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXP);
  localStorage.removeItem(EMAIL_KEY);
}

// ─── ACCESS GATE ─────────────────────────────────────────────────────────────
function initAccessGate() {
  const form      = $('access-form');
  if (!form) return;

  const emailInput = $('access-email');
  const submitBtn  = $('access-submit');
  const errorEl    = $('access-error');
  const warnEl     = $('access-warn');
  const dotsWrap   = $('attempt-dots');

  let failCount = 0;

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.add('show');
    warnEl && warnEl.classList.remove('show');
  }

  function showWarn(msg) {
    if (!warnEl) return;
    warnEl.textContent = msg;
    warnEl.classList.add('show');
    errorEl && errorEl.classList.remove('show');
  }

  function updateDots(used) {
    if (!dotsWrap) return;
    qa('.attempt-dot', dotsWrap).forEach((dot, i) => {
      dot.classList.toggle('used', i < used);
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    if (!email) { showError('Enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('Enter a valid email address.'); return; }

    // Reset UI
    errorEl && errorEl.classList.remove('show');
    warnEl  && warnEl.classList.remove('show');
    emailInput.classList.remove('error');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking...';

    try {
      const res  = await fetch(`${WORKER_URL}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setToken(data.token, data.exp, data.email);
        submitBtn.textContent = 'Access granted — redirecting...';
        window.location.href = '/download.html';
        return;
      }

      // Failed
      failCount++;
      emailInput.classList.add('error');
      updateDots(failCount);

      if (data.error === 'too_many_attempts' || data.blocked) {
        showError(data.message || 'Too many failed attempts. Try again later.');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Locked';
        return;
      }

      if (data.showCaptcha) {
        showWarn('Multiple failed attempts detected. Double-check your email and try again.');
      }

      const left = data.attemptsLeft;
      showError(data.message || 'Email not recognised. Use the email you purchased with.');
      if (left !== undefined && left > 0) {
        const extra = document.createElement('small');
        extra.style.cssText = 'display:block;margin-top:6px;opacity:0.7;';
        extra.textContent = `${left} attempt${left !== 1 ? 's' : ''} remaining before lockout.`;
        errorEl.appendChild(extra);
      }

    } catch (err) {
      showError('Connection failed. Check your internet and try again.');
    } finally {
      if (!submitBtn.disabled) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Access My Bundle';
      }
    }
  });
}

// ─── DOWNLOAD GUARD ──────────────────────────────────────────────────────────
async function initDownloadGuard() {
  if (!document.body.classList.contains('page-download')) return;

  const session = getToken();
  if (!session) {
    window.location.href = '/access.html';
    return;
  }

  // Validate token with Worker
  try {
    const res  = await fetch(`${WORKER_URL}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: session.token }),
    });
    const data = await res.json();

    if (!data.valid) {
      clearToken();
      window.location.href = '/access.html';
      return;
    }

    // Show email
    const el = $('user-email');
    if (el) el.textContent = session.email;

  } catch {
    // Network issue — allow if local token looks valid (fallback)
    const el = $('user-email');
    if (el) el.textContent = session.email;
  }
}

// ─── BEFORE / AFTER SLIDER ───────────────────────────────────────────────────
function initBASlider() {
  qa('.ba-wrapper').forEach(wrapper => {
    const afterImg = wrapper.querySelector('.ba-img.after');
    const handle   = wrapper.querySelector('.ba-handle');
    if (!afterImg || !handle) return;

    let dragging = false;

    function setPos(x) {
      const rect = wrapper.getBoundingClientRect();
      const pct  = Math.min(100, Math.max(0, ((x - rect.left) / rect.width) * 100));
      afterImg.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      handle.style.left = `${pct}%`;
    }

    wrapper.addEventListener('mousedown', e => { dragging = true; setPos(e.clientX); });
    wrapper.addEventListener('touchstart', e => { dragging = true; setPos(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('mousemove',   e => { if (dragging) setPos(e.clientX); });
    window.addEventListener('touchmove',   e => { if (dragging) setPos(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('mouseup',     () => { dragging = false; });
    window.addEventListener('touchend',    () => { dragging = false; });

    // Initial position = 50%
    setPos(wrapper.getBoundingClientRect().left + wrapper.offsetWidth * 0.5);
  });
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function initFAQ() {
  qa('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq-item');
      const isOpen = item.classList.contains('active');

      qa('.faq-item.active').forEach(el => {
        el.classList.remove('active');
        const icon = el.querySelector('.faq-icon svg');
        if (icon) icon.style.transform = '';
      });

      if (!isOpen) item.classList.add('active');
    });
  });
}

// ─── SCROLL REVEAL ───────────────────────────────────────────────────────────
function initReveal() {
  const els = qa('.reveal');
  if (!els.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

  els.forEach(el => obs.observe(el));
}

// ─── COUNTER ANIMATION ───────────────────────────────────────────────────────
function initCounters() {
  qa('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dec    = el.dataset.dec ? parseInt(el.dataset.dec, 10) : 0;
    const dur    = 1600;
    let start    = null;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        obs.unobserve(el);

        function step(ts) {
          if (!start) start = ts;
          const prog  = Math.min((ts - start) / dur, 1);
          const ease  = 1 - Math.pow(1 - prog, 3);
          const value = ease * target;
          el.textContent = (dec > 0 ? value.toFixed(dec) : Math.floor(value)).toLocaleString() + suffix;
          if (prog < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });

    obs.observe(el);
  });
}

// ─── STICKY BAR ──────────────────────────────────────────────────────────────
function initStickyBar() {
  const bar  = $('sticky-bar');
  const hero = q('.hero');
  if (!bar || !hero) return;

  new IntersectionObserver(entries => {
    bar.classList.toggle('show', !entries[0].isIntersecting);
  }, { threshold: 0 }).observe(hero);
}

// ─── UPI MODAL ───────────────────────────────────────────────────────────────
function initModal() {
  const overlay = $('upi-modal');
  if (!overlay) return;

  const open  = $('open-upi');
  const close = $('close-upi');

  if (open)  open.addEventListener('click',  () => overlay.classList.add('open'));
  if (close) close.addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('open'); });
}

// ─── PIXEL HELPER ────────────────────────────────────────────────────────────
function track(event, params) {
  if (typeof fbq !== 'undefined') fbq('track', event, params || {});
}

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initCounters();
  initFAQ();
  initBASlider();
  initStickyBar();
  initModal();
  initAccessGate();
  initDownloadGuard();

  const page = document.body.dataset.page;
  if (page === 'landing')  track('ViewContent', { content_name: 'Landing Page' });
  if (page === 'thankyou') track('Purchase', { value: 47, currency: 'USD' });
  if (page === 'access')   track('Lead');
});
