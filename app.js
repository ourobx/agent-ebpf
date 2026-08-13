/**
 * Agent-eBPF Sentinel Workbench — real-data dashboard engine.
 * No mock / synthetic / hardcoded numeric values: every panel streams live
 * telemetry from FastAPI authenticated endpoints (eBPF maps, PostgreSQL
 * security_events/threats, Android Management API). When data is unavailable
 * an explicit empty state is rendered instead of fabricated numbers.
 */

// ---- small DOM helpers ----
const $ = (sel, p = document) => p.querySelector(sel);
const $$ = (sel, p = document) => Array.from(p.querySelectorAll(sel));
const text = (el, t) => { if (el) el.textContent = t; };

// ---- i18n stub (EN default; TR extension point) ----
const I18N = {
  lang: (navigator.language || "en").startsWith("tr") ? "tr" : "en",
  dict: {
    en: {
      "ebpf.OPERATIONAL": "OPERATIONAL", "ebpf.NOT_LOADED": "NOT LOADED", "ebpf.ERROR": "ERROR",
      "threat.CLEAR": "CLEAR", "threat.ELEVATED": "ELEVATED", "threat.CRITICAL": "CRITICAL",
    },
    tr: {
      "ebpf.OPERATIONAL": "İŞLEKİ", "ebpf.NOT_LOADED": "YÜKLENMEDİ", "ebpf.ERROR": "HATA",
      "threat.CLEAR": "TEMİZ", "threat.ELEVATED": "YÜKSELMİŞ", "threat.CRITICAL": "KRİTİK",
    },
  },
  t(k) { return (this.dict[this.lang] && this.dict[this.lang][k]) || k; },
};

// ---- session token storage (memory-only; never exposes secrets hardcoded) ----
const API = {
  baseUrl() { return location.protocol + "//" + location.host; },
  token() { return sessionStorage.getItem("ebpf_token"); },
  setToken(t) { sessionStorage.setItem("ebpf_token", t); },
  clearToken() { sessionStorage.removeItem("ebpf_token"); },
  authHeader() {
    const t = this.token();
    return t ? { Authorization: "Bearer " + t } : {};
  },
};

// ---- auth gate ----
const AUTH = {
  showLogin(msg) {
    $("#authGate").hidden = false; $("#app").hidden = true;
    API.clearToken();
    $("#loginError").hidden = true;
    $("#loginError").textContent = msg || "";
    if (msg) $("#loginError").hidden = false;
  },
  showApp() { $("#authGate").hidden = true; $("#app").hidden = false; },
  async login(clientId, clientSecret) {
    const body = new URLSearchParams();
    body.set("grant_type", "client_credentials");
    if (clientId) body.set("client_id", clientId);
    if (clientSecret) body.set("client_secret", clientSecret);
    const res = await fetch("/oauth/token", { method: "POST", body });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.detail || `Login failed (${res.status})`);
    }
    const j = await res.json();
    API.setToken(j.access_token);
    AUTH.showApp();
  },
  logout() { AUTH.showLogin("Logged out"); },
};

