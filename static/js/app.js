/* app.js - global JS for theme cycle toggle + sidebar collapse + small helpers
   Cycle sequence: belize-light -> belize-dark -> signature -> belize-light -> ...
   Saves selection in localStorage to persist between page loads.
   Sidebar collapse state is also persisted in localStorage.
*/

(function () {
    "use strict";

    const THEME_KEY = "sap_theme_choice";
    const SIDEBAR_COLLAPSED_KEY = "sap_sidebar_collapsed";
    const sequence = ["belize-light", "belize-dark", "signature"];
    // default to belize-light (official)
    const defaultTheme = "belize-light";

    function readTheme() {
      try {
        const x = localStorage.getItem(THEME_KEY);
        if (x && sequence.includes(x)) return x;
      } catch (e) { /* ignore storage errors */ }
      return defaultTheme;
    }

    function writeTheme(t) {
      try {
        localStorage.setItem(THEME_KEY, t);
      } catch (e) { /* ignore */ }
    }

    function applyTheme(theme) {
      if (!theme || !sequence.includes(theme)) theme = defaultTheme;
      document.documentElement.setAttribute("data-theme", theme);
      writeTheme(theme);
      // update any visible theme labels/buttons
      const btn = document.getElementById("themeCycleBtn");
      if (btn) btn.textContent = themeLabel(theme);
    }

    function nextTheme(current) {
      const i = sequence.indexOf(current);
      return sequence[(i + 1) % sequence.length];
    }

    function themeLabel(theme) {
      switch (theme) {
        case "belize-light": return "Belize Light";
        case "belize-dark": return "Belize Dark";
        case "signature": return "Signature";
        default: return "Theme";
      }
    }

    // Sidebar collapse functionality
    function readSidebarCollapsed() {
      try {
        const x = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        return x === "true";
      } catch (e) { /* ignore storage errors */ }
      return false;
    }

    function writeSidebarCollapsed(collapsed) {
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "true" : "false");
      } catch (e) { /* ignore */ }
    }

    function applySidebarCollapsed(collapsed) {
      const sidebar = document.querySelector(".app-sidebar");
      if (!sidebar) return;

      if (collapsed) {
        sidebar.classList.add("collapsed");
      } else {
        sidebar.classList.remove("collapsed");
      }
      writeSidebarCollapsed(collapsed);
    }

    function toggleSidebar() {
      const sidebar = document.querySelector(".app-sidebar");
      if (!sidebar) return;
      const isCollapsed = sidebar.classList.contains("collapsed");
      applySidebarCollapsed(!isCollapsed);
    }

    // Attach to the sidebar toggle button if present on page
    function attachSidebarToggle() {
      const btn = document.querySelector(".sidebar-toggle");
      if (!btn) return;
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        toggleSidebar();
      });
      // update button text based on state
      updateSidebarToggleButton();
    }

    function updateSidebarToggleButton() {
      const btn = document.querySelector(".sidebar-toggle");
      if (!btn) return;
      const isCollapsed = document.querySelector(".app-sidebar")?.classList.contains("collapsed");
      btn.textContent = isCollapsed ? "▶" : "◀";
      btn.title = isCollapsed ? "Expand sidebar" : "Collapse sidebar";
    }

    // Attach to the single-cycle button if present on page
    function attachCycleButton() {
      const btn = document.getElementById("themeCycleBtn");
      if (!btn) return;
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        const current = readTheme();
        const next = nextTheme(current);
        applyTheme(next);
      });
      // set initial text
      btn.textContent = themeLabel(readTheme());
    }

    // Small fetch helper for low-bandwidth tolerance
    async function fetchJsonLow(url, opts) {
      try {
        const res = await fetch(url, Object.assign({ cache: "no-store" }, (opts || {})));
        if (!res.ok) throw new Error("network");
        return await res.json();
      } catch (e) {
        // return null to calling code so it can fallback
        return null;
      }
    }

    // Expose a tiny API for pages
    window.__sapApp = window.__sapApp || {};
    window.__sapApp.applyTheme = applyTheme;
    window.__sapApp.readTheme = readTheme;
    window.__sapApp.fetchJsonLow = fetchJsonLow;
    window.__sapApp.toggleSidebar = toggleSidebar;
    window.__sapApp.applySidebarCollapsed = applySidebarCollapsed;

    // Init: apply persisted theme and attach, apply sidebar state
    document.addEventListener("DOMContentLoaded", () => {
      applyTheme(readTheme());
      attachCycleButton();
      // Apply sidebar state
      applySidebarCollapsed(readSidebarCollapsed());
      attachSidebarToggle();
    });

  })();

  