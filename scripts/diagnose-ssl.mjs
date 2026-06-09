#!/usr/bin/env node
/**
 * SSL/TLS + DNS health probe for favorikozmetik.com (Vercel + Cloudflare DNS).
 *
 * Why this exists:
 * The apex domain resolves to several Vercel anycast IPs. Most of the time every IP
 * completes the TLS handshake, but occasionally one anycast edge/path fails the
 * handshake. Chrome/Android retry silently; Safari/iOS surface it as
 * "cannot establish a secure connection". Because the failure is INTERMITTENT, a
 * one-shot check is not enough — this script probes every candidate IP repeatedly
 * so you can (a) catch a failure in the act and (b) confirm when the fix is stable.
 *
 * Usage:
 *   node scripts/diagnose-ssl.mjs [rounds] [delayMs]
 *   npm run diagnose:ssl -- 30 1000
 *
 * Env overrides:
 *   HOST=example.com  EXTRA_IPS=1.2.3.4,5.6.7.8  node scripts/diagnose-ssl.mjs
 *
 * Exit code is non-zero if ANY probe failed the handshake or returned an untrusted
 * cert, so it can be used in monitoring/CI.
 */
import tls from 'node:tls';
import { resolve4, resolveCname } from 'node:dns/promises';

const HOST = process.env.HOST || 'favorikozmetik.com';
const ROUNDS = Number(process.argv[2] || process.env.ROUNDS || 15);
const DELAY_MS = Number(process.argv[3] || process.env.DELAY_MS || 800);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 10000);

// Known Vercel anycast IPs observed for this apex; probed every round in addition
// to whatever DNS currently returns, so a "bad" IP is tested even when DNS hides it.
const SEED_IPS = (process.env.EXTRA_IPS || '216.198.79.1,216.198.79.65,64.29.17.1,64.29.17.65')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const C = {
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  bad: (s) => `\x1b[31m${s}\x1b[0m`,
  warn: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[90m${s}\x1b[0m`,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function probe(ip) {
  return new Promise((resolve) => {
    const start = Date.now();
    let settled = false;
    const done = (res) => {
      if (settled) return;
      settled = true;
      resolve({ ip, ms: Date.now() - start, ...res });
    };
    // rejectUnauthorized:false lets us distinguish a hard handshake failure (error event)
    // from a completed handshake with an untrusted cert (authorized === false).
    const socket = tls.connect(
      {
        host: ip,
        port: 443,
        servername: HOST,
        timeout: TIMEOUT_MS,
        rejectUnauthorized: false,
        ALPNProtocols: ['h2', 'http/1.1'],
        minVersion: 'TLSv1.2',
      },
      () => {
        const cert = socket.getPeerCertificate();
        done({
          ok: true,
          authorized: socket.authorized,
          authError: socket.authorizationError ? String(socket.authorizationError) : null,
          protocol: socket.getProtocol(),
          cipher: socket.getCipher()?.name,
          alpn: socket.alpnProtocol || null,
          certCN: cert?.subject?.CN || null,
          issuerCN: cert?.issuer?.CN || null,
          validTo: cert?.valid_to || null,
        });
        socket.end();
      }
    );
    socket.on('timeout', () => {
      socket.destroy();
      done({ ok: false, error: 'TIMEOUT' });
    });
    socket.on('error', (e) => done({ ok: false, error: e.code || e.message }));
  });
}

async function currentDns() {
  const out = { a: [], cname: null };
  try {
    out.a = await resolve4(HOST);
  } catch (e) {
    out.aError = e.code || e.message;
  }
  try {
    out.cname = await resolveCname(`www.${HOST}`);
  } catch {
    /* www may be flattened or absent; ignore */
  }
  return out;
}

function fmt(r) {
  if (!r.ok) return C.bad(`FAIL ${r.error} (${r.ms}ms)`);
  if (!r.authorized) return C.warn(`HANDSHAKE-OK but UNTRUSTED: ${r.authError} (${r.ms}ms)`);
  return C.ok(
    `OK ${r.protocol}/${r.cipher} alpn=${r.alpn} cn=${r.certCN} issuer=${r.issuerCN} (${r.ms}ms)`
  );
}

(async () => {
  console.log(C.dim(`\nProbing ${HOST} — ${ROUNDS} round(s), ${DELAY_MS}ms apart, ${TIMEOUT_MS}ms timeout`));
  console.log(C.dim(`Seed IPs: ${SEED_IPS.join(', ')}\n`));

  const stats = new Map(); // ip -> { ok, fail, untrusted }
  const tally = (ip, r) => {
    const s = stats.get(ip) || { ok: 0, fail: 0, untrusted: 0 };
    if (!r.ok) s.fail++;
    else if (!r.authorized) s.untrusted++;
    else s.ok++;
    stats.set(ip, s);
  };

  for (let round = 1; round <= ROUNDS; round++) {
    const dns = await currentDns();
    const ips = [...new Set([...dns.a, ...SEED_IPS])];
    const dnsLabel = dns.aError ? C.bad(`A-lookup FAIL: ${dns.aError}`) : `A=[${dns.a.join(', ')}]`;
    console.log(`Round ${round}/${ROUNDS}  ${dnsLabel}  www→${dns.cname?.[0] || 'n/a'}`);

    const results = await Promise.all(ips.map(probe));
    for (const r of results) {
      tally(r.ip, r);
      const liveTag = dns.a.includes(r.ip) ? '' : C.dim(' (not in current DNS)');
      console.log(`   ${r.ip.padEnd(15)} ${fmt(r)}${liveTag}`);
    }
    if (round < ROUNDS) await sleep(DELAY_MS);
  }

  console.log(C.dim('\n──────── Summary ────────'));
  let anyProblem = false;
  for (const [ip, s] of stats) {
    const problem = s.fail > 0 || s.untrusted > 0;
    if (problem) anyProblem = true;
    const line = `${ip.padEnd(15)} ok=${s.ok} fail=${s.fail} untrusted=${s.untrusted}`;
    console.log(problem ? C.bad(line) : C.ok(line));
  }
  console.log('');
  if (anyProblem) {
    console.log(C.bad('At least one IP failed the handshake or served an untrusted cert.'));
    console.log(C.dim('This reproduces the Safari "secure connection" error. Note the failing IP/round above.'));
    process.exit(1);
  }
  console.log(C.ok('All probes completed a trusted TLS handshake across all rounds.'));
})();
