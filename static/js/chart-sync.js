/**
 * CHART SYNC - Real-time Chart Synchronization System (FIXED)
 * Synchronizes chart updates across all pages and maintains visual consistency
 */

(function() {
  'use strict';

  // ===== CHART REGISTRY =====
  const chartRegistry = {
    canvasCharts: new Map(),
    imageCharts: new Map()
  };

  // ===== CHART TRACKER =====
  const ChartSync = {
    // Register a Chart.js canvas
    registerCanvas: function(canvasId, chartInstance) {
      if (chartInstance && typeof chartInstance.update === 'function') {
        chartRegistry.canvasCharts.set(canvasId, chartInstance);
        console.log(`[SYNC] Registered canvas chart: ${canvasId}`);
        return true;
      }
      return false;
    },

    // Register an image-based chart
    registerImage: function(elementId, chartType) {
      const element = document.getElementById(elementId);
      if (element) {
        chartRegistry.imageCharts.set(elementId, {
          type: chartType,
          lastUpdate: null,
          url: null
        });
        console.log(`[SYNC] Registered image chart: ${elementId}`);
        return true;
      }
      console.warn(`[SYNC] Image chart element not found: ${elementId}`);
      return false;
    },

    // Update all Canvas Charts instances
    updateCanvasCharts: function() {
      let updateCount = 0;
      chartRegistry.canvasCharts.forEach((chart, canvasId) => {
        try {
          if (chart && typeof chart.update === 'function') {
            chart.update('none');
            updateCount++;
            console.log(`[SYNC] Updated canvas: ${canvasId}`);
          }
        } catch (e) {
          console.warn(`[SYNC] Error updating canvas ${canvasId}:`, e);
        }
      });
      console.log(`[SYNC] Updated ${updateCount} canvas charts`);
      return updateCount;
    },

    // Sync all charts on page
    syncAllCharts: function() {
      console.log('[SYNC] Syncing all charts...');
      const canvasCount = this.updateCanvasCharts();
      console.log(`[SYNC] Synced ${canvasCount} total charts`);
    },

    // Clear all charts
    clearAllCharts: function() {
      console.log('[SYNC] Clearing all charts...');

      chartRegistry.canvasCharts.forEach((chart, canvasId) => {
        try {
          if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
            console.log(`[SYNC] Destroyed canvas: ${canvasId}`);
          }
        } catch (e) {
          console.warn(`[SYNC] Error destroying chart ${canvasId}:`, e);
        }
      });

      chartRegistry.canvasCharts.clear();
      console.log('[SYNC] All charts cleared');
    },

    // Get registry state
    getState: function() {
      return {
        canvasCharts: chartRegistry.canvasCharts.size,
        imageCharts: chartRegistry.imageCharts.size,
        totalCharts: chartRegistry.canvasCharts.size + chartRegistry.imageCharts.size
      };
    }
  };

  // ===== INTEGRATION WITH VIZ MANAGER =====
  // Listen for VizManager events
  window.addEventListener('viz:data-generated', (e) => {
    console.log('[SYNC] Data generated event - syncing charts in 500ms');
    setTimeout(() => ChartSync.syncAllCharts(), 500);
  });

  window.addEventListener('viz:data-cleared', (e) => {
    console.log('[SYNC] Data cleared event - clearing charts');
    ChartSync.clearAllCharts();
  });

  window.addEventListener('viz:charts-refresh', (e) => {
    console.log('[SYNC] Chart refresh event');
    ChartSync.syncAllCharts();
  });

  // ===== PUBLIC API =====
  window.ChartSync = ChartSync;

  console.log('[SYNC] Chart Synchronization System loaded');
})();