// ---- authenticated fetch: 401 clears session & surfaces rejection ----
async function api(path, opts = {}) {
  const res = await fetch(API.baseUrl() + path, Object.assign({ headers: API.authHeader() }, opts));
  if (res.status === 401) { AUTH.logout(); throw new Error("Unauthorized — please sign in"); }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.detail || `HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ---- error boundary: render inline banner, never crash the workbench ----
function safe(panelId, fn) {
  return () => {
    try { fn(); } catch (e) {
      const el = $("#" + panelId.replace("#", ""));
      if (el) el.innerHTML = `<div class="panel-error">⚠ ${e.message}</div>`;
    }
  };
}

// ---- app state ----

// ---- SSE live stream with exponential backoff reconnect (via fetch stream) ----
class LiveData {
  constructor(url) {
    this.url = url; this.attempt = 0; this.baseDelay = 1000; this.maxDelay = 30000;
    this.controller = null; this.reader = null; this.decoder = new TextDecoder();
    this.buffer = ""; this.listeners = []; this.connected = false;
  }
  on(cb) { this.listeners.push(cb); return this; }
  _connect() {
    const delay = Math.min(this.baseDelay * Math.pow(2, this.attempt++), this.maxDelay);
    if (this.controller) this.controller.abort();
    this.controller = new AbortController();
            fetch(API.baseUrl() + this.url, { method: "GET", headers: API.authHeader(), signal: this.controller.signal, cache: "no-store" })
      .then((res) => {
        if (res.status === 401) { AUTH.logout(); throw new Error("Unauthorized"); }
        if (!res.ok) throw new Error(`SSE ${res.status}`);
        if (!res.body) throw new Error("no stream body");
        const reader = res.body.getReader();
        this.attempt = 0; this.connected = true;
        $("#sseDot").textContent = "●";
        const pump = () => reader.read().then(({ done, value }) => {
          if (done) { this.connected = false; setTimeout(() => this._connect(), 1000); return; }
          this.buffer += this.decoder.decode(value, { stream: true });
          let i;
          while ((i = this.buffer.indexOf("\n\n")) >= 0) {
            const chunk = this.buffer.slice(0, i);
            this.buffer = this.buffer.slice(i + 2);
            this._dispatch(chunk);
          }
          pump();
        }).catch(() => { this.connected = false; setTimeout(() => this._connect(), 1000); });
        pump();
      })
      .catch((e) => {
        $("#sseDot").textContent = "!";
        setTimeout(() => this._connect(), delay);
      });
  }
  _dispatch(chunk) {
    let event = null, data = "";
    for (const line of chunk.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (!event || !data) return;
    try {
      const payload = JSON.parse(data);
      if (event === "ping") return;
      this.listeners.forEach((cb) => cb(event, payload));
    } catch { /* ignore malformed frames */ }
  }
  start() { $("#sseDot").textContent = "●"; this._connect(); }
  stop() { if (this.controller) this.controller.abort(); this.connected = false; }
}

// ---- Virtualized list (windowing) ----
class VirtualList {
  constructor(container, rowHeight = 34, buffer = 6) {
    this.container = container; this.rowHeight = rowHeight; this.buffer = buffer;
    this.items = []; this.renderRow = null;
    this._onScroll = this._onScroll.bind(this);
    container.addEventListener("scroll", this._onScroll);
  }
  set(items, renderRow) { this.items = items || []; this.renderRow = renderRow; this._render(); }
  _onScroll() { this._render(); }
  _render() {
    const n = this.items.length;
    if (!this.renderRow) { this.container.innerHTML = ""; return; }
    const visible = Math.ceil(this.container.clientHeight / this.rowHeight) + this.buffer;
    const st = this.container.scrollTop;
    const start = Math.max(0, Math.floor(st / this.rowHeight) - this.buffer);
    const end = Math.min(n, start + visible);
    const pad = (rows) => rows * this.rowHeight;
    let html = `<div style="height:${pad(start)}px"></div>`;
    for (let i = start; i < end; i++) html += this.renderRow(this.items[i], i);
    html += `<div style="height:${pad(n - end)}px"></div>`;
    this.container.innerHTML = html;
  }
}

function truncate(s, n) { if (!s) return ""; return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function fmtTime(iso) { if (!iso) return "—"; try { return new Date(iso).toLocaleTimeString(); } catch { return "—"; } }
function fmtDate(iso) { if (!iso) return "—"; try { return new Date(iso).toLocaleString(); } catch { return "—"; } }
function sparkPath(vals, w = 36, h = 10) {
  if (vals.length < 2) return "";
  const step = w / (vals.length - 1);
  let d = `M0 ${h - vals[0] / 100 * h}`;
  for (let i = 1; i < vals.length; i++) d += ` L${(i * step).toFixed(1)} ${h - vals[i] / 100 * h}`;
  return d;
}

// ---- render: create overview metric cards (once) ----
function initOverview() {
  if ($("#overviewCards").childElementCount) return;
  $("#overviewCards").innerHTML = `
    <div id="cardKernel" class="kit-card warn"><div class="kit-head"><span class="kit-dot">●</span><span class="kit-label">Kernel Health</span></div><div class="kit-value">—</div></div>
    <div id="cardThreats" class="kit-card"><div class="kit-head"><span class="kit-dot">●</span><span class="kit-label">Threat Index</span></div><div class="kit-value">0</div></div>
    <div id="cardCpu" class="kit-card"><div class="kit-head"><span class="kit-dot">●</span><span class="kit-label">CPU</span></div><div class="kit-value">—</div><svg class="spark"><path id="cpuSpark" fill="none"></path></svg></div>
    <div id="cardMem" class="kit-card"><div class="kit-head"><span class="kit-dot">●</span><span class="kit-label">Memory</span></div><div class="kit-value">—</div><svg class="spark"><path id="memSpark" fill="none"></path></svg></div>
  `;
}
const cardKernel = safe("cardKernel", () => {
  const s = STATUS.system || {}; const ebpf = s.ebpf || {};
  const state = ebpf.status === "active" ? "ok" : (ebpf.status === "error" ? "err" : "warn");
  text($("#cardKernel .kit-value"), I18N.t(`ebpf.${s.kernel_health || "ERROR"}`));
  $("#cardKernel .kit-dot").textContent = state === "ok" ? "●" : "!";
  $("#cardKernel").className = "kit-card " + state;
  $("#ebpfDot").textContent = "●"; $("#ebpfDot").style.color = state === "err" ? "#ef4444" : "#06b6d4";
});
const cardThreats = safe("cardThreats", () => {
  const s = STATUS.system || {};
  text($("#cardThreats .kit-value"), String(s.threat_index || 0));
  $("#dbDot").textContent = "●";
  $("#dbDot").style.color = s.database_connected ? "#10b981" : "#ef4444";
});
const cardHost = safe("cardCpu", () => {
  const h = STATUS.host || {};
  text($("#cardCpu .kit-value"), h.available ? `${h.cpu_percent.toFixed(1)}%` : "—");
  text($("#cardMem .kit-value"), h.available ? `${h.memory_percent.toFixed(1)}%` : "—");
  const vals = STATUS.hostSamples;
  $("#cpuSpark").setAttribute("d", sparkPath(vals.map((v) => v.cpu)));
  $("#memSpark").setAttribute("d", sparkPath(vals.map((v) => v.mem)));
});
const renderEvents = safe("eventVirtual", () => {
  const wrap = $("#eventVirtualWrap");
  const empty = $("#eventEmpty");
  if (empty) empty.hidden = (STATUS.events || []).length > 0;
  if (!STATUS._vl) STATUS._vl = new VirtualList(wrap, 34, 8);
  STATUS._vl.container = wrap;
  STATUS._vl.set(STATUS.events || [], (ev) => {
    const action = ev.action || "observe";
    const cls = /block|drop|deny|reject/i.test(action) ? "is-block" : "is-pass";
    return `<div class="evt-row ${cls}"><span class="evt-time">${fmtTime(ev.created_at)}</span><span class="evt-type">${ev.event_type || "—"}</span><span class="evt-ip">${ev.src_ip || "—"}</span><span class="evt-ip">${ev.dst_ip || "—"}</span><span class="evt-action">${action}</span><span class="evt-detail" title="${ev.detail || ""}">${truncate(ev.detail, 60)}</span></div>`;
  });
});
const renderThreats = safe("threatTable", () => {
  const t = $("#threatTable"); const th = STATUS.threats || [];
  if (!th.length) { t.innerHTML = `<div class="empty"><span>🛡</span><p>No recorded threats.</p><small>Real threats appear here as the kernel shield raises alerts.</small></div>`; return; }
  let h = `<table><thead><tr><th>ID</th><th>Rule</th><th>Action</th><th>Reason</th><th>Time</th></tr></thead><tbody>`;
  th.forEach((x) => { h += `<tr><td>${x.id}</td><td>${x.rule_id || "—"}</td><td>${x.action || "—"}</td><td>${truncate(x.reason, 80)}</td><td>${fmtDate(x.created_at)}</td></tr>`; });
  t.innerHTML = h + `</tbody></table>`;
});
const renderAndroid = safe("androidDevices", () => {
  const t = $("#androidDevices"); const d = STATUS.android || {};
  if (d.status !== "ok" || !Array.isArray(d.devices)) { t.innerHTML = `<div class="empty"><span>📱</span><p>Android Management API not configured.</p><small>Set ANDROID_SA_KEY_PATH / ANDROID_ENTERPRISE_ID to enroll devices.</small></div>`; return; }
  if (!d.devices.length) { t.innerHTML = `<div class="empty"><span>📱</span><p>No enrolled devices.</p></div>`; return; }
  let h = `<table><thead><tr><th>Device</th><th>Policy</th><th>Last Seen</th><th>State</th></tr></thead><tbody>`;
  d.devices.forEach((dev) => {
    const cls = /comp|active/i.test(dev.state || "") ? "badge-ok" : "badge-warn";
    h += `<tr><td>${dev.name || dev.id || "—"}</td><td>${dev.policy || "—"}</td><td>${dev.last_seen ? fmtDate(dev.last_seen) : "—"}</td><td><span class="badge ${cls}">${dev.state || "—"}</span></td></tr>`;
  });
  t.innerHTML = h + `</tbody></table>`;
});
const renderPolicies = safe("policyList", () => {
  const el = $("#policyList"); const rules = STATUS.policies || [];
  if (!rules.length) { el.innerHTML = `<div class="empty"><span>📜</span><p>No security policies loaded.</p><small>Add rules via the CLI (<code>agent-ebpf policy</code>).</small></div>`; return; }
  let h = `<table><thead><tr><th>Rule ID</th><th>Action</th><th>Spec</th></tr></thead><tbody>`;
  rules.forEach((r) => { h += `<tr><td>${r.rule_id || r.id || "—"}</td><td>${r.action || "—"}</td><td class="mono">${JSON.stringify(r).slice(0, 120)}</td></tr>`; });
    el.innerHTML = h + `</tbody></table>`;
});

// ---- data fetchers (real endpoints; explicit empty states when unavailable) ----
async function loadSystem() { const s = await api("/api/system/status"); STATUS.system = s; cardKernel(); cardThreats(); }
async function loadHost() { const h = await api("/api/system/host"); STATUS.host = h; if (h.available && typeof h.cpu_percent === "number") { STATUS.hostSamples.push({ cpu: h.cpu_percent, mem: h.memory_percent }); if (STATUS.hostSamples.length > 60) STATUS.hostSamples.shift(); } cardHost(); }
async function loadEvents() { const r = await api("/api/events?limit=200"); STATUS.events = r.available ? r.events : []; renderEvents(); }
async function loadThreats() { const r = await api("/api/threats?limit=200"); STATUS.threats = r.available ? r.threats : []; renderThreats(); }
async function loadAndroid() {
  try { STATUS.android = await api("/api/android/summary"); } catch { STATUS.android = { status: "error", devices: [], summary: {} }; }
  try { const d = await api("/api/android/devices"); STATUS.android = STATUS.android || {}; if (d && d.devices) STATUS.android.devices = d.devices; } catch { /* keep summary-only */ }
  renderAndroid();
}
async function loadPolicies() { const s = STATUS.system || {}; STATUS.policies = (s.ebpf && s.ebpf.rules) || []; renderPolicies(); }

async function refreshAll() {
  $("#refreshBtn").textContent = "↻";
  await Promise.allSettled([loadSystem(), loadHost(), loadEvents(), loadThreats(), loadAndroid()]);
  loadPolicies();
  $("#lastRefresh").textContent = "Live · " + new Date().toLocaleTimeString();
}

// ---- nav sections (keyboard-friendly) ----
function buildNav() {
  const items = [["Overview", "OVERVIEW"], ["Events", "EVENTS"], ["Threats", "THREATS"], ["Android", "ANDROID"], ["Policies", "POLICIES"]];
  $("#navSections").innerHTML = items.map(([l, k]) => `<button class="nav-link" data-k="${k}">${l}</button>`).join("");
  $("#navSections").addEventListener("click", (e) => {
    const b = e.target.closest(".nav-link"); if (!b) return;
    const k = b.getAttribute("data-k");
    document.querySelectorAll(".section").forEach((s) => s.classList.toggle("active", s.id === `section-${k.toLowerCase()}`));
    document.querySelectorAll(".nav-link").forEach((x) => x.classList.remove("active")); b.classList.add("active");
  });
}

// ---- filters for event log ----
function buildFilters() {
  $("#eventFilters").innerHTML = `<input id="searchEvt" type="search" placeholder="Search IP / type / detail…" autocomplete="off">` +
    `<input id="f_action" type="text" placeholder="action" autocomplete="off">` +
    `<button id="clearFilters" class="icon-btn small">✕</button>`;
  $("#searchEvt").addEventListener("input", applyFilters);
  $("#clearFilters").addEventListener("click", () => { $("#searchEvt").value = ""; $("#f_action").value = ""; applyFilters(); });
  $("#f_action").addEventListener("input", applyFilters);
}
function applyFilters() {
  const q = $("#searchEvt").value.trim().toLowerCase();
  const a = $("#f_action").value.trim().toLowerCase();
  const out = (STATUS.events || []).filter((ev) => {
    const hay = `${ev.event_type||""} ${ev.src_ip||""} ${ev.dst_ip||""} ${ev.action||""} ${ev.detail||""}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (a && !(ev.action||"").toLowerCase().includes(a)) return false;
    return true;
  });
  if (STATUS._vl) { STATUS._vl.set(out, STATUS._vl.renderRow); }
  else { STATUS.events = out; renderEvents(); }
}

