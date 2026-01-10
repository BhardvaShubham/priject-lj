/* machine.js
   Load single machine details, sensors, performance.
   Phase-1.2 compliant: server-side machine + sensor charts.
*/
(function () {
  const MID = (typeof window.machine_id !== 'undefined') ? window.machine_id : null;

  const el = id => document.getElementById(id);
  const nameEl   = el('m_name');
  const typeEl   = el('m_type');
  const statusEl = el('m_status');
  const lastEl   = el('m_last');
  const sensorList = el('sensorList');
  const perfList   = el('perfList');
  const trendImg   = el('trendImg');

  function safeGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function safeSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

  async function fetchLow(url){
    if (window.__sapApp && window.__sapApp.fetchJsonLow){
      return window.__sapApp.fetchJsonLow(url);
    }
    try{
      const r = await fetch(url,{cache:'no-store'});
      return r.ok ? await r.json() : null;
    }catch(e){ return null; }
  }

  function esc(s){
    if(s==null) return '—';
    return String(s).replace(/[&<>"']/g,c=>(
      {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
    ));
  }

  async function load(){
    if(!MID){
      if(nameEl) nameEl.textContent = 'Unknown machine';
      return;
    }

    const cacheKey = `imcs_machine_${MID}`;
    const cached = safeGet(cacheKey);
    if(cached){
      try{ populate(JSON.parse(cached)); }catch(e){}
    }

    const data = await fetchLow(`/api/machines/${MID}`);
    if(!data){
      if(!cached){
        if(nameEl) nameEl.textContent = 'Offline';
        if(sensorList) sensorList.textContent = 'Offline';
        if(perfList) perfList.textContent = 'Offline';
      }
      return;
    }

    safeSet(cacheKey, JSON.stringify(data));
    populate(data);
  }

  function populate(d){
    if(!d) return;

    if(nameEl) nameEl.textContent = d.name || '—';
    if(typeEl) typeEl.textContent = `${d.type || '—'} · ${d.location || '—'}`;
    if(statusEl) {
      statusEl.textContent = d.status || '—';
      // Add status badge class
      statusEl.className = 'large status-badge ' + (d.status || '').toLowerCase();
    }
    if(lastEl) lastEl.textContent = d.last_seen || '—';

    /* ================= MACHINE CHART ================= */
    const machineChartImg = document.getElementById('machineChart');
    if(machineChartImg){
      machineChartImg.src = `/chart/machine/${MID}.png?ts=${Date.now()}`;
    }

    /* ================= SENSORS (Enhanced) ================= */
    const sensorListEl = document.getElementById('sensorList');
    if(sensorListEl){
      if(d.sensor_stats && d.sensor_stats.length > 0){
        // Use enhanced sensor stats if available
        sensorListEl.innerHTML = d.sensor_stats.map(s => `
          <div class="sensor-card">
            <div class="sensor-name">${esc(s.name)} (${esc(s.unit)})</div>
            <div class="sensor-stats">
              Avg: ${s.avg.toFixed(2)} ${esc(s.unit)}<br>
              Min: ${s.min.toFixed(2)} ${esc(s.unit)}<br>
              Max: ${s.max.toFixed(2)} ${esc(s.unit)}<br>
              Readings: ${s.count}
            </div>
          </div>
        `).join('');
      } else if(d.sensors && d.sensors.length){
        // Fallback to basic sensor display
        sensorListEl.innerHTML = d.sensors.map(s => `
          <div class="sensor-card">
            <div class="sensor-name">${esc(s.sensor_name)}</div>
            <div class="sensor-stats">
              Value: ${esc(s.value)} ${esc(s.unit || '')}
            </div>
          </div>
        `).join('');
      } else {
        sensorListEl.innerHTML = '<div class="muted small">No sensors configured</div>';
      }
    }

    /* ================= PERFORMANCE TABLE (Enhanced) ================= */
    const perfTable = document.querySelector('#perfTable tbody');
    if(perfTable && d.performance && d.performance.length > 0){
      perfTable.innerHTML = d.performance.slice(0, 10).map(p => `
        <tr>
          <td>${esc(p.date)}</td>
          <td>${p.efficiency ?? '—'}%</td>
          <td>${p.min ?? '—'}%</td>
          <td>${p.max ?? '—'}%</td>
          <td>${p.readings ?? 0}</td>
        </tr>
      `).join('');
    } else if(perfList && d.recent_performance && d.recent_performance.length){
      // Fallback to list view
      perfList.innerHTML = d.recent_performance.map(p => `
        <div class="perf-row">
          <strong>${esc(p.metric_date)}</strong>
          — Efficiency: ${p.efficiency ?? '—'}%
          ${p.uptime ? `· Uptime: ${p.uptime}%` : ''}
        </div>
      `).join('');
    }
  }

  document.addEventListener('DOMContentLoaded', load);
})();
