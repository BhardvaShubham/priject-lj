/* tabs.js
   Simple tabbed UI helper used by machine-details.html
*/
(function () {
    function activateTab(btn){
      const target = btn.getAttribute('data-tab');
      if(!target) return;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const content = document.getElementById(target);
      if(content) content.classList.add('active');
    }
  
    document.addEventListener('DOMContentLoaded', ()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>{
        b.addEventListener('click', ()=> activateTab(b));
      });
    });
  })();
  