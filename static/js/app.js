/* app.js - global JS for theme cycle toggle + small helpers
   Cycle sequence: belize-light -> belize-dark -> signature -> belize-light -> ...
   Saves selection in localStorage to persist between page loads.
*/

(function () {
    "use strict";
  
    const THEME_KEY = "sap_theme_choice";
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
  
    // Init: apply persisted theme and attach
    document.addEventListener("DOMContentLoaded", () => {
      applyTheme(readTheme());
      attachCycleButton();
    });
  
  })();
  
  