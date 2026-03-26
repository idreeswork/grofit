/**
 * Cloudflare Pages Function — /api/verify
 * POST { token } → validates token → { valid, email }
 *
 * Also handles /api/verify?action=add for adding buyer emails
 * POST { email, key: ADMIN_KEY } → adds email to KV
 */

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestPost(ctx) {
  const { request, env, params } = ctx;
  const url = new URL(request.url);

  // Admin: add email
  if (url.searchParams.get('action') === 'add') {
    return addEmail(request, env);
  }

  // Admin: remove email
  if (url.searchParams.get('action') === 'remove') {
    return removeEmail(request, env);
  }

  // Default: verify token
  return verifyToken(request, env);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }});
}

async function verifyToken(request, env) {
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ valid: false }), { status: 400, headers: CORS });
  }

  const token = body?.token || '';
  if (!token) return new Response(JSON.stringify({ valid: false, reason: 'no_token' }), { status: 400, headers: CORS });

  const result = await verify(token, env.TOKEN_SECRET || 'dev-secret-change-me');
  return new Response(JSON.stringify(result), { status: result.valid ? 200 : 401, headers: CORS });
}

async function addEmail(request, env) {
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400, headers: CORS });
  }

  if (body.key !== (env.ADMIN_KEY || '')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) return new Response(JSON.stringify({ error: 'Email required' }), { status: 400, headers: CORS });

  try {
    await env.EMAILS_KV.put(email, JSON.stringify({ added: new Date().toISOString() }));
    return new Response(JSON.stringify({ ok: true, email }), { status: 200, headers: CORS });
  } catch {
    return new Response(JSON.stringify({ error: 'KV write failed' }), { status: 500, headers: CORS });
  }
}

async function removeEmail(request, env) {
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400, headers: CORS });
  }
  if (body.key !== (env.ADMIN_KEY || '')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }
  const email = (body.email || '').trim().toLowerCase();
  try {
    await env.EMAILS_KV.delete(email);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS });
  } catch {
    return new Response(JSON.stringify({ error: 'KV delete failed' }), { status: 500, headers: CORS });
  }
}

/* ── Token verify ──────────────────────────────────────── */
async function verify(token, secret) {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return { valid: false, reason: 'malformed' };

  const expected = await hmac(payload, secret);
  if (!safeEq(sig, expected)) return { valid: false, reason: 'invalid_signature' };

  try {
    const d = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (Date.now() > d.exp) return { valid: false, reason: 'expired' };
    return { valid: true, email: d.sub, exp: d.exp };
  } catch {
    return { valid: false, reason: 'parse_error' };
  }
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

function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