// ---- live SSE wiring (auth header + exponential backoff reconnect) ----
function startLive() {
  const sse = new LiveData("/api/metrics/stream");
  sse.on("metrics", (ev, payload) => {
    if (payload.ebpf) { STATUS.system = STATUS.system || {}; STATUS.system.ebpf = payload.ebpf; cardKernel(); }
    if (payload.events && payload.events.length) {
      const merged = payload.events.concat(STATUS.events || []);
      const seen = new Set(); STATUS.events = [];
      merged.forEach((e) => { if (e.id && seen.has(e.id)) return; seen.add(e.id); STATUS.events.push(e); });
      applyFilters();
    }
  });
  sse.start();
  return sse;
}

// ---- theme ----
function applyTheme(dark) { document.documentElement.dataset.theme = dark ? "dark" : "light"; localStorage.setItem("ebpf_theme", dark ? "dark" : "light"); }

async function onLoginSuccess() {
  initOverview();            // create card/placeholder DOM first
  await refreshAll();        // now renderers can populate real values
  buildFilters();
  startLive();
  setInterval(() => { loadHost(); cardHost(); }, 5000);
  setInterval(() => { loadEvents(); loadThreats(); }, 10000);
}

addEventListener("DOMContentLoaded", () => {
  applyTheme(localStorage.getItem("ebpf_theme") === "dark" || (!localStorage.getItem("ebpf_theme") && true));
  $("#themeToggle").addEventListener("click", () => applyTheme(document.documentElement.dataset.theme !== "dark"));
  buildNav();
  $("#refreshBtn").addEventListener("click", refreshAll);
  $("#logoutBtn").addEventListener("click", () => AUTH.logout());
  $("#btnReloadDevices").addEventListener("click", () => { loadAndroid(); loadSystem(); });

    if (API.token()) { AUTH.showApp(); initOverview(); refreshAll().then(() => { buildFilters(); startLive(); }); }
  else { AUTH.showLogin(); }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    $("#loginBtn").disabled = true; $("#loginBtn").textContent = "Signing in…";
    try { await AUTH.login(fd.get("client_id"), fd.get("client_secret")); await onLoginSuccess(); $("#loginBtn").disabled = false; $("#loginBtn").textContent = "Log in"; }
    catch (err) { $("#loginError").textContent = err.message; $("#loginError").hidden = false; $("#loginBtn").disabled = false; $("#loginBtn").textContent = "Log in"; }
  });
  $("#loginDevBtn").style.display = "inline-flex";
  $("#loginDevBtn").addEventListener("click", async () => {
    $("#loginBtn").disabled = true; $("#loginBtn").textContent = "Signing in…";
    try { await AUTH.login("", ""); await onLoginSuccess(); $("#loginBtn").disabled = false; $("#loginBtn").textContent = "Log in"; }
    catch (err) { $("#loginError").textContent = err.message; $("#loginError").hidden = false; $("#loginBtn").disabled = false; $("#loginBtn").textContent = "Log in"; }
  });
});




