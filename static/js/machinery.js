/* machinery.js
   Populate machines table (offline-first), search, and simple UX behavior
*/
(function () {
    const TABLE_BODY = document.querySelector('#machinesTable tbody');
    const SEARCH = document.getElementById('searchInput');
  
    function safeGet(k){ try{ return localStorage.getItem(k); }catch(e){return null}}
    function safeSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
    function fetchLow(url){
      if(window.__sapApp && typeof window.__sapApp.fetchJsonLow==='function'){
        return window.__sapApp.fetchJsonLow(url).catch(()=>null);
      }
      return fetch(url,{cache:'no-store'}).then(r=> r.ok? r.json(): null).catch(()=>null);
    }
    function escapeHtml(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  
    function render(list){
      if(!TABLE_BODY) return;
      TABLE_BODY.innerHTML = '';
      if(!list || list.length===0){
        TABLE_BODY.innerHTML = '<tr><td colspan="5" class="muted">No machines</td></tr>';
        return;
      }
      const frag = document.createDocumentFragment();
      list.forEach(m=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><a href="/machine/${m.id}">${escapeHtml(m.name)}</a></td>
                        <td>${escapeHtml(m.type)}</td>
                        <td>${escapeHtml(m.location)}</td>
                        <td>${escapeHtml(m.status||'—')}</td>
                        <td>${(m.efficiency!=null)?m.efficiency:'—'}</td>`;
        frag.appendChild(tr);
      });
      TABLE_BODY.appendChild(frag);
    }
  
    async function load(){
      // cache
      const cached = safeGet('pj_machines');
      if(cached){
        try{ render(JSON.parse(cached)); }catch(e){}
      }
  
      const data = await fetchLow('/api/machines');
      if(!data){
        if(!cached) TABLE_BODY.innerHTML = '<tr><td colspan="5" class="muted">Offline</td></tr>';
        return;
      }
      safeSet('pj_machines', JSON.stringify(data));
      render(data);
    }
  
    function attachSearch(){
      if(!SEARCH) return;
      SEARCH.addEventListener('input', ()=>{
        const q = SEARCH.value.trim().toLowerCase();
        Array.from(document.querySelectorAll('#machinesTable tbody tr')).forEach(r=>{
          r.style.display = q ? (r.textContent.toLowerCase().indexOf(q)===-1 ? 'none' : '') : '';
        });
      });
    }
  
    document.addEventListener('DOMContentLoaded', ()=>{
      load();
      attachSearch();
    });
  
  })();
  /* ================= ADD MACHINE MODAL ================= */

const modal = document.getElementById('addMachineModal');
const openBtn = document.getElementById('addMachineBtn');
const closeBtn = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelModal');
const saveBtn = document.getElementById('saveMachineBtn');

if (openBtn) openBtn.onclick = () => modal.classList.remove('hidden');
if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
if (cancelBtn) cancelBtn.onclick = () => modal.classList.add('hidden');

if (saveBtn) {
  saveBtn.onclick = async () => {
    const payload = {
      name: document.getElementById('m_name').value,
      type: document.getElementById('m_type').value,
      location: document.getElementById('m_location').value,
      rated_capacity: Number(document.getElementById('m_capacity').value) || null
    };

    if (!payload.name || !payload.type || !payload.location) {
      alert("All fields except capacity are required");
      return;
    }

    try {
      const res = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed");

      modal.classList.add('hidden');
      localStorage.removeItem('pj_machines'); // clear cache
      location.reload(); // reload machinery list
    } catch {
      alert("Unable to add machine (offline?)");
    }
  };
}

  