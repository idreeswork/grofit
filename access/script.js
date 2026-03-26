/* ============================================
   GROFIT — JAVASCRIPT
   Access Gate | FAQ | Scroll Animations | UX
   ============================================ */

'use strict';

/* ===== FAQ ACCORDION ===== */
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.faq-icon').textContent = '+';
      });

      // Open clicked if was closed
      if (!isOpen) {
        item.classList.add('open');
        item.querySelector('.faq-icon').textContent = '×';
      }
    });
  });
}

/* ===== SCROLL REVEAL ===== */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  els.forEach(el => observer.observe(el));
}

/* ===== STICKY CTA BAR ===== */
function initStickyCTA() {
  const bar = document.getElementById('sticky-cta');
  if (!bar) return;

  const hero = document.querySelector('.hero');
  if (!hero) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          bar.classList.add('visible');
        } else {
          bar.classList.remove('visible');
        }
      });
    },
    { threshold: 0 }
  );

  observer.observe(hero);
}

/* ===== SMOOTH SCROLL ===== */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ===== STAT COUNTER ANIMATION ===== */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const start = performance.now();

  function update(now) {
    const elapsed = Math.min(now - start, duration);
    const progress = elapsed / duration;
    // Ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(ease * target);
    el.textContent = current.toLocaleString() + suffix;
    if (elapsed < duration) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

function initCounters() {
  const counters = document.querySelectorAll('[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(el => observer.observe(el));
}

/* ===== ACCESS GATE ===== */
async function initAccessGate() {
  const form = document.getElementById('access-form');
  if (!form) return;

  const emailInput = document.getElementById('access-email');
  const errorEl = document.getElementById('access-error');
  const loadingEl = document.getElementById('access-loading');
  const submitBtn = document.getElementById('access-submit');

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    if (!email) return;

    // Show loading
    loadingEl.style.display = 'block';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking...';
    errorEl.classList.remove('show');

    try {
      const response = await fetch('/assets/data.json');
      const data = await response.json();

      const allowed = data.emails.map(e => e.trim().toLowerCase());

      if (allowed.includes(email)) {
        // Store access token in sessionStorage
        const token = btoa(email + ':grofit-access-' + new Date().toDateString());
        sessionStorage.setItem('grofit_access', token);
        sessionStorage.setItem('grofit_email', email);
        window.location.href = '/download.html';
      } else {
        errorEl.textContent = 'Email not found. Please use the email you purchased with. Contact support if you need help.';
        errorEl.classList.add('show');
        loadingEl.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Access My Bundle →';
      }
    } catch (err) {
      errorEl.textContent = 'Something went wrong. Please try again or contact support.';
      errorEl.classList.add('show');
      loadingEl.style.display = 'none';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Access My Bundle →';
    }
  });
}

/* ===== DOWNLOAD PAGE GUARD ===== */
function initDownloadGuard() {
  const isDownloadPage = document.body.classList.contains('page-download');
  if (!isDownloadPage) return;

  const token = sessionStorage.getItem('grofit_access');
  if (!token) {
    window.location.href = '/access.html';
    return;
  }

  // Show email in welcome
  const emailDisplay = document.getElementById('user-email');
  if (emailDisplay) {
    const email = sessionStorage.getItem('grofit_email') || '';
    emailDisplay.textContent = email;
  }
}

/* ===== META PIXEL HELPER ===== */
function trackEvent(eventName, params) {
  if (typeof fbq !== 'undefined') {
    fbq('track', eventName, params || {});
  }
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  initFAQ();
  initScrollReveal();
  initStickyCTA();
  initSmoothScroll();
  initCounters();
  initAccessGate();
  initDownloadGuard();

  // Track page views
  const page = document.body.dataset.page;
  if (page === 'landing') trackEvent('ViewContent', { content_name: 'Landing Page' });
  if (page === 'thankyou') trackEvent('Purchase', { value: 47, currency: 'USD' });
  if (page === 'access') trackEvent('Lead', { content_name: 'Access Gate' });
});
