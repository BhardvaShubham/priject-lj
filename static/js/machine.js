/* machine.js
   Load single machine details, sensors, performance and support tab switching.
   Expects `window.machine_id` to be set (number or string).
*/
(function () {
    const MID = (typeof window.machine_id !== 'undefined') ? window.machine_id : null;
    const el = id => document.getElementById(id);
    const nameEl = el('m_name'), typeEl = el('m_type'), statusEl = el('m_status'),
          lastEl = el('m_last'), sensorList = el('sensorList'), perfList = el('perfList'),
          trendImg = el('trendImg');
  
    function safeGet(k){ try{ return localStorage.getItem(k); }catch(e){return null}}
    function safeSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
    function fetchLow(url){
      if(window.__sapApp && typeof window.__sapApp.fetchJsonLow==='function'){
        return window.__sapApp.fetchJsonLow(url).catch(()=>null);
      }
      return fetch(url,{cache:'no-store'}).then(r=> r.ok? r.json(): null).catch(()=>null);
    }
    function escapeHtml(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  
    async function load(){
      if(!MID){ if(nameEl) nameEl.textContent = 'Unknown'; return; }
      const cacheKey = `pj_machine_${MID}`;
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
      if(statusEl) statusEl.textContent = d.status || '—';
      if(lastEl) lastEl.textContent = d.last_seen || '—';
  
      if(sensorList){
        if(d.sensors && d.sensors.length){
          sensorList.innerHTML = '';
          d.sensors.forEach(s=>{
            const div = document.createElement('div');
            div.className = 'sensor-row';
            div.innerHTML = `<strong>${escapeHtml(s.sensor_name)}</strong>: ${escapeHtml(s.value)} ${escapeHtml(s.unit||'')}`;
            sensorList.appendChild(div);
          });
        } else {
          sensorList.innerHTML = '<div class="muted">No sensor data</div>';
        }
      }
  
      if(perfList){
        if(d.recent_performance && d.recent_performance.length){
          perfList.innerHTML = '';
          d.recent_performance.forEach(p=>{
            const div = document.createElement('div');
            div.className = 'perf-row';
            div.innerHTML = `<strong>${escapeHtml(p.metric_date)}</strong> — Eff: ${p.efficiency ?? '—'}% · Uptime: ${p.uptime ?? '—'}%`;
            perfList.appendChild(div);
          });
        } else {
          perfList.innerHTML = '<div class="muted">No performance history</div>';
        }
      }
  
      if(trendImg){
        trendImg.src = `/chart/trend/${MID}.png?ts=${Date.now()}`;
      }
    }
  
    document.addEventListener('DOMContentLoaded', load);
  })();
  