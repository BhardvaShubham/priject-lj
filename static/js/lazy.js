// static/js/lazy.js
// Tiny IntersectionObserver-based loader for images with data-src.
// Loads images when they are near the viewport and prevents CLS by using
// width/height or aspect-ratio in the HTML.

(function(){
    function loadImg(img){
      if(!img) return;
      const s = img.getAttribute('data-src');
      if(s){
        // append cache-buster if not present
        const url = s + (s.indexOf('?') === -1 ? '?ts=' + Date.now() : '&ts=' + Date.now());
        img.src = url;
        img.removeAttribute('data-src');
        img.classList.remove('lazy-chart--pending');
      }
    }
  
    function init(){
      const imgs = document.querySelectorAll('img.lazy-chart');
      if(!imgs || imgs.length === 0) return;
  
      if('IntersectionObserver' in window){
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if(e.isIntersecting){
              loadImg(e.target);
              io.unobserve(e.target);
            }
          });
        }, { rootMargin: '400px' }); // pre-load before visible
        imgs.forEach(i => {
          // fallback placeholder already provides reserved space
          io.observe(i);
        });
      } else {
        // Legacy: load after small delay but reserved layout prevents CLS
        setTimeout(()=> imgs.forEach(loadImg), 600);
      }
    }
  
    document.addEventListener('DOMContentLoaded', init);
  })();
  