/**
 * Cloudflare Pages Function — /api/auth
 * POST { email } → validates against KV → returns signed token
 *
 * KV binding required: EMAILS_KV
 * Environment vars:    TOKEN_SECRET, ADMIN_KEY
 */

const TTL    = 3 * 60 * 60 * 1000; // 3 hours
const MAXF   = 8;                   // max fails before block
const BLKS   = 3600;                // block duration seconds

export async function onRequestPost(ctx) {
  const { request, env } = ctx;
  const ip = request.headers.get('CF-Connecting-IP') || 'x';
  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Rate limit check
  const rk = `rate:${ip}`;
  let rate = null;
  try { rate = await env.EMAILS_KV.get(rk, 'json'); } catch {}

  if (rate && rate.f >= MAXF && rate.until > Date.now()) {
    const mins = Math.ceil((rate.until - Date.now()) / 60000);
    return new Response(JSON.stringify({ error: `Too many attempts. Try again in ${mins} min.`, blocked: true }), { status: 429, headers: cors });
  }

  // Parse body
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid request.' }), { status: 400, headers: cors });
  }

  const email = (body?.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Enter a valid email.' }), { status: 400, headers: cors });
  }

  // Check whitelist
  let granted = null;
  try { granted = await env.EMAILS_KV.get(email); } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable. Try again shortly.' }), { status: 503, headers: cors });
  }

  if (!granted) {
    const cur = rate || { f: 0, until: 0 };
    const nf = cur.f + 1;
    const ttl = nf >= MAXF ? BLKS : 7200;
    try {
      await env.EMAILS_KV.put(rk, JSON.stringify({ f: nf, until: Date.now() + ttl * 1000 }), { expirationTtl: ttl });
    } catch {}
    const left = MAXF - nf;
    const msg = left <= 0
      ? 'Access denied. IP temporarily blocked.'
      : `Email not found. ${left} attempt(s) left before temporary block.`;
    return new Response(JSON.stringify({ error: msg }), { status: 403, headers: cors });
  }

  // Clear rate limit on success
  try { await env.EMAILS_KV.delete(rk); } catch {}

  const token = await sign(email, env.TOKEN_SECRET || 'dev-secret-change-me');
  return new Response(JSON.stringify({ ok: true, token }), { status: 200, headers: cors });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }});
}

/* ── Token helpers ─────────────────────────────────────── */
async function sign(email, secret) {
  const payload = b64u(JSON.stringify({ sub: email, iat: Date.now(), exp: Date.now() + TTL }));
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}

async function hmac(data, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64u(String.fromCharCode(...new Uint8Array(sig)));
}

function b64u(s) {
  return btoa(typeof s === 'string' ? s : String.fromCharCode(...new Uint8Array(s)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
