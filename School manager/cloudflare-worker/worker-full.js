// ===== Cloudflare Worker — SchoolManager Admin Dashboard + Generator (SÉCURISÉ) =====

const SESSION_DURATION = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;

async function hashPassword(pwd) {
  const data = new TextEncoder().encode(pwd);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSign(data, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSession(request, secret) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/sm_session=([^;]+)/);
  if (!match) return null;
  const parts = match[1].split('.');
  if (parts.length !== 2) return null;
  const expectedSig = await hmacSign(parts[0], secret);
  if (parts[1] !== expectedSig) return null;
  try {
    const data = JSON.parse(atob(parts[0]));
    if (data.exp < Date.now()) return null;
    return data;
  } catch { return null; }
}

function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkRateLimit(ip, env) {
  if (!env.RATE_LIMIT_KV) return true;
  const key = `rl:${ip}`;
  const data = await env.RATE_LIMIT_KV.get(key, 'json');
  const now = Date.now();
  if (!data || now > data.resetAt) {
    await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: 1, resetAt: now + RATE_LIMIT_WINDOW }), { expirationTtl: Math.ceil(RATE_LIMIT_WINDOW / 1000) + 60 });
    return true;
  }
  if (data.count >= MAX_ATTEMPTS) return false;
  data.count++;
  await env.RATE_LIMIT_KV.put(key, JSON.stringify(data), { expirationTtl: Math.ceil((data.resetAt - now) / 1000) + 60 });
  return true;
}

