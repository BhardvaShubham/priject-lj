/* reports.js
   Mostly lightweight; refreshes charts and shows offline message if needed.
*/
(function () {
    const SUMMARY_IMG = document.querySelector('.chart-img') || null;
  
    function fetchLow(url){
      if(window.__sapApp && typeof window.__sapApp.fetchJsonLow==='function'){
        return window.__sapApp.fetchJsonLow(url).catch(()=>null);
      }
      return fetch(url,{cache:'no-store'}).then(r=> r.ok? r.json(): null).catch(()=>null);
    }
  
    async function refreshCharts(){
      if(!SUMMARY_IMG) return;
      // try to request a small endpoint to check server, but we will just set src with cache-bust
      SUMMARY_IMG.src = '/chart/summary.png?ts=' + Date.now();
    }
  
    document.addEventListener('DOMContentLoaded', ()=>{
      refreshCharts();
      // periodic refresh every 90s
      setInterval(refreshCharts, 90*1000);
    });
  })();
  