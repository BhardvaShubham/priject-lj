/* dashboard.js — Enhanced dashboard logic for Belize UI
   - Populates new enterprise sections: system health, plant summaries,
     status distribution, underperforming machines, maintenance forecast,
     event timeline, AI insights
   - Offline-first: caches last successful responses in localStorage
   - Uses window.__sapApp.fetchJsonLow(...) as the low-bandwidth fetch helper
*/

(function () {
    // --- Helpers ---
    function safeGet(key, fallback = null) {
      try { return localStorage.getItem(key); } catch (e) { return fallback; }
    }
    function safeSet(key, val) {
      try { localStorage.setItem(key, val); } catch (e) { /* ignore */ }
    }
  
    function escapeHtml(s) {
      if (s === null || s === undefined) return "";
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
  
    function el(id) { return document.getElementById(id); }
    function nowTs() { return (new Date()).toISOString(); }
  
    // --- Cache keys & TTLs (ms) ---
    const CACHE = {
      SUMMARY: 'dh_summary',
      MACHINES: 'dh_machines',
      ALERTS: 'dh_alerts',
      MAINT: 'dh_maint'
    };
    const TTL = {
      SUMMARY: 60 * 1000,    // 1 min
      MACHINES: 2 * 60 * 1000, // 2 min
      ALERTS: 60 * 1000,
      MAINT: 5 * 60 * 1000
    };
  
    function cacheSave(key, obj) {
      try { safeSet(key, JSON.stringify({ ts: Date.now(), v: obj })); } catch (e) {}
    }
    function cacheLoad(key, maxAge) {
      try {
        const raw = safeGet(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.ts) return null;
        if ((Date.now() - parsed.ts) > maxAge) return null;
        return parsed.v;
      } catch (e) { return null; }
    }
  
    // --- DOM targets ---
    const targets = {
      k_total: el('k_total'),
      k_eff: el('k_eff'),
      k_alerts: el('k_alerts'),
      sys_health: el('sys_health'),
      summaryImg: el('summaryImg'),
      alertsList: el('alertsList'),
      machinesTableBody: (function(){ const t=document.querySelector('#machinesTable tbody'); return t; })(),
      searchInput: el('searchInput'),
      statusPie: el('statusPie'),
      lowEffList: el('lowEffList'),
      pa_eff: el('pa_eff'),
      pb_eff: el('pb_eff'),
      pc_eff: el('pc_eff'),
      maintForecast: el('maintForecast'),
      eventTimeline: el('eventTimeline'),
      aiInsights: el('aiInsights'),
      refreshBtn: el('refreshBtn')
    };
  
    // --- Low-bandwidth fetch wrapper fallback ---
    async function fetchLow(url) {
      if (window.__sapApp && typeof window.__sapApp.fetchJsonLow === 'function') {
        try {
          return await window.__sapApp.fetchJsonLow(url);
        } catch (e) {
          // fallthrough to fetch
        }
      }
      // last-resort plain fetch
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) return null;
        return await r.json();
      } catch (e) {
        return null;
      }
    }
  
    // --- Loaders ---
    async function loadSummary() {
      // Try cache first
      const cached = cacheLoad(CACHE.SUMMARY, TTL.SUMMARY);
      if (cached) populateSummary(cached);
  
      // Network
      const data = await fetchLow('/api/summary');
      if (!data) {
        if (!cached) showSummaryOffline();
        return;
      }
      cacheSave(CACHE.SUMMARY, data);
      populateSummary(data);
    }
  
    function showSummaryOffline() {
      if (targets.k_total) targets.k_total.textContent = '—';
      if (targets.k_eff) targets.k_eff.textContent = '—%';
      if (targets.k_alerts) targets.k_alerts.textContent = '—';
      if (targets.sys_health) targets.sys_health.textContent = 'Offline';
    }
  
    function populateSummary(data) {
      try {
        if (targets.k_total) targets.k_total.textContent = (data.total_machines !== undefined) ? data.total_machines : '—';
        if (targets.k_eff) targets.k_eff.textContent = (data.avg_efficiency !== undefined) ? (data.avg_efficiency + '%') : '—%';
        if (targets.k_alerts) targets.k_alerts.textContent = (data.active_alerts !== undefined) ? data.active_alerts : '—';
        if (targets.summaryImg) targets.summaryImg.src = '/chart/summary.png?ts=' + Date.now();
  
        // sys health: light check (DB count ok?)
        let healthText = 'OK';
        try {
          const machinesLen = (data.machines && data.machines.length) ? data.machines.length : 0;
          if (machinesLen === 0) healthText = 'No machines';
        } catch (e) { healthText = 'Unknown'; }
        if (targets.sys_health) targets.sys_health.textContent = healthText;
      } catch (e) { console.error('populateSummary', e); }
    }
  
    async function loadMachines() {
      const cached = cacheLoad(CACHE.MACHINES, TTL.MACHINES);
      if (cached) populateMachines(cached);
  
      const data = await fetchLow('/api/machines');
      if (!data) {
        if (!cached) showMachinesOffline();
        return;
      }
      cacheSave(CACHE.MACHINES, data);
      populateMachines(data);
    }
  
    function showMachinesOffline() {
      if (targets.machinesTableBody) {
        targets.machinesTableBody.innerHTML = '<tr><td colspan="5" class="muted small center">Offline</td></tr>';
      }
    }
  
    function populateMachines(list) {
      try {
        // table
        if (!targets.machinesTableBody) return;
        if (!list || list.length === 0) {
          targets.machinesTableBody.innerHTML = '<tr><td colspan="5" class="muted small">No machines</td></tr>';
        } else {
          targets.machinesTableBody.innerHTML = '';
          list.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><a href="/machine/${m.id}">${escapeHtml(m.name)}</a></td>
              <td>${escapeHtml(m.type)}</td>
              <td>${escapeHtml(m.location)}</td>
              <td>${statusIconHtml(m.status)} ${escapeHtml(m.status||'—')}</td>
              <td>${(m.efficiency !== undefined && m.efficiency !== null) ? m.efficiency : 0}</td>
            `;
            targets.machinesTableBody.appendChild(tr);
          });
        }
  
        // Underperforming machines
        populateLowEffList(list);
  
        // Plant efficiencies (simple heuristics: group by location)
        populatePlantSummary(list);
  
        // Event timeline seeds (from machine last_seen)
        seedEventTimelineFromMachines(list);
  
      } catch (e) { console.error('populateMachines', e); }
    }
  
    function statusIconHtml(s) {
      if (!s) return '';
      s = String(s).toLowerCase();
      if (s.indexOf('run') !== -1) return '<img src="/static/icons/play.svg" class="status-icon" alt="" />';
      if (s.indexOf('warn') !== -1) return '<img src="/static/icons/pause.svg" class="status-icon" alt="" />';
      return '<img src="/static/icons/stop.svg" class="status-icon" alt="" />';
    }
  
    function populateLowEffList(list) {
      try {
        if (!targets.lowEffList) return;
        if (!list || list.length === 0) { targets.lowEffList.innerHTML = '<div class="muted small">—</div>'; return; }
        // sort by efficiency asc; keep machines with non-null efficiency
        const arr = list.filter(m => typeof m.efficiency === 'number').sort((a,b) => a.efficiency - b.efficiency).slice(0,6);
        if (arr.length === 0) { targets.lowEffList.innerHTML = '<div class="muted small">No efficiency data</div>'; return; }
        targets.lowEffList.innerHTML = '';
        arr.forEach(m => {
          const node = document.createElement('div');
          node.className = 'low-eff-item';
          node.innerHTML = `<div class="item-left"><a href="/machine/${m.id}">${escapeHtml(m.name)}</a></div>
                            <div class="item-right">${m.efficiency}%</div>`;
          targets.lowEffList.appendChild(node);
        });
      } catch (e) { console.error(e); }
    }
  
    function populatePlantSummary(list) {
      try {
        // group by location (plant)
        const groups = {};
        (list || []).forEach(m => {
          const loc = (m.location || 'Unknown');
          groups[loc] = groups[loc] || { sum:0, count:0 };
          if (typeof m.efficiency === 'number') { groups[loc].sum += m.efficiency; groups[loc].count += 1; }
        });
        // simple mapping: pick Plant A/B/C if present, else fill with '—'
        const getPlant = (name) => {
          if (!groups[name] || groups[name].count === 0) return '—';
          return Math.round((groups[name].sum / groups[name].count) * 10) / 10;
        };
        if (targets.pa_eff) targets.pa_eff.textContent = (getPlant('Plant A') === '—') ? '—%' : (getPlant('Plant A') + '%');
        if (targets.pb_eff) targets.pb_eff.textContent = (getPlant('Plant B') === '—') ? '—%' : (getPlant('Plant B') + '%');
        if (targets.pc_eff) targets.pc_eff.textContent = (getPlant('Plant C') === '—') ? '—%' : (getPlant('Plant C') + '%');
  
        // status pie: request a server-side generated pie endpoint (or fallback to cached)
        if (targets.statusPie) {
          // cache-bust
          targets.statusPie.src = '/chart/status.png?ts=' + Date.now();
        }
      } catch (e) { console.error('populatePlantSummary', e); }
    }
  
    // --- Alerts & maintenance ---
    async function loadAlerts() {
      const cached = cacheLoad(CACHE.ALERTS, TTL.ALERTS);
      if (cached) populateAlerts(cached);
  
      const data = await fetchLow('/api/alerts?ack=0');
      if (!data) {
        if (!cached) showAlertsOffline();
        return;
      }
      cacheSave(CACHE.ALERTS, data);
      populateAlerts(data);
    }
  
    function showAlertsOffline() {
      if (targets.alertsList) targets.alertsList.textContent = 'Offline';
    }
  
    function populateAlerts(list) {
      try {
        if (!targets.alertsList) return;
        if (!list || list.length === 0) { targets.alertsList.innerHTML = '<div class="muted small">No active alerts</div>'; return; }
        targets.alertsList.innerHTML = '';
        list.slice(0,10).forEach(a => {
          const node = document.createElement('div');
          node.className = 'alert-row';
          node.innerHTML = `<div class="alert-left"><strong>${escapeHtml(a.machine||'—')}</strong> <span class="muted tiny">[${escapeHtml(a.severity||'')}]</span></div>
                            <div class="alert-right">${escapeHtml(a.message)}</div>
                            <div class="muted tiny">${escapeHtml(a.raised_at||'')}</div>`;
          targets.alertsList.appendChild(node);
        });
  
        // add alerts to timeline
        seedEventTimelineFromAlerts(list);
      } catch (e) { console.error('populateAlerts', e); }
    }
  
    async function loadMaintenance() {
      const cached = cacheLoad(CACHE.MAINT, TTL.MAINT);
      if (cached) populateMaintenance(cached);
  
      const data = await fetchLow('/api/maintenance');
      if (!data) {
        if (!cached) showMaintOffline();
        return;
      }
      cacheSave(CACHE.MAINT, data);
      populateMaintenance(data);
    }
  
    function showMaintOffline() {
      if (targets.maintForecast) targets.maintForecast.textContent = 'Offline';
    }
  
    function populateMaintenance(list) {
      try {
        if (!targets.maintForecast) return;
        if (!list || list.length === 0) { targets.maintForecast.innerHTML = '<div class="muted small">No scheduled tasks</div>'; return; }
  
        // next 7 days count and overdue count
        const now = new Date();
        const in7 = new Date(now.getTime() + (7*24*60*60*1000));
        let upcoming = 0, overdue = 0;
        const lines = [];
  
        list.forEach(t => {
          const sched = t.scheduled_date ? new Date(t.scheduled_date) : null;
          if (sched) {
            if (sched < now && t.status !== 'done') overdue++;
            if (sched >= now && sched <= in7) upcoming++;
          }
          lines.push(`<div class="task-row"><strong>${escapeHtml(t.machine||'—')}</strong> — ${escapeHtml(t.description||'')} <div class="muted tiny">(${escapeHtml(t.priority||'')}) ${escapeHtml(t.scheduled_date||'—')}</div></div>`);
        });
  
        targets.maintForecast.innerHTML = `<div class="muted small">Upcoming: ${upcoming} · Overdue: ${overdue}</div>` + lines.slice(0,6).join('');
        // also add to timeline
        seedEventTimelineFromMaintenance(list);
      } catch (e) { console.error('populateMaintenance', e); }
    }
  
    // --- Event timeline & AI insights
    function seedEventTimelineFromAlerts(alerts) {
      try {
        if (!alerts || !Array.isArray(alerts)) return;
        const items = alerts.slice(0, 8).map(a => ({ t: a.raised_at || nowTs(), text: `${a.severity || 'Alert'}: ${a.machine || '—'} — ${a.message || ''}` }));
        addToTimeline(items);
      } catch (e) { console.error(e); }
    }
    function seedEventTimelineFromMaintenance(tasks) {
      try {
        if (!tasks || !Array.isArray(tasks)) return;
        const items = tasks.slice(0,8).map(t => ({ t: t.created_at || nowTs(), text: `Task: ${t.machine || '—'} — ${t.description || ''}` }));
        addToTimeline(items);
      } catch (e) { console.error(e); }
    }
    function seedEventTimelineFromMachines(machines) {
      try {
        if (!machines || !Array.isArray(machines)) return;
        const items = machines.slice(0,6).map(m => ({ t: m.last_seen || nowTs(), text: `Seen: ${m.name} — ${m.status || '—'}` }));
        addToTimeline(items);
      } catch (e) { console.error(e); }
    }
  
    function addToTimeline(items) {
      try {
        // read existing timeline from localStorage (so timeline grows)
        let existing = [];
        try { existing = JSON.parse(safeGet('dh_timeline') || '[]'); } catch(e) { existing = []; }
        // prepend new items (ensure ISO sort)
        items.forEach(it => existing.unshift(it));
        // keep latest 50
        existing = existing.slice(0, 50);
        safeSet('dh_timeline', JSON.stringify(existing));
        renderTimeline(existing);
      } catch (e) { console.error(e); }
    }
  
    function renderTimeline(list) {
      try {
        if (!targets.eventTimeline) return;
        if (!list || list.length === 0) { targets.eventTimeline.innerHTML = '<div class="muted small">No events</div>'; return; }
        targets.eventTimeline.innerHTML = '';
        list.slice(0, 20).forEach(it => {
          const d = document.createElement('div');
          d.className = 'timeline-row';
          const time = it.t ? new Date(it.t).toLocaleString() : '';
          d.innerHTML = `<div class="tl-time muted tiny">${escapeHtml(time)}</div><div class="tl-text">${escapeHtml(it.text)}</div>`;
          targets.eventTimeline.appendChild(d);
        });
      } catch (e) { console.error('renderTimeline', e); }
    }
  
    function computeAiInsights(summary, machines, alerts) {
      // Very simple heuristics offline-capable
      const insights = [];
      try {
        // if many alerts -> "Investigate cluster"
        const alertCount = (alerts && alerts.length) ? alerts.length : 0;
        if (alertCount > 5) insights.push(`High alert volume (${alertCount}) — investigate common root causes.`);
        // find machines with low efficiency
        const mm = (machines || []).filter(m => typeof m.efficiency === 'number');
        mm.sort((a,b) => a.efficiency - b.efficiency);
        if (mm.length && mm[0].efficiency < 60) insights.push(`Machine ${mm[0].name} low efficiency (${mm[0].efficiency}%) — schedule inspection.`);
        // if average efficiency low
        if (summary && summary.avg_efficiency && summary.avg_efficiency < 75) insights.push(`Average efficiency ${summary.avg_efficiency}% below target. Consider preventive maintenance.`);
        if (insights.length === 0) insights.push('No critical insights — operations stable.');
      } catch (e) { insights.push('AI insights unavailable.'); }
      return insights;
    }
  
    function renderAiInsights(list) {
      try {
        if (!targets.aiInsights) return;
        if (!list || list.length === 0) { targets.aiInsights.innerHTML = '<div class="muted small">No insights</div>'; return; }
        targets.aiInsights.innerHTML = list.map(i => `<div class="ai-item">• ${escapeHtml(i)}</div>`).join('');
      } catch (e) { console.error('renderAiInsights', e); }
    }
  
    // --- Wiring: refresh and search
    function attachHandlers() {
      if (targets.refreshBtn) targets.refreshBtn.addEventListener('click', refreshAll);
      if (targets.searchInput) {
        targets.searchInput.addEventListener('input', () => {
          const q = targets.searchInput.value.toLowerCase();
          Array.from(document.querySelectorAll('#machinesTable tbody tr')).forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
          });
        });
      }
    }
  
    // --- Top-level refresh orchestration
    async function refreshAll() {
      // run parallel loads
      const pSummary = loadSummary();
      const pMachines = loadMachines();
      const pAlerts = loadAlerts();
      const pMaint = loadMaintenance();
  
      // after all, compute AI insights from cached results
      const results = await Promise.all([pSummary, pMachines, pAlerts, pMaint]);
      try {
        const summary = cacheLoad(CACHE.SUMMARY, TTL.SUMMARY) || {};
        const machines = cacheLoad(CACHE.MACHINES, TTL.MACHINES) || [];
        const alerts = cacheLoad(CACHE.ALERTS, TTL.ALERTS) || [];
        const insights = computeAiInsights(summary, machines, alerts);
        renderAiInsights(insights);
      } catch (e) { console.error('post-refresh AI', e); }
    }
  
    // --- Initialize
    function init() {
      attachHandlers();
      // render timeline from cache immediately
      try {
        const tl = JSON.parse(safeGet('dh_timeline') || '[]');
        renderTimeline(tl);
      } catch (e) {}
      // initial refresh
      refreshAll();
      // periodic background refresh (graceful intervals)
      setInterval(refreshAll, 60 * 1000); // every 60s
    }
  
    // Start
    document.addEventListener('DOMContentLoaded', init);
  
  })();
  