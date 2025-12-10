/* alerts.js
   Populate alerts table and handle acknowledge action
*/
(function () {
    const TABLE_BODY = document.querySelector('#alertsTable tbody') || null;
    const LIST_DIV = document.getElementById('alertsList') || null;
  
    function safeGet(k){ try{ return localStorage.getItem(k); }catch(e){return null}}
    function safeSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
    function fetchLow(url, opts){
      if(window.__sapApp && typeof window.__sapApp.fetchJsonLow==='function'){
        return window.__sapApp.fetchJsonLow(url).catch(()=>null);
      }
      return fetch(url, opts).then(r=> r.ok? r.json(): null).catch(()=>null);
    }
    function escapeHtml(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  
    function renderTable(list){
      if(!TABLE_BODY) return;
      TABLE_BODY.innerHTML = '';
      if(!list || list.length===0){
        TABLE_BODY.innerHTML = '<tr><td colspan="6" class="muted">No alerts</td></tr>';
        return;
      }
      const frag = document.createDocumentFragment();
      list.forEach(a=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${a.id}</td>
                        <td>${escapeHtml(a.machine||'—')}</td>
                        <td>${escapeHtml(a.severity||'—')}</td>
                        <td>${escapeHtml(a.message||'—')}</td>
                        <td>${escapeHtml(a.raised_at||'—')}</td>
                        <td><button class="btn ack-btn" data-id="${a.id}">Ack</button></td>`;
        frag.appendChild(tr);
      });
      TABLE_BODY.appendChild(frag);
      // wire ack buttons
      document.querySelectorAll('.ack-btn').forEach(b=>{
        b.addEventListener('click', async (e)=>{
          const id = b.getAttribute('data-id');
          b.disabled = true;
          await fetch(`/api/alerts/${id}/ack`, {method:'POST'}).then(r=> r.ok ? r.json() : null).catch(()=>null);
          // refresh
          load();
        });
      });
    }
  
    function renderList(list){
      if(!LIST_DIV) return;
      LIST_DIV.innerHTML = '';
      if(!list || list.length===0){
        LIST_DIV.innerHTML = '<div class="muted">No active alerts</div>';
        return;
      }
      list.slice(0,10).forEach(a=>{
        const d = document.createElement('div');
        d.className = 'alert-row';
        d.innerHTML = `<strong>${escapeHtml(a.machine||'—')}</strong> — ${escapeHtml(a.message||'—')} <div class="muted small">${escapeHtml(a.raised_at||'')}</div>`;
        LIST_DIV.appendChild(d);
      });
    }
  
    async function load(){
      const cached = safeGet('pj_alerts');
      if(cached){
        try{ const arr=JSON.parse(cached); renderTable(arr); renderList(arr); }catch(e){}
      }
      const data = await fetchLow('/api/alerts?ack=0');
      if(!data){
        if(!cached){
          if(TABLE_BODY) TABLE_BODY.innerHTML = '<tr><td colspan="6" class="muted">Offline</td></tr>';
          if(LIST_DIV) LIST_DIV.textContent = 'Offline';
        }
        return;
      }
      safeSet('pj_alerts', JSON.stringify(data));
      renderTable(data);
      renderList(data);
    }
  
    document.addEventListener('DOMContentLoaded', load);
  })();
  