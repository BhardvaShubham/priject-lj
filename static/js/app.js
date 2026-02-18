/* app.js — Global: sidebar collapse, nav-section collapse, nav search, theme cycle
   Works on ALL pages. Sidebar state persisted in localStorage.
*/
(function () {
  'use strict';

  const SIDEBAR_KEY = 'sap_sidebar_collapsed';
  const THEME_KEY = 'sap_theme_choice';
  const THEMES = ['belize-light', 'belize-dark', 'signature'];

  /* ── theme ── */
  function readTheme() {
    try { const t = localStorage.getItem(THEME_KEY); if (t && THEMES.includes(t)) return t; } catch (_) { }
    return 'belize-light';
  }
  function applyTheme(t) {
    if (!THEMES.includes(t)) t = 'belize-light';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (_) { }
    const btn = document.getElementById('themeCycleBtn');
    if (btn) btn.textContent = { 'belize-light': 'Belize Light', 'belize-dark': 'Belize Dark', 'signature': 'Signature' }[t] || 'Theme';
  }

  /* ── sidebar collapse ── */
  function isSidebarCollapsed() {
    try { return localStorage.getItem(SIDEBAR_KEY) === 'true'; } catch (_) { return false; }
  }
  function saveSidebarState(collapsed) {
    try { localStorage.setItem(SIDEBAR_KEY, collapsed ? 'true' : 'false'); } catch (_) { }
  }

  function applySidebar(collapsed) {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) return;
    if (collapsed) {
      sidebar.classList.add('collapsed');
    } else {
      sidebar.classList.remove('collapsed');
    }
    saveSidebarState(collapsed);
    updateToggleBtn(collapsed);
  }

  function updateToggleBtn(collapsed) {
    const btn = document.querySelector('.sidebar-toggle');
    if (!btn) return;
    btn.textContent = collapsed ? '▶' : '◀';
    btn.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  }

  function toggleSidebar() {
    const sidebar = document.querySelector('.app-sidebar');
    if (!sidebar) return;
    const nowCollapsed = sidebar.classList.contains('collapsed');
    applySidebar(!nowCollapsed);
  }

  /* ── nav section collapse ── */
  function initNavSections() {
    document.querySelectorAll('.nav-section-header').forEach(header => {
      const section = header.closest('.nav-section');
      if (!section) return;
      const id = header.getAttribute('data-section') || Math.random();
      const key = 'nav_sec_' + id;
      // restore state
      if (localStorage.getItem(key) === 'true') section.classList.add('collapsed');

      header.addEventListener('click', e => {
        e.preventDefault();
        section.classList.toggle('collapsed');
        try { localStorage.setItem(key, section.classList.contains('collapsed') ? 'true' : 'false'); } catch (_) { }
      });
    });
  }

  /* ── nav search ── */
  function initNavSearch() {
    const input = document.getElementById('navSearch');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      document.querySelectorAll('.nav-item').forEach(item => {
        const text = (item.getAttribute('data-search') || '') + ' ' + (item.textContent || '');
        const show = !q || text.toLowerCase().includes(q);
        item.style.display = show ? '' : 'none';
        if (q && show) item.style.background = 'rgba(255,200,87,0.15)';
        else item.style.background = '';
      });
      // auto-expand sections with visible items
      if (q) {
        document.querySelectorAll('.nav-section').forEach(sec => {
          const hasVisible = [...sec.querySelectorAll('.nav-item')].some(i => i.style.display !== 'none');
          if (hasVisible) sec.classList.remove('collapsed');
        });
      }
    });
  }

  /* ── fetch helper ── */
  async function fetchJsonLow(url, opts) {
    try {
      const res = await fetch(url, Object.assign({ cache: 'no-store' }, opts || {}));
      if (!res.ok) throw new Error('network');
      return await res.json();
    } catch (_) { return null; }
  }

  /* ── expose API ── */
  window.__sapApp = window.__sapApp || {};
  Object.assign(window.__sapApp, { applyTheme, readTheme, fetchJsonLow, toggleSidebar, applySidebar });

  /* ── init on DOM ready ── */
  function init() {
    // theme
    applyTheme(readTheme());
    const themeBtn = document.getElementById('themeCycleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = readTheme();
        applyTheme(THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length]);
      });
    }

    // sidebar — apply saved state first, then wire button
    const collapsed = isSidebarCollapsed();
    applySidebar(collapsed);

    const toggleBtn = document.querySelector('.sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', e => {
        e.preventDefault();
        toggleSidebar();
      });
    }

    // nav sections & search
    initNavSections();
    initNavSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init(); // already ready (e.g. script loaded after DOM)
  }

})();