// ===== CSS COMMON =====
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0e1a;--bg2:#111827;--card:#1a1f35;--card2:#232940;--card3:#2a3150;--primary:#6366f1;--primary2:#818cf8;--accent:#06b6d4;--accent2:#22d3ee;--success:#10b981;--success2:#34d399;--danger:#ef4444;--warning:#f59e0b;--text:#f1f5f9;--text2:#94a3b8;--text3:#64748b;--border:rgba(255,255,255,.06);--glow:rgba(99,102,241,.15)}
body{font-family:'Inter','Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(99,102,241,.2)}50%{box-shadow:0 0 40px rgba(99,102,241,.4)}}
@keyframes countUp{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
@keyframes ripple{0%{transform:scale(0);opacity:.6}100%{transform:scale(4);opacity:0}}
@keyframes gradientMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
.gradient-bg{background:linear-gradient(-45deg,#0a0e1a,#1a1f35,#111827,#232940);background-size:400% 400%;animation:gradientMove 15s ease infinite}
.card{background:var(--card);border-radius:20px;padding:24px;border:1px solid var(--border);transition:all .3s}
.card:hover{border-color:var(--primary);box-shadow:0 8px 40px var(--glow)}
.btn{padding:14px 28px;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;transition:all .3s;position:relative;overflow:hidden}
.btn::after{content:'';position:absolute;width:100%;height:100%;top:0;left:0;background:radial-gradient(circle,rgba(255,255,255,.2) 0%,transparent 70%);transform:scale(0);transition:transform .5s}
.btn:active{transform:scale(.97)}
.btn:active::after{transform:scale(4);transition:transform 0s}
.btn-primary{background:linear-gradient(135deg,var(--primary),var(--primary2));color:#fff;box-shadow:0 4px 20px rgba(99,102,241,.3)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(99,102,241,.4)}
.btn-success{background:linear-gradient(135deg,var(--success),var(--success2));color:#fff}
.btn-danger{background:var(--danger);color:#fff}
.btn-outline{background:transparent;border:2px solid var(--primary);color:var(--primary)}
.btn-ghost{background:rgba(255,255,255,.05);color:var(--text);border:1px solid var(--border)}
.btn-ghost:hover{background:rgba(255,255,255,.1)}
input,select,textarea{width:100%;padding:14px;border:2px solid var(--border);border-radius:12px;background:var(--bg2);color:var(--text);font-size:15px;transition:all .3s;font-family:inherit}
input:focus,select:focus,textarea:focus{border-color:var(--primary);outline:none;box-shadow:0 0 0 4px rgba(99,102,241,.1)}
label{display:block;font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:1.5px}
.toast{position:fixed;bottom:100px;left:50%;transform:translateX(-50%) translateY(100px);padding:14px 28px;border-radius:14px;font-weight:700;font-size:14px;z-index:999;opacity:0;transition:all .4s cubic-bezier(.68,-.55,.27,1.55)}
.toast.show{transform:translateX(-50%) translateY(0);opacity:1}
.toast.success{background:var(--success);color:#fff}
.toast.error{background:var(--danger);color:#fff}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;display:none;align-items:center;justify-content:center;backdrop-filter:blur(8px)}
.modal-bg.show{display:flex}
.modal{background:var(--card);border-radius:24px;padding:30px;width:90%;max-width:480px;max-height:85vh;overflow-y:auto;animation:slideUp .4s;border:1px solid var(--border)}
`;

// ===== LOGIN PAGE =====
function getLoginPage(error='',csrfToken='',redirect='/') {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Cache-Control" content="no-cache,no-store,must-revalidate"><title>Connexion — SchoolManager</title><style>${CSS}
.login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.login-card{background:var(--card);border-radius:28px;padding:48px 36px;width:100%;max-width:400px;border:1px solid var(--border);text-align:center;animation:fadeIn .6s;box-shadow:0 20px 60px rgba(0,0,0,.4)}
.login-icon{font-size:72px;margin-bottom:16px;animation:float 3s ease-in-out infinite}
.login-card h2{font-size:28px;background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px}
.login-sub{color:var(--text3);font-size:13px;margin-bottom:32px}
.login-card input{padding:18px;font-size:17px;text-align:center;letter-spacing:4px;border-radius:16px;margin-bottom:20px}
.login-card .btn{width:100%;padding:18px;border-radius:16px;font-size:17px}
.login-error{color:var(--danger);font-size:13px;margin-top:12px;animation:fadeIn .3s}
.login-footer{color:var(--text3);font-size:11px;margin-top:24px}
</style></head><body class="gradient-bg"><div class="login-wrap"><div class="login-card"><div class="login-icon">🛡️</div><h2>Administration</h2><p class="login-sub">SchoolManager — Authentification sécurisée</p><form method="POST" action="/auth${redirect!=='/'?'?redirect='+encodeURIComponent(redirect):''}"><input type="hidden" name="csrf_token" value="${csrfToken}"><input type="password" name="password" placeholder="Mot de passe" autofocus required><button type="submit" class="btn btn-primary">🔐 Se connecter</button></form>${error?'<p class="login-error">❌ '+error+'</p>':''}<p class="login-footer">🔒 Sécurisé par Cloudflare Workers</p></div></div></body></html>`;
}

// ===== ERROR PAGE =====
function getErrorPage(msg) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Erreur</title><style>${CSS}
.err-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:20px}
.err-box{background:var(--card);padding:50px;border-radius:24px;max-width:420px;animation:fadeIn .5s}
.err-icon{font-size:64px;margin-bottom:16px}
.err-box h2{color:var(--danger);margin:12px 0;font-size:22px}
</style></head><body class="gradient-bg"><div class="err-wrap"><div class="err-box"><div class="err-icon">🚫</div><h2>${msg}</h2><a href="/" class="btn btn-primary" style="margin-top:20px;display:inline-block;text-decoration:none">← Retour</a></div></div></body></html>`;
}

// ===== ADMIN DASHBOARD =====
function getAdminPage() {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Cache-Control" content="no-cache,no-store,must-revalidate"><title>Admin — SchoolManager</title><link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>"><style>${CSS}

/* HEADER */
.hdr{background:linear-gradient(135deg,var(--card),var(--card2));padding:20px 24px;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:50;backdrop-filter:blur(20px)}
.hdr-row{display:flex;justify-content:space-between;align-items:center;max-width:1200px;margin:0 auto}
.hdr-left{display:flex;align-items:center;gap:14px}
.hdr-logo{font-size:32px;animation:float 3s ease-in-out infinite}
.hdr h1{font-size:22px;font-weight:800;background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hdr .ver{font-size:11px;color:var(--text3);margin-top:2px}
.hdr-actions{display:flex;gap:10px}
.hdr-btn{background:var(--bg2);border:1px solid var(--border);color:var(--text);width:42px;height:42px;border-radius:12px;font-size:18px;cursor:pointer;transition:all .3s;display:flex;align-items:center;justify-content:center}
.hdr-btn:hover{background:var(--primary);border-color:var(--primary);transform:translateY(-2px)}

/* MAIN */
.main{max-width:1200px;margin:0 auto;padding:24px 16px}

/* WELCOME BANNER */
.welcome{background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:24px;padding:32px;margin-bottom:28px;position:relative;overflow:hidden;animation:fadeIn .6s}
.welcome::before{content:'';position:absolute;top:-50%;right:-20%;width:300px;height:300px;background:radial-gradient(circle,rgba(255,255,255,.15),transparent);border-radius:50%}
.welcome::after{content:'';position:absolute;bottom:-30%;left:-10%;width:200px;height:200px;background:radial-gradient(circle,rgba(255,255,255,.1),transparent);border-radius:50%}
.welcome h2{font-size:26px;color:#fff;position:relative;z-index:1}
.welcome p{color:rgba(255,255,255,.8);font-size:14px;margin-top:6px;position:relative;z-index:1}
.welcome .emoji{font-size:48px;position:absolute;right:24px;top:50%;transform:translateY(-50%);z-index:1;animation:float 2s ease-in-out infinite}

/* STATS GRID */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:28px}
.stat-card{background:var(--card);border-radius:20px;padding:24px;border:1px solid var(--border);transition:all .4s;position:relative;overflow:hidden;animation:fadeIn .6s}
.stat-card:nth-child(1){animation-delay:.1s}
.stat-card:nth-child(2){animation-delay:.2s}
.stat-card:nth-child(3){animation-delay:.3s}
.stat-card:nth-child(4){animation-delay:.4s}
.stat-card:nth-child(5){animation-delay:.5s}
.stat-card:nth-child(6){animation-delay:.6s}
.stat-card:hover{transform:translateY(-4px);border-color:var(--primary);box-shadow:0 12px 40px var(--glow)}
.stat-card::before{content:'';position:absolute;top:0;right:0;width:80px;height:80px;border-radius:50%;opacity:.08}
.stat-card:nth-child(1)::before{background:var(--primary)}
.stat-card:nth-child(2)::before{background:var(--success)}
.stat-card:nth-child(3)::before{background:var(--accent)}
.stat-card:nth-child(4)::before{background:var(--warning)}
.stat-card:nth-child(5)::before{background:var(--danger)}
.stat-card:nth-child(6)::before{background:var(--primary2)}
.stat-icon{font-size:36px;margin-bottom:12px}
.stat-val{font-size:32px;font-weight:800;animation:countUp .6s}
.stat-label{font-size:13px;color:var(--text2);margin-top:4px}
.stat-change{font-size:11px;margin-top:8px;padding:4px 10px;border-radius:20px;display:inline-block}
.stat-up{background:rgba(16,185,129,.15);color:var(--success)}
.stat-down{background:rgba(239,68,68,.15);color:var(--danger)}

/* QUICK ACTIONS */
.actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:28px}
.action-card{background:var(--card);border-radius:18px;padding:22px;border:1px solid var(--border);text-align:center;cursor:pointer;transition:all .3s;text-decoration:none;color:var(--text)}
.action-card:hover{transform:translateY(-4px);border-color:var(--primary);box-shadow:0 8px 30px var(--glow)}
.action-card .icon{font-size:36px;margin-bottom:10px;display:block}
.action-card .label{font-size:13px;font-weight:600}
.action-card .desc{font-size:11px;color:var(--text3);margin-top:4px}

/* SECTIONS */
.section-title{font-size:18px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:10px}
.section-title .emoji{font-size:22px}

/* PROJECT INFO */
.info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:28px}
.info-card{background:var(--card);border-radius:18px;padding:24px;border:1px solid var(--border);animation:fadeIn .6s}
.info-card h3{font-size:15px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px}
.info-row:last-child{border:none}
.info-row .label{color:var(--text2)}
.info-row .value{font-weight:600}

/* SECURITY BADGE */
.sec-badge{display:flex;align-items:center;gap:10px;padding:16px 20px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);border-radius:14px;margin-bottom:20px}
.sec-badge .icon{font-size:20px}
.sec-badge .text{font-size:12px;color:var(--success);font-weight:600}

/* BOTTOM NAV (mobile) */
.bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--border);z-index:50;padding:6px 0;padding-bottom:env(safe-area-inset-bottom)}
.nav-items{display:flex;justify-content:space-around}
.nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 12px;cursor:pointer;color:var(--text3);font-size:10px;transition:all .3s;border-radius:12px}
.nav-item.active{color:var(--primary);background:var(--glow)}
.nav-item .nav-icon{font-size:22px}

@media(max-width:768px){
  .bottom-nav{display:block}
  .main{padding-bottom:100px}
  .welcome h2{font-size:20px}
  .welcome .emoji{display:none}
  .stats{grid-template-columns:repeat(2,1fr)}
  .info-grid{grid-template-columns:1fr}
}
</style></head><body class="gradient-bg">

<!-- HEADER -->
<div class="hdr"><div class="hdr-row"><div class="hdr-left"><span class="hdr-logo">🛡️</span><div><h1>SchoolManager Admin</h1><div class="ver">v2.1 — Dashboard</div></div></div><div class="hdr-actions"><button class="hdr-btn" onclick="window.location.href='/generator/'" title="Générateur">🔑</button><button class="hdr-btn" onclick="window.location.href='/logout'" title="Déconnexion">🚪</button></div></div></div>

<!-- MAIN -->
<div class="main">

<!-- WELCOME -->
<div class="welcome">
  <h2>Bonjour Mr TASSEMBEDO 👋</h2>
  <p>Voici le résumé de votre projet SchoolManager</p>
  <span class="emoji">📊</span>
</div>

<!-- SECURITY -->
<div class="sec-badge"><span class="icon">🔒</span><span class="text">Session sécurisée — HMAC SHA-256 — Cookie signé — Rate limiting actif</span></div>

<!-- STATS -->
<div class="stats">
  <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-val" data-count="5">5</div><div class="stat-label">Composants</div><div class="stat-change stat-up">Projet complet</div></div>
  <div class="stat-card"><div class="stat-icon">🔧</div><div class="stat-val" data-count="30">30+</div><div class="stat-label">Fonctionnalités</div><div class="stat-change stat-up">Actives</div></div>
  <div class="stat-card"><div class="stat-icon">🌍</div><div class="stat-val">FR+EN</div><div class="stat-label">2 Langues</div><div class="stat-change stat-up">International</div></div>
  <div class="stat-card"><div class="stat-icon">📐</div><div class="stat-val">4</div><div class="stat-label">Thèmes</div><div class="stat-change stat-up">Clair/Sombre/BF/Mod</div></div>
  <div class="stat-card"><div class="stat-icon">🔐</div><div class="stat-val">v1.7.6</div><div class="stat-label">Version App</div><div class="stat-change" id="appVersionBadge" style="color:var(--success)">À jour</div></div>
  <div class="stat-card"><div class="stat-icon">☁️</div><div class="stat-val">ON</div><div class="stat-label">Worker Cloudflare</div><div class="stat-change stat-up">En ligne</div></div>
</div>

<!-- QUICK ACTIONS -->
<div class="section-title"><span class="emoji">⚡</span> Actions rapides</div>
<div class="actions">
  <a href="/generator/" class="action-card"><span class="icon">🔑</span><span class="label">Générateur</span><span class="desc">Créer des licences</span></a>
  <a href="https://schoolmanager-bf.github.io" target="_blank" class="action-card"><span class="icon">🌐</span><span class="label">Site Web</span><span class="desc">schoolmanager-bf.github.io</span></a>
  <a href="https://github.com/schoolmanager-bf" target="_blank" class="action-card"><span class="icon">💻</span><span class="label">GitHub</span><span class="desc">Code source</span></a>
  <a href="https://schoolmanager-bf.github.io/verification.html" target="_blank" class="action-card"><span class="icon">🔍</span><span class="label">Vérification</span><span class="desc">QR codes en ligne</span></a>
</div>

<!-- UPDATE SECTION -->
<div class="section-title"><span class="emoji">🔄</span> Mises à jour</div>
<div class="info-grid">
  <div class="info-card" id="updateSiteCard">
    <h3>🌐 Mise à jour du site web</h3>
    <p style="font-size:13px;color:var(--text3);margin-bottom:16px">Modifiez le contenu du site schoolmanager-bf.github.io directement depuis ici.</p>
    <div class="form-group">
      <label>Page à modifier</label>
      <select id="sitePage">
        <option value="index">Page d'accueil (index.html)</option>
        <option value="conditions">Conditions d'utilisation</option>
        <option value="verification">Page de vérification QR</option>
        <option value="manuel">Manuel d'utilisation</option>
      </select>
    </div>
    <div class="form-group">
      <label>Nouveau contenu HTML</label>
      <textarea id="siteContent" style="min-height:120px;font-family:Consolas,monospace;font-size:12px" placeholder="Collez le nouveau code HTML ici..."></textarea>
    </div>
    <button class="btn btn-primary" style="width:100%" onclick="updateSite()">💾 Mettre à jour le site</button>
    <div id="siteResult" style="display:none;margin-top:12px;padding:12px;border-radius:12px;font-size:13px"></div>
  </div>
  <div class="info-card" id="updateAppCard">
    <h3>📦 Mise à jour du logiciel</h3>
    <p style="font-size:13px;color:var(--text3);margin-bottom:16px">Mettez à jour la version de SchoolManager disponible au téléchargement.</p>
    <div class="form-group">
      <label>Nouvelle version</label>
      <input type="text" id="newVersion" placeholder="Ex: 1.7.7">
    </div>
    <div class="form-group">
      <label>Nouveau lien de téléchargement</label>
      <input type="text" id="newDownloadUrl" placeholder="URL du nouvel installateur">
    </div>
    <div class="form-group">
      <label>Nouveau lien exe FR</label>
      <input type="text" id="newFrUrl" placeholder="URL SchoolManager-FR.exe">
    </div>
    <div class="form-group">
      <label>Nouveau lien exe FR+EN</label>
      <input type="text" id="newFrenUrl" placeholder="URL SchoolManager-FR+EN.exe">
    </div>
    <div class="form-group">
      <label>Notes de mise à jour</label>
      <textarea id="updateNotes" placeholder="Corrections, nouvelles fonctionnalités..."></textarea>
    </div>
    <button class="btn btn-success" style="width:100%" onclick="updateApp()">🚀 Publier la mise à jour</button>
    <div id="appResult" style="display:none;margin-top:12px;padding:12px;border-radius:12px;font-size:13px"></div>
  </div>
</div>

<!-- PROJECT INFO -->
<div class="section-title"><span class="emoji">📋</span> Informations du projet</div>
<div class="info-grid">

  <div class="info-card">
    <h3>💻 Stack technique</h3>
    <div class="info-row"><span class="label">Frontend App</span><span class="value">WPF / .NET 6 / C#</span></div>
    <div class="info-row"><span class="label">Base de données</span><span class="value">SQLite</span></div>
    <div class="info-row"><span class="label">PDF</span><span class="value">QuestPDF + PdfSharp</span></div>
    <div class="info-row"><span class="label">Excel</span><span class="value">ClosedXML</span></div>
    <div class="info-row"><span class="label">QR Code</span><span class="value">QRCoder + ZXing</span></div>
    <div class="info-row"><span class="label">Backend Admin</span><span class="value">Cloudflare Workers</span></div>
    <div class="info-row"><span class="label">Site Web</span><span class="value">GitHub Pages</span></div>
    <div class="info-row"><span class="label">Sécurité</span><span class="value">HMAC SHA-256</span></div>
  </div>

  <div class="info-card">
    <h3>👨‍💻 Développeur</h3>
    <div class="info-row"><span class="label">Nom</span><span class="value">Bénéwendé Dieudonné Tassembédo</span></div>
    <div class="info-row"><span class="label">Téléphone</span><span class="value">+226 77 67 69 31</span></div>
    <div class="info-row"><span class="label">Email</span><span class="value">dieudonnetassembedo07@gmail.com</span></div>
    <div class="info-row"><span class="label">LinkedIn</span><span class="value">linkedin.com/in/bénéwendé</span></div>
    <div class="info-row"><span class="label">GitHub</span><span class="value">github.com/schoolmanager-bf</span></div>
  </div>

  <div class="info-card">
    <h3>💰 Tarification licence</h3>
    <div class="info-row"><span class="label">📅 1 mois</span><span class="value" style="color:var(--accent)">15 000 FCFA</span></div>
    <div class="info-row"><span class="label">📅 1 an</span><span class="value" style="color:var(--success)">100 000 FCFA</span></div>
    <div class="info-row"><span class="label">📅 2 ans</span><span class="value" style="color:var(--primary)">170 000 FCFA</span></div>
    <div class="info-row"><span class="label">📅 5 ans</span><span class="value" style="color:var(--warning)">500 000 FCFA</span></div>
  </div>

  <div class="info-card">
    <h3>🔗 Liens importants</h3>
    <div class="info-row"><span class="label">🌐 Site officiel</span><span class="value"><a href="https://schoolmanager-bf.github.io" target="_blank" style="color:var(--primary);text-decoration:none">schoolmanager-bf.github.io</a></span></div>
    <div class="info-row"><span class="label">🔍 Vérification QR</span><span class="value"><a href="https://schoolmanager-bf.github.io/verification.html" target="_blank" style="color:var(--primary);text-decoration:none">Vérifier un document</a></span></div>
    <div class="info-row"><span class="label">🔑 Générateur</span><span class="value"><a href="/generator/" style="color:var(--success);text-decoration:none">Ouvrir →</a></span></div>
    <div class="info-row"><span class="label">💻 Code source</span><span class="value"><a href="https://github.com/schoolmanager-bf" target="_blank" style="color:var(--primary);text-decoration:none">GitHub</a></span></div>
  </div>

</div>

<!-- FEATURES -->
<div class="section-title"><span class="emoji">✨</span> Fonctionnalités de l'application</div>
<div class="info-grid">
  <div class="info-card">
    <h3>🎓 Gestion scolaire</h3>
    <div class="info-row"><span class="label">Élèves</span><span class="value">Inscription, suivi, promotion</span></div>
    <div class="info-row"><span class="label">Classes</span><span class="value">Création, affectation</span></div>
    <div class="info-row"><span class="label">Enseignants</span><span class="value">Affectation, emplois du temps</span></div>
    <div class="info-row"><span class="label">Matières</span><span class="value">Gestion complète</span></div>
  </div>
  <div class="info-card">
    <h3>📊 Bulletins & Notes</h3>
    <div class="info-row"><span class="label">Notes</span><span class="value">Saisie, calcul moyennes</span></div>
    <div class="info-row"><span class="label">Bulletins</span><span class="value">Génération PDF signés</span></div>
    <div class="info-row"><span class="label">Rapports</span><span class="value">Avancés + Excel</span></div>
    <div class="info-row"><span class="label">IA prédictive</span><span class="value">Prédictions + anomalies</span></div>
  </div>
  <div class="info-card">
    <h3>💰 Finances</h3>
    <div class="info-row"><span class="label">Paiements</span><span class="value">Suivi par élève/classe</span></div>
    <div class="info-row"><span class="label">Impayés</span><span class="value">Détection automatique</span></div>
    <div class="info-row"><span class="label">Rappels</span><span class="value">WhatsApp intégré</span></div>
    <div class="info-row"><span class="label">Export</span><span class="value">PDF + Excel</span></div>
  </div>
  <div class="info-card">
    <h3>🔐 Sécurité</h3>
    <div class="info-row"><span class="label">QR Code signé</span><span class="value">HMAC + vérification en ligne</span></div>
    <div class="info-row"><span class="label">Signatures</span><span class="value">Bulletins signés numériquement</span></div>
    <div class="info-row"><span class="label">Sauvegardes</span><span class="value">Auto + manuelles</span></div>
    <div class="info-row"><span class="label">Accès rôles</span><span class="value">Admin/Secrétaire/Comptable</span></div>
  </div>
</div>

<!-- SECURITY DETAILS -->
<div class="section-title"><span class="emoji">🛡️</span> Sécurité du Worker</div>
<div class="info-grid">
  <div class="info-card">
    <h3>🔒 Mécanismes actifs</h3>
    <div class="info-row"><span class="label">Mot de passe</span><span class="value">SHA-256 hashé</span></div>
    <div class="info-row"><span class="label">Session</span><span class="value">Cookie signé HMAC</span></div>
    <div class="info-row"><span class="label">CSRF</span><span class="value">Token par formulaire</span></div>
    <div class="info-row"><span class="label">Rate limiting</span><span class="value">5 tentatives / 15 min</span></div>
    <div class="info-row"><span class="label">Expiration</span><span class="value">60 minutes auto</span></div>
    <div class="info-row"><span class="label">Cache</span><span class="value">no-cache, no-store</span></div>
  </div>
  <div class="info-card">
    <h3>🔑 Génération licence</h3>
    <div class="info-row"><span class="label">Secret</span><span class="value">Env variable (pas dans le code)</span></div>
    <div class="info-row"><span class="label">Format</span><span class="value">TYPE-XXXX-XXXX-XXXX-HASH</span></div>
    <div class="info-row"><span class="label">Hash</span><span class="value">SHA-256 du contenu</span></div>
    <div class="info-row"><span class="label">Machine ID</span><span class="value">Lié à la clé</span></div>
  </div>
</div>

</div><!-- /main -->

<!-- BOTTOM NAV (mobile) -->
<div class="bottom-nav"><div class="nav-items">
  <div class="nav-item active" onclick="window.scrollTo({top:0,behavior:'smooth'})"><div class="nav-icon">🏠</div>Accueil</div>
  <div class="nav-item" onclick="window.location.href='/generator/'"><div class="nav-icon">🔑</div>Générateur</div>
  <div class="nav-item" onclick="window.open('https://schoolmanager-bf.github.io','_blank')"><div class="nav-icon">🌐</div>Site</div>
  <div class="nav-item" onclick="window.location.href='/logout'"><div class="nav-icon">🚪</div>Quitter</div>
</div></div>

<!-- TOAST -->
<div class="toast" id="toast"></div>

<script>
// Animate stat counters on scroll
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.stat-card,.action-card,.info-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'all 0.6s cubic-bezier(.23,1,.32,1)';
  observer.observe(el);
});

async function updateSite() {
  const page = document.getElementById('sitePage').value;
  const content = document.getElementById('siteContent').value.trim();
  const result = document.getElementById('siteResult');
  if (!content) { result.style.display = 'block'; result.style.background = 'rgba(239,68,68,.1)'; result.style.color = 'var(--danger)'; result.textContent = '❌ Collez le nouveau code HTML'; return; }
  result.style.display = 'block'; result.style.background = 'rgba(99,102,241,.1)'; result.style.color = 'var(--primary)'; result.textContent = '⏳ Mise en cache...';
  try {
    const r = await fetch('/api/update-site', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({page, content}) });
    const d = await r.json();
    if (d.success) { result.style.background = 'rgba(16,185,129,.1)'; result.style.color = 'var(--success)'; result.textContent = '✅ ' + d.message; showToast('✅ Site mis à jour !'); }
    else { result.style.background = 'rgba(239,68,68,.1)'; result.style.color = 'var(--danger)'; result.textContent = '❌ ' + (d.error || 'Erreur'); }
  } catch(e) { result.style.background = 'rgba(239,68,68,.1)'; result.style.color = 'var(--danger)'; result.textContent = '❌ Erreur réseau: ' + e.message; }
}

async function updateApp() {
  const version = document.getElementById('newVersion').value.trim();
  const dlUrl = document.getElementById('newDownloadUrl').value.trim();
  const frUrl = document.getElementById('newFrUrl').value.trim();
  const frenUrl = document.getElementById('newFrenUrl').value.trim();
  const notes = document.getElementById('updateNotes').value.trim();
  const result = document.getElementById('appResult');
  if (!version) { result.style.display = 'block'; result.style.background = 'rgba(239,68,68,.1)'; result.style.color = 'var(--danger)'; result.textContent = '❌ Entrez le numéro de version'; return; }
  result.style.display = 'block'; result.style.background = 'rgba(99,102,241,.1)'; result.style.color = 'var(--primary)'; result.textContent = '⏳ Publication...';
  try {
    const r = await fetch('/api/update-app', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({version, dlUrl, frUrl, frenUrl, notes}) });
    const d = await r.json();
    if (d.success) { result.style.background = 'rgba(16,185,129,.1)'; result.style.color = 'var(--success)'; result.textContent = '✅ ' + d.message; showToast('🚀 Version ' + version + ' publiée !'); }
    else { result.style.background = 'rgba(239,68,68,.1)'; result.style.color = 'var(--danger)'; result.textContent = '❌ ' + (d.error || 'Erreur'); }
  } catch(e) { result.style.background = 'rgba(239,68,68,.1)'; result.style.color = 'var(--danger)'; result.textContent = '❌ Erreur réseau: ' + e.message; }
}
</script>
</body></html>`;
}

// ===== GENERATOR PAGE =====
function getGeneratorPage() {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><meta http-equiv="Cache-Control" content="no-cache,no-store,must-revalidate"><title>Générateur — SchoolManager</title><link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔑</text></svg>"><style>${CSS}

.hdr{background:linear-gradient(135deg,var(--card),var(--card2));padding:16px 20px;position:sticky;top:0;z-index:50;border-bottom:1px solid var(--border);backdrop-filter:blur(20px)}
.hdr-top{display:flex;justify-content:space-between;align-items:center}
.hdr h1{font-size:20px;background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hdr .ver{font-size:11px;color:var(--text3);margin-top:3px}
.hdr-btn{background:var(--bg2);border:1px solid var(--border);color:var(--text);width:40px;height:40px;border-radius:12px;font-size:18px;cursor:pointer;transition:all .3s;display:flex;align-items:center;justify-content:center}
.hdr-btn:hover{background:var(--primary);border-color:var(--primary)}

.session-bar{background:rgba(16,185,129,.08);padding:8px 16px;text-align:center;font-size:11px;color:var(--success);border-bottom:1px solid rgba(16,185,129,.15)}

.tabs{display:flex;gap:8px;padding:16px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.tabs::-webkit-scrollbar{display:none}
.tab{padding:12px 20px;border-radius:14px;font-size:13px;font-weight:600;white-space:nowrap;cursor:pointer;background:var(--card);border:1px solid var(--border);color:var(--text2);transition:all .3s}
.tab.active{background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;border-color:transparent;box-shadow:0 4px 15px rgba(99,102,241,.3)}

.section{display:none;padding:0 16px 20px}
.section.active{display:block;animation:fadeIn .4s}

.card{background:var(--card);border-radius:20px;padding:24px;margin-bottom:16px;border:1px solid var(--border)}
.card h3{font-size:16px;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.form-group{margin-bottom:16px}
.form-group select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center}
.form-group textarea{min-height:80px;resize:vertical}

.btn-gen{width:100%;padding:20px;border:none;border-radius:18px;font-size:18px;font-weight:800;cursor:pointer;background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;box-shadow:0 6px 25px rgba(99,102,241,.3);transition:all .3s;margin-top:12px}
.btn-gen:hover{transform:translateY(-2px);box-shadow:0 10px 35px rgba(99,102,241,.4)}
.btn-gen:active{transform:scale(.97)}

.result{display:none;background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(99,102,241,.08));border:2px solid var(--success);border-radius:20px;padding:28px;margin-bottom:16px;text-align:center;animation:slideUp .5s}
.result.show{display:block}
.result .key{font-size:22px;font-weight:800;font-family:'Cascadia Code',Consolas,monospace;color:var(--success);margin:16px 0;padding:14px;background:rgba(0,0,0,.3);border-radius:14px;word-break:break-all;line-height:1.6}
.result-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px}

.client-item{background:var(--bg2);border-radius:14px;padding:16px;margin-bottom:12px;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:all .3s}
.client-item:hover{border-color:var(--primary);transform:translateX(4px)}
.client-item .info{flex:1}
.client-item .name{font-weight:700;font-size:14px}
.client-item .detail{font-size:11px;color:var(--text3);margin-top:4px}
.client-item .status{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
.status-active{background:rgba(16,185,129,.15);color:var(--success)}
.status-expired{background:rgba(239,68,68,.15);color:var(--danger)}

.empty{text-align:center;padding:50px 20px;color:var(--text3)}
.empty .icon{font-size:56px;margin-bottom:16px;animation:float 3s ease-in-out infinite}
.empty p{font-size:14px}

.bottom-nav{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--border);display:flex;z-index:50;padding:6px 0;padding-bottom:env(safe-area-inset-bottom)}
.nav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 0;cursor:pointer;color:var(--text3);font-size:10px;transition:all .3s;border-radius:12px}
.nav-item.active{color:var(--primary);background:var(--glow)}
.nav-item .nav-icon{font-size:22px}

.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;display:none;align-items:flex-end;justify-content:center;backdrop-filter:blur(8px)}
.modal-bg.show{display:flex}
.modal{background:var(--card);border-radius:24px 24px 0 0;width:100%;max-width:500px;max-height:80vh;overflow-y:auto;padding:28px;animation:slideUp .3s}

@media(min-width:768px){
  .main-inner{max-width:600px;margin:0 auto;padding-top:20px}
  .bottom-nav{display:none}
  .section{padding:0 0 20px}
}
</style></head><body class="gradient-bg">

<!-- HEADER -->
<div class="hdr"><div class="hdr-top"><div><h1>🔑 LicenseGenerator</h1><div class="ver">v2.1 — Sécurisé</div></div><div style="display:flex;gap:8px"><a href="/admin.html" class="hdr-btn" title="Dashboard" style="text-decoration:none">📊</a><button class="hdr-btn" onclick="logout()" title="Déconnexion">🚪</button></div></div></div>
<div class="session-bar">🔒 Session sécurisée — HMAC SHA-256</div>

<!-- TABS -->
<div class="tabs"><div class="tab active" data-tab="generate">🔑 Générer</div><div class="tab" data-tab="clients">👥 Clients</div><div class="tab" data-tab="history">📋 Historique</div><div class="tab" data-tab="about">ℹ️ Info</div></div>

<!-- GENERATE -->
<div class="section active" id="sec-generate">
  <div class="card"><h3>💻 Machine client</h3>
    <div class="form-group"><label>Machine ID *</label><input type="text" id="machineId" placeholder="XXXX-XXXX-XXXX-XXXX (depuis l'app)"></div>
  </div>
  <div class="card"><h3>👤 Informations client</h3>
    <div class="form-group"><label>Nom du client *</label><input type="text" id="clientName" placeholder="Ex: École Primaire"></div>
    <div class="form-group"><label>Nom du directeur</label><input type="text" id="directorName" placeholder="Ex: M. OUEDRAOGO"></div>
    <div class="form-group"><label>Téléphone *</label><input type="tel" id="clientPhone" placeholder="+226 XX XX XX XX"></div>
    <div class="form-group"><label>Email</label><input type="email" id="clientEmail" placeholder="email@example.com"></div>
    <div class="form-group"><label>Ville</label><input type="text" id="clientCity" placeholder="Ouagadougou"></div>
  </div>
  <div class="card"><h3>📦 Type de licence</h3>
    <div class="form-group"><label>Durée *</label><select id="licenseType"><option value="1MO">1 mois — 15 000 FCFA</option><option value="1AN" selected>1 an — 100 000 FCFA</option><option value="2AN">2 ans — 170 000 FCFA</option><option value="5AN">5 ans — 500 000 FCFA</option></select></div>
    <div class="form-group"><label>Observations</label><textarea id="clientNotes" placeholder="Notes..."></textarea></div>
    <button class="btn-gen" onclick="generateLicense()">🔑 GÉNÉRER LA LICENCE</button>
  </div>
  <div class="result" id="result"><div style="font-size:48px">✅</div><h3 style="margin:12px 0 6px">Licence générée !</h3><p style="font-size:12px;color:var(--text3)" id="resultInfo"></p><div class="key" id="resultKey"></div><div class="result-actions"><button class="btn btn-success" onclick="copyKey()">📋 Copier</button><button class="btn btn-outline" onclick="shareWhatsApp()">📱 WhatsApp</button></div></div>
</div>

<!-- CLIENTS -->
<div class="section" id="sec-clients">
  <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="margin:0">👥 Clients</h3><span style="font-size:12px;color:var(--text3)" id="clientCount">0</span></div><div id="clientList"><div class="empty"><div class="icon">📋</div><p>Aucun client enregistré</p></div></div></div>
</div>

<!-- HISTORY -->
<div class="section" id="sec-history">
  <div class="card"><h3>📋 Historique des licences</h3><div id="historyList"><div class="empty"><div class="icon">📜</div><p>Aucune licence générée</p></div></div></div>
</div>

<!-- ABOUT -->
<div class="section" id="sec-about">
  <div class="card" style="text-align:center"><div style="font-size:64px;margin-bottom:16px;animation:float 3s ease-in-out infinite">🔐</div><h2 style="background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:24px">LicenseGenerator</h2><p style="color:var(--text3);font-size:13px;margin-top:6px">Version 2.1 — Sécurisé</p></div>
  <div class="card"><h3>👨‍💻 Développeur</h3><div style="font-size:14px;line-height:2.2"><p>👤 <strong>Bénéwendé Dieudonné Tassembédo</strong></p><p>📱 <a href="tel:+22677676931" style="color:var(--primary);text-decoration:none">+226 77 67 69 31</a></p><p>✉️ <a href="mailto:dieudonnetassembedo07@gmail.com" style="color:var(--primary);text-decoration:none">dieudonnetassembedo07@gmail.com</a></p></div></div>
  <div class="card"><h3>💰 Tarification</h3><div style="font-size:14px;line-height:2.2"><p>📅 1 mois : <strong style="color:var(--accent)">15 000 FCFA</strong></p><p>📅 1 an : <strong style="color:var(--success)">100 000 FCFA</strong></p><p>📅 2 ans : <strong style="color:var(--primary)">170 000 FCFA</strong></p><p>📅 5 ans : <strong style="color:var(--warning)">500 000 FCFA</strong></p></div></div>
</div>

<!-- BOTTOM NAV -->
<div class="bottom-nav"><div class="nav-items">
  <div class="nav-item active" data-tab="generate"><div class="nav-icon">🔑</div>Générer</div>
  <div class="nav-item" data-tab="clients"><div class="nav-icon">👥</div>Clients</div>
  <div class="nav-item" data-tab="history"><div class="nav-icon">📋</div>Historique</div>
  <div class="nav-item" data-tab="about"><div class="nav-icon">ℹ️</div>Info</div>
</div></div>

<div class="toast" id="toast"></div>
<div class="modal-bg" id="modalOverlay" onclick="if(event.target===this)this.classList.remove('show')"><div class="modal" id="modal"><div id="modalContent"></div></div></div>

<script>
const CK='sm_clients_gen',HK='sm_history_gen';
document.querySelectorAll('.tab,.nav-item').forEach(el=>{el.addEventListener('click',()=>{const t=el.dataset.tab;document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));document.querySelectorAll('[data-tab="'+t+'"]').forEach(x=>x.classList.add('active'));document.getElementById('sec-'+t).classList.add('active')})});
let lastKey='',lastName='';
async function generateLicense(){const mid=document.getElementById('machineId').value.trim(),nm=document.getElementById('clientName').value.trim(),ph=document.getElementById('clientPhone').value.trim(),tp=document.getElementById('licenseType').value;if(!mid||!nm||!ph){showToast('Remplissez Machine ID, nom et téléphone',1);return}const dr=document.getElementById('directorName').value.trim(),em=document.getElementById('clientEmail').value.trim(),ct=document.getElementById('clientCity').value.trim(),nt=document.getElementById('clientNotes').value.trim();try{const r=await fetch('/generate-license',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({machineId:mid,name:nm,director:dr,phone:ph,email:em,city:ct,notes:nt,type:tp})}),d=await r.json();if(!d.success){showToast(d.error||'Erreur',1);return}lastKey=d.key;lastName=nm;const c={id:d.clientId,machineId:mid,name:nm,director:dr,phone:ph,email:em,city:ct,notes:nt,key:d.key,type:tp,typeLabel:d.typeLabel,price:d.price,date:new Date().toISOString(),expiry:d.expiry},cl=getS(CK);cl.unshift(c);setS(CK,cl);const h=getS(HK);h.unshift({...c,action:'Générée'});setS(HK,h);document.getElementById('resultInfo').textContent=nm+' — '+d.typeLabel+' — expire le '+new Date(d.expiry).toLocaleDateString('fr-FR');document.getElementById('resultKey').textContent=d.key;document.getElementById('result').classList.add('show');['machineId','clientName','directorName','clientPhone','clientEmail','clientCity','clientNotes'].forEach(i=>document.getElementById(i).value='');loadClients();loadHistory();showToast('✅ Licence générée !')}catch(e){showToast('Erreur: '+e.message,1)}}
function copyKey(){navigator.clipboard.writeText(lastKey);showToast('📋 Clé copiée !')}
function shareWhatsApp(){window.open('https://wa.me/?text='+encodeURIComponent('🔐 *Licence SchoolManager*\\n\\n👤 '+lastName+'\\n🔑 '+lastKey+'\\n\\n📱 +226 77 67 69 31'),'_blank')}
function loadClients(){const c=getS(CK);document.getElementById('clientCount').textContent=c.length+' client(s)';if(!c.length){document.getElementById('clientList').innerHTML='<div class="empty"><div class="icon">📋</div><p>Aucun client</p></div>';return}let h='';c.forEach((x,i)=>{const exp=new Date(x.expiry)<new Date();h+='<div class="client-item" onclick="showDetail('+i+')"><div class="info"><div class="name">'+x.name+'</div><div class="detail">💻 '+(x.machineId||'N/A')+' • '+x.typeLabel+' • '+new Date(x.date).toLocaleDateString('fr-FR')+'</div></div><span class="status '+(exp?'status-expired':'status-active')+'">'+(exp?'Expirée':'Active')+'</span></div>'});document.getElementById('clientList').innerHTML=h}
function showDetail(i){const c=getS(CK)[i];if(!c)return;const exp=new Date(c.expiry)<new Date();document.getElementById('modalContent').innerHTML='<h2 style="margin-bottom:16px">👤 '+c.name+'</h2><div style="font-size:13px;line-height:2.2"><p>💻 <strong>Machine :</strong> <span style="font-family:Consolas;color:var(--primary)">'+(c.machineId||'N/A')+'</span></p>'+(c.director?'<p>👨‍💼 <strong>Directeur :</strong> '+c.director+'</p>':'')+'<p>📞 <strong>Tél :</strong> '+c.phone+'</p>'+(c.email?'<p>✉️ <strong>Email :</strong> '+c.email+'</p>':'')+(c.city?'<p>📍 <strong>Ville :</strong> '+c.city+'</p>':'')+'<p>📦 <strong>Type :</strong> '+c.typeLabel+' — '+c.price+' FCFA</p><p>🔑 <strong>Clé :</strong> <span style="font-family:Consolas;color:var(--success);font-weight:700;word-break:break-all">'+c.key+'</span></p><p>📅 <strong>Expire :</strong> '+new Date(c.expiry).toLocaleDateString('fr-FR')+(exp?' ❌ EXPIRÉE':' ✅')+'</p></div><div style="margin-top:18px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn btn-success" onclick="navigator.clipboard.writeText(getS(CK)['+i+'].key);showToast(\\'📋 Clé copiée !\\')" style="font-size:13px;padding:12px 20px">📋 Copier clé</button><button class="btn btn-outline" onclick="navigator.clipboard.writeText(getS(CK)['+i+'].machineId||\\'\\');showToast(\\'💻 Machine copié !\\')" style="font-size:13px;padding:12px 20px">💻 Machine ID</button><button class="btn btn-danger" onclick="if(confirm(\\'Supprimer ce client ?\\')){getS(CK).splice('+i+',1);setS(CK,getS(CK));document.getElementById(\\'modalOverlay\\').classList.remove(\\'show\\');loadClients();showToast(\\'🗑️ Supprimé\\')}" style="font-size:13px;padding:12px 20px">🗑️</button></div>';document.getElementById('modalOverlay').classList.add('show')}
function loadHistory(){const h=getS(HK);if(!h.length){document.getElementById('historyList').innerHTML='<div class="empty"><div class="icon">📜</div><p>Aucune licence</p></div>';return}let ht='';h.slice(0,50).forEach(x=>{ht+='<div class="client-item"><div class="info"><div class="name">🔑 '+x.key+'</div><div class="detail">👤 '+x.name+' • 💻 '+(x.machineId||'N/A')+' • '+x.typeLabel+' • '+new Date(x.date).toLocaleDateString('fr-FR')+'</div></div></div>'});document.getElementById('historyList').innerHTML=ht}
function getS(k){try{return JSON.parse(localStorage.getItem(k))||[]}catch{return[]}}function setS(k,v){localStorage.setItem(k,JSON.stringify(v))}
function showToast(msg,err){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show '+(err?'error':'success');setTimeout(()=>t.className='toast',2500)}
function logout(){window.location.href='/admin.html'}
</script>
</body></html>`;
}

// ===== EXPORT =====
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const password = env.ADMIN_PASSWORD;
    const secret = env.SESSION_SECRET;

    if (!password || !secret) {
      return new Response('Worker non configuré.', { status: 500, headers: { 'Content-Type': 'text/plain' } });
    }

    // === AUTH ===
    if (path === '/auth' && request.method === 'POST') {
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const allowed = await checkRateLimit(clientIP, env);
      if (!allowed) return new Response(getErrorPage('Trop de tentatives. Réessayez dans 15 minutes.'), { status: 429, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

      const formData = await request.formData();
      const pwd = formData.get('password');
      const csrfToken = formData.get('csrf_token');
      const redirect = url.searchParams.get('redirect') || '/admin.html';

      const csrfCookie = (request.headers.get('Cookie') || '').match(/sm_csrf=([^;]+)/);
      if (!csrfCookie || !csrfToken || csrfCookie[1] !== csrfToken) {
        const newCsrf = generateCSRFToken();
        return new Response(getLoginPage('Token CSRF invalide.', newCsrf, redirect), { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': `sm_csrf=${newCsrf}; Path=/; HttpOnly; SameSite=Strict; Max-Age=600` } });
      }

      const hash = await hashPassword(pwd);
      const correctHash = await hashPassword(password);

      if (hash === correctHash) {
        const payload = btoa(JSON.stringify({ user: 'admin', exp: Date.now() + SESSION_DURATION, iat: Date.now() }));
        const signature = await hmacSign(payload, secret);
        return new Response(null, { status: 302, headers: { Location: redirect, 'Set-Cookie': `sm_session=${payload}.${signature}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DURATION / 1000}` } });
      } else {
        const newCsrf = generateCSRFToken();
        return new Response(getLoginPage('Mot de passe incorrect', newCsrf, redirect), { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': `sm_csrf=${newCsrf}; Path=/; HttpOnly; SameSite=Strict; Max-Age=600` } });
      }
    }

    // === GENERATE LICENSE (API) ===
    if (path === '/generate-license' && request.method === 'POST') {
      const session = await getSession(request, secret);
      if (!session) return new Response(JSON.stringify({ success: false, error: 'Non autorisé' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

      try {
        const body = await request.json();
        const { machineId, name, phone, type } = body;
        if (!machineId || !name || !phone) {
          return new Response(JSON.stringify({ success: false, error: 'Champs requis manquants' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const keyChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let bodyRand = '';
        for (let i = 0; i < 16; i++) bodyRand += keyChars[Math.floor(Math.random() * keyChars.length)];
        const bodyFormatted = bodyRand.substr(0,4) + '-' + bodyRand.substr(4,4) + '-' + bodyRand.substr(8,4) + '-' + bodyRand.substr(12,4);

        const toHash = `${type}-${bodyFormatted}-${machineId}-${env.LICENSE_SECRET}`;
        const fullHashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(toHash));
        const fullHash = Array.from(new Uint8Array(fullHashBuf)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        const hash = fullHash.substr(0, 4);
        const key = `${type}-${bodyFormatted}-${hash}`;
        const clientId = 'SM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

        const typeLabels = { '1MO': '1 mois', '1AN': '1 an', '2AN': '2 ans', '5AN': '5 ans' };
        const prices = { '1MO': '15 000', '1AN': '100 000', '2AN': '170 000', '5AN': '500 000' };
        const durations = { '1MO': 30, '1AN': 365, '2AN': 730, '5AN': 1825 };
        const expiry = new Date(Date.now() + durations[type] * 86400000).toISOString();

        return new Response(JSON.stringify({
          success: true, key, clientId, typeLabel: typeLabels[type],
          price: prices[type], expiry
        }), { headers: { 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Erreur serveur' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // === UPDATE SITE (API) ===
    if (path === '/api/update-site' && request.method === 'POST') {
      const session = await getSession(request, secret);
      if (!session) return new Response(JSON.stringify({success:false,error:'Non autorisé'}),{status:401,headers:{'Content-Type':'application/json'}});
      try {
        const {page, content} = await request.json();
        if (!page || !content) return new Response(JSON.stringify({success:false,error:'Paramètres manquants'}),{status:400,headers:{'Content-Type':'application/json'}});
        const pages = {'index':'index.html','conditions':'conditions.html','verification':'verification.html','manuel':'manuel.html'};
        const filename = pages[page] || page + '.html';
        if (env.SITE_KV) {
          await env.SITE_KV.put('site:' + filename, content, {metadata:{updated:Date.now(),author:'admin'}});
        }
        if (!globalThis._siteUpdates) globalThis._siteUpdates = {};
        globalThis._siteUpdates[filename] = content;
        return new Response(JSON.stringify({success:true,message:'Page ' + filename + ' mise à jour avec succès !'}),{headers:{'Content-Type':'application/json'}});
      } catch(e) {
        return new Response(JSON.stringify({success:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json'}});
      }
    }

    // === UPDATE APP (API) ===
    if (path === '/api/update-app' && request.method === 'POST') {
      const session = await getSession(request, secret);
      if (!session) return new Response(JSON.stringify({success:false,error:'Non autorisé'}),{status:401,headers:{'Content-Type':'application/json'}});
      try {
        const {version, dlUrl, frUrl, frenUrl, notes} = await request.json();
        if (!version) return new Response(JSON.stringify({success:false,error:'Version requise'}),{status:400,headers:{'Content-Type':'application/json'}});
        const updateInfo = {version, dlUrl: dlUrl||'', frUrl: frUrl||'', frenUrl: frenUrl||'', notes: notes||'', updated: Date.now()};
        if (env.SITE_KV) {
          await env.SITE_KV.put('app:update', JSON.stringify(updateInfo));
        }
        if (!globalThis._appUpdate) globalThis._appUpdate = {};
        globalThis._appUpdate = updateInfo;
        return new Response(JSON.stringify({success:true,message:'Version ' + version + ' publiée ! Les clients seront notifiés.'}),{headers:{'Content-Type':'application/json'}});
      } catch(e) {
        return new Response(JSON.stringify({success:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json'}});
      }
    }

    // === DOWNLOAD COUNTER ===
    if (path === '/api/counter') {
      const method = request.method;
      if (env.SITE_KV) {
        let count = parseInt(await env.SITE_KV.get('download:count') || '0');
        if (method === 'POST') {
          count++;
          await env.SITE_KV.put('download:count', String(count));
        }
        return new Response(JSON.stringify({count}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
      if (!globalThis._dlCount) globalThis._dlCount = 0;
      if (method === 'POST') globalThis._dlCount++;
      return new Response(JSON.stringify({count:globalThis._dlCount}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }

    // === LOGOUT ===
    if (path === '/logout') {
      return new Response(null, { status: 302, headers: { Location: '/admin.html', 'Set-Cookie': `sm_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` } });
    }

    // === PROTECTED ROUTES ===
    const protectedPaths = ['/admin.html', '/generator/'];
    const isProtected = protectedPaths.some(p => path === p || path.startsWith(p));

    if (isProtected) {
      const session = await getSession(request, secret);
      if (session) {
        if (path === '/admin.html') return new Response(getAdminPage(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        if (path.startsWith('/generator/')) return new Response(getGeneratorPage(), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
      const csrfToken = generateCSRFToken();
      return new Response(getLoginPage('', csrfToken, path), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': `sm_csrf=${csrfToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=600` } });
    }

    // === PUBLIC ROUTES (avec override site) ===
    const publicPages = {'/':'index.html','/index.html':'index.html','/conditions.html':'conditions.html','/verification.html':'verification.html','/manuel.html':'manuel.html'};
    const pageName = publicPages[path];
    if (pageName) {
      if (env.SITE_KV) {
        const kvContent = await env.SITE_KV.get('site:' + pageName);
        if (kvContent) {
          return new Response(kvContent, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
        }
      }
      if (globalThis._siteUpdates && globalThis._siteUpdates[pageName]) {
        return new Response(globalThis._siteUpdates[pageName], { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
      }
    }
    return fetch(new Request(`https://schoolmanager-bf.github.io${path}`, { method: request.method, headers: request.headers, body: request.body }));
  }
};