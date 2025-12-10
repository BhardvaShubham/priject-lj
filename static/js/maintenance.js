/* maintenance.js
   List maintenance tasks and create new tasks
*/
(function () {
    const TASK_TBODY = document.querySelector('#maintTable tbody') || null;
    const CREATE_BTN = document.getElementById('createTaskBtn');
    const INPUT_ID = document.getElementById('m_id');
    const INPUT_DESC = document.getElementById('m_desc');
    const INPUT_TECH = document.getElementById('m_tech');
    const INPUT_DATE = document.getElementById('m_date');
  
    function safeGet(k){ try{ return localStorage.getItem(k); }catch(e){return null}}
    function safeSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
    function fetchLow(url, opts){
      if(window.__sapApp && typeof window.__sapApp.fetchJsonLow==='function' && (!opts || opts.method==='GET')){
        return window.__sapApp.fetchJsonLow(url).catch(()=>null);
      }
      return fetch(url, opts).then(r=> r.ok? r.json(): null).catch(()=>null);
    }
    function escapeHtml(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  
    function render(list){
      if(!TASK_TBODY) return;
      TASK_TBODY.innerHTML = '';
      if(!list || list.length===0){
        TASK_TBODY.innerHTML = '<tr><td colspan="6" class="muted">No tasks</td></tr>';
        return;
      }
      const frag = document.createDocumentFragment();
      list.forEach(t=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${t.id || '-'}</td>
                        <td>${escapeHtml(t.machine || (t.machine_id || '-'))}</td>
                        <td>${escapeHtml(t.description || '-')}</td>
                        <td>${escapeHtml(t.priority || '-')}</td>
                        <td>${escapeHtml(t.technician || '-')}</td>
                        <td>${escapeHtml(t.scheduled_date || '-')}</td>`;
        frag.appendChild(tr);
      });
      TASK_TBODY.appendChild(frag);
    }
  
    async function load(){
      const cached = safeGet('pj_maint');
      if(cached){
        try{ render(JSON.parse(cached)); }catch(e){}
      }
      const data = await fetchLow('/api/maintenance');
      if(!data){
        if(!cached && TASK_TBODY) TASK_TBODY.innerHTML = '<tr><td colspan="6" class="muted">Offline</td></tr>';
        return;
      }
      safeSet('pj_maint', JSON.stringify(data));
      render(data);
    }
  
    async function createTask(){
      const payload = {
        machine_id: (INPUT_ID && INPUT_ID.value) ? INPUT_ID.value : null,
        description: (INPUT_DESC && INPUT_DESC.value) ? INPUT_DESC.value : '',
        technician: (INPUT_TECH && INPUT_TECH.value) ? INPUT_TECH.value : '',
        scheduled_date: (INPUT_DATE && INPUT_DATE.value) ? INPUT_DATE.value : null,
        priority: 'medium'
      };
      CREATE_BTN.disabled = true;
      try{
        const res = await fetch('/api/maintenance', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        }).then(r=> r.ok ? r.json() : null).catch(()=>null);
        if(res && res.ok){
          // clear fields and reload
          if(INPUT_DESC) INPUT_DESC.value = '';
          if(INPUT_TECH) INPUT_TECH.value = '';
          if(INPUT_DATE) INPUT_DATE.value = '';
          if(INPUT_ID) INPUT_ID.value = '';
          // refresh
          load();
        } else {
          alert('Failed to create task (offline or server error).');
        }
      }catch(e){
        console.error(e);
      }finally{
        CREATE_BTN.disabled = false;
      }
    }
  
    document.addEventListener('DOMContentLoaded', ()=>{
      load();
      if(CREATE_BTN) CREATE_BTN.addEventListener('click', createTask);
    });
  })();
